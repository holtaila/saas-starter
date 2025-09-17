import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createBatchCallSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign ID'),
  agent_id: z.string().uuid('Invalid agent ID'),
  phone_number_id: z.string().uuid('Invalid phone number ID'),
  retell_batch_call_id: z.string().min(1, 'Retell batch call ID is required'),
  batch_name: z.string().min(1, 'Batch name is required'),
  from_number: z.string().min(1, 'From number is required'),
  total_task_count: z.number().int().min(1, 'Total task count must be at least 1'),
  scheduled_timestamp: z.string().datetime().optional(),
  reserved_concurrency: z.number().int().min(1).max(10).optional()
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to get organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('batch_calls')
      .select(`
        *,
        call_campaigns:campaign_id (
          name
        ),
        agents:agent_id (
          name
        ),
        phone_numbers:phone_number_id (
          phone_number
        )
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    // Filter by campaign if specified
    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data: batchCalls, error: batchCallsError } = await query;

    if (batchCallsError) {
      console.error('Error fetching batch calls:', batchCallsError);
      return NextResponse.json({ error: 'Failed to fetch batch calls' }, { status: 500 });
    }

    // Transform the data to include nested properties as flat properties
    const transformedBatchCalls = batchCalls?.map(batchCall => ({
      ...batchCall,
      campaign_name: batchCall.call_campaigns?.name,
      agent_name: batchCall.agents?.name,
      phone_number: batchCall.phone_numbers?.phone_number
    })) || [];

    return NextResponse.json(transformedBatchCalls);
  } catch (error) {
    console.error('Error in GET /api/batch-calls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      campaign_id, 
      agent_id, 
      phone_number_id, 
      retell_batch_call_id, 
      batch_name, 
      from_number, 
      total_task_count, 
      scheduled_timestamp, 
      reserved_concurrency 
    } = createBatchCallSchema.parse(body);

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to get organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Verify campaign belongs to organization
    const { data: campaign, error: campaignError } = await supabase
      .from('call_campaigns')
      .select('id')
      .eq('id', campaign_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found or not accessible' }, { status: 404 });
    }

    // Verify agent belongs to organization
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agent_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found or not accessible' }, { status: 404 });
    }

    // Verify phone number is assigned to organization
    const { data: phoneNumber, error: phoneError } = await supabase
      .from('organization_phone_assignments')
      .select('phone_number_id')
      .eq('phone_number_id', phone_number_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (phoneError || !phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found or not assigned to organization' }, { status: 404 });
    }

    // Create batch call
    const { data: batchCall, error: batchCallError } = await supabase
      .from('batch_calls')
      .insert({
        organization_id: profile.organization_id,
        campaign_id,
        agent_id,
        phone_number_id,
        retell_batch_call_id,
        batch_name,
        from_number,
        total_task_count,
        status: scheduled_timestamp ? 'scheduled' : 'processing',
        scheduled_timestamp: scheduled_timestamp ? new Date(scheduled_timestamp).toISOString() : null,
        reserved_concurrency,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (batchCallError) {
      console.error('Error creating batch call:', batchCallError);
      return NextResponse.json({ error: 'Failed to create batch call' }, { status: 500 });
    }

    return NextResponse.json(batchCall, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/batch-calls:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}