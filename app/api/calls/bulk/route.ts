import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth/supabase-auth';
import { getServiceSupabase } from '@/lib/supabase/utils';
import { createRetellClient } from '@/lib/retell/client';
import { CSVParser } from '@/lib/csv-parser';
import { RetellVariableExtractor } from '@/lib/retell-variable-extractor';
import { z } from 'zod';

const bulkCallSchema = z.object({
  campaign_id: z.string().min(1, 'Campaign ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  phone_number_id: z.string().min(1, 'Phone number ID is required'),
  csv_content: z.string().min(1, 'CSV content is required'),
  batch_name: z.string().min(1, 'Batch name is required'),
  concurrent_calls: z.number().min(1).max(19).default(1),
  scheduled_timestamp: z.string().optional(),
});

interface RetellBatchCallTask {
  phone_number: string;
  variables: Record<string, string>;
}

// POST /api/calls/bulk - Create batch calls from CSV data
export async function POST(request: NextRequest) {
  try {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile?.profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = bulkCallSchema.parse(body);

    const supabase = getServiceSupabase();
    const retell = createRetellClient();

    // 1. Parse and validate CSV content
    console.log('Parsing CSV content...');
    const parseResult = CSVParser.parseCSV(validatedData.csv_content);
    
    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json({
        error: 'CSV parsing failed',
        details: parseResult.errors
      }, { status: 400 });
    }

    const validContacts = parseResult.data;
    console.log(`Successfully parsed ${validContacts.length} valid contacts`);

    // 2. Verify agent belongs to organization and get details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', validatedData.agent_id)
      .eq('organization_id', userProfile.profile.organization_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found or not accessible' }, { status: 404 });
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent is not properly configured with Retell AI' }, { status: 400 });
    }

    // 3. Verify phone number belongs to organization
    const { data: phoneAssignment, error: phoneError } = await supabase
      .from('organization_phone_assignments')
      .select(`
        *,
        phone_number:phone_numbers(*)
      `)
      .eq('phone_number_id', validatedData.phone_number_id)
      .eq('organization_id', userProfile.profile.organization_id)
      .single();

    if (phoneError || !phoneAssignment) {
      return NextResponse.json({ error: 'Phone number not found or not assigned' }, { status: 404 });
    }

    // 4. Verify campaign exists and belongs to organization
    const { data: campaign, error: campaignError } = await supabase
      .from('call_campaigns')
      .select('*')
      .eq('id', validatedData.campaign_id)
      .eq('organization_id', userProfile.profile.organization_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found or not accessible' }, { status: 404 });
    }

    // 5. Extract variables for Retell AI
    const { variables, sampleContact } = RetellVariableExtractor.extractVariablesFromContacts(
      validContacts,
      agent.retell_agent_id,
      userProfile.profile.organization_id
    );

    console.log(`Extracted ${variables.length} variables for Retell AI`);

    // 6. Create Retell batch call tasks
    const batchTasks: RetellBatchCallTask[] = validContacts.map(contact => ({
      phone_number: contact.phone_number,
      variables: RetellVariableExtractor.createRetellVariables(
        contact,
        agent.retell_agent_id,
        userProfile.profile.organization_id
      )
    }));

    // 7. Calculate concurrency for Retell API
    // Retell uses reserved_concurrency where N slots are reserved for "other calls"
    // So if user wants 1 concurrent batch call, we send reserved_concurrency=19
    // If user wants 19 concurrent batch calls, we send reserved_concurrency=1
    const reservedConcurrency = Math.max(1, 20 - validatedData.concurrent_calls);

    // 8. Create batch call with Retell AI (with timeout protection)
    console.log('Creating batch call with Retell AI...');
    const retellTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Retell API timeout after 25 seconds')), 25000);
    });

    let retellBatchCall;
    try {
      const retellPromise = retell.batchCall.create({
        agent_id: agent.retell_agent_id,
        batch_name: validatedData.batch_name,
        from_number: phoneAssignment.phone_number.phone_number,
        tasks: batchTasks,
        reserved_concurrency: reservedConcurrency,
        scheduled_timestamp: validatedData.scheduled_timestamp 
          ? new Date(validatedData.scheduled_timestamp).getTime() / 1000 
          : undefined,
      });

      retellBatchCall = await Promise.race([retellPromise, retellTimeout]);
    } catch (retellError: any) {
      console.error('Error creating batch call with Retell:', retellError);
      
      // Update campaign status to failed
      await supabase
        .from('call_campaigns')
        .update({ 
          status: 'failed',
          csv_validation_errors: [retellError.message || 'Retell API error'],
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedData.campaign_id);

      return NextResponse.json({
        error: 'Failed to create batch call with Retell AI',
        details: retellError.message || 'Unknown Retell API error'
      }, { status: 500 });
    }

    // 9. Create batch_calls record
    const batchCallData = {
      organization_id: userProfile.profile.organization_id,
      campaign_id: validatedData.campaign_id,
      agent_id: validatedData.agent_id,
      phone_number_id: validatedData.phone_number_id,
      retell_batch_call_id: retellBatchCall.batch_call_id,
      batch_name: validatedData.batch_name,
      from_number: phoneAssignment.phone_number.phone_number,
      total_task_count: batchTasks.length,
      status: 'scheduled' as const,
      reserved_concurrency: reservedConcurrency,
      scheduled_timestamp: validatedData.scheduled_timestamp || null,
      created_at: new Date().toISOString(),
    };

    const { data: savedBatchCall, error: batchCallError } = await supabase
      .from('batch_calls')
      .insert(batchCallData)
      .select()
      .single();

    if (batchCallError) {
      console.error('Error saving batch call record:', batchCallError);
      return NextResponse.json({ error: 'Failed to create batch call record' }, { status: 500 });
    }

    // 10. Create individual call records for tracking
    const callRecords = batchTasks.map((task, index) => {
      const contact = validContacts[index];
      return {
        organization_id: userProfile.profile.organization_id,
        agent_id: validatedData.agent_id,
        campaign_id: validatedData.campaign_id,
        batch_call_id: savedBatchCall.id,
        phone_number_id: validatedData.phone_number_id,
        retell_batch_call_id: retellBatchCall.batch_call_id,
        phone_number: task.phone_number,
        from_phone: phoneAssignment.phone_number.phone_number,
        to_phone: task.phone_number,
        crm_id: contact.crm_id,
        status: 'scheduled' as const,
        direction: 'outbound' as const,
        call_type: 'phone_call' as const,
        metadata: {
          batch_call_id: retellBatchCall.batch_call_id,
          variables: task.variables,
          campaign_id: validatedData.campaign_id,
        },
        created_at: new Date().toISOString(),
      };
    });

    const { error: callsError } = await supabase
      .from('calls')
      .insert(callRecords);

    if (callsError) {
      console.error('Error creating call records:', callsError);
      // Don't fail the entire request if individual call records fail
      // The batch call is already created in Retell
    }

    // 11. Update campaign status and statistics
    const { error: campaignUpdateError } = await supabase
      .from('call_campaigns')
      .update({
        status: 'processing',
        total_numbers: batchTasks.length,
        processed_numbers: 0,
        trigger_job_id: retellBatchCall.batch_call_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedData.campaign_id);

    if (campaignUpdateError) {
      console.error('Error updating campaign:', campaignUpdateError);
    }

    console.log(`Successfully created batch call with ${batchTasks.length} tasks`);

    return NextResponse.json({
      success: true,
      batch_call: savedBatchCall,
      retell_batch_call: retellBatchCall,
      task_count: batchTasks.length,
      variables: variables,
      sample_contact: sampleContact,
      message: `Batch call created successfully with ${batchTasks.length} tasks`
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }

    console.error('Error in POST /api/calls/bulk:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}