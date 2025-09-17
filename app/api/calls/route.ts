import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth/supabase-auth';
import { getServiceSupabase } from '@/lib/supabase/utils';
import { createRetellClient } from '@/lib/retell/client';
import { z } from 'zod';

const createCallSchema = z.object({
  agent_id: z.string().min(1, 'Agent ID is required'),
  phone_number_id: z.string().min(1, 'Phone number ID is required'),
  to_phone_number: z.string().min(10, 'Valid phone number is required'),
  metadata: z.object({
    purpose: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});

// GET /api/calls - List calls for organization
export async function GET(request: NextRequest) {
  try {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile?.profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const agent_id = searchParams.get('agent_id');
    const campaign_id = searchParams.get('campaign_id');
    const direction = searchParams.get('direction');
    
    const supabase = getServiceSupabase();
    
    let query = supabase
      .from('calls')
      .select(`
        *,
        agent:agents(id, name, type),
        phone_number:phone_numbers(id, phone_number, display_name)
      `)
      .eq('organization_id', userProfile.profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (agent_id) {
      query = query.eq('agent_id', agent_id);
    }
    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id);
    }
    if (direction && (direction === 'inbound' || direction === 'outbound')) {
      query = query.eq('direction', direction);
    }

    const { data: calls, error } = await query;

    if (error) {
      console.error('Error fetching calls:', error);
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    }

    return NextResponse.json({ calls: calls || [] });
  } catch (error) {
    console.error('Error in GET /api/calls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/calls - Create and initiate an outbound call
export async function POST(request: NextRequest) {
  try {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile?.profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = createCallSchema.parse(body);

    const supabase = getServiceSupabase();
    const retell = createRetellClient();

    // Verify agent belongs to organization and get details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', validatedData.agent_id)
      .eq('organization_id', userProfile.profile.organization_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify phone number belongs to organization
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

    // Create call record first
    const callData = {
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organization_id: userProfile.profile.organization_id,
      agent_id: validatedData.agent_id,
      phone_number_id: validatedData.phone_number_id,
      phone_number: validatedData.to_phone_number,
      status: 'scheduled' as const,
      direction: 'outbound' as const,
      metadata: validatedData.metadata || null,
      created_at: new Date().toISOString(),
    };

    const { data: savedCall, error: callError } = await supabase
      .from('calls')
      .insert(callData)
      .select(`
        *,
        agent:agents(id, name, type),
        phone_number:phone_numbers(id, phone_number, display_name)
      `)
      .single();

    if (callError) {
      console.error('Error saving call:', callError);
      return NextResponse.json({ error: 'Failed to create call record' }, { status: 500 });
    }

    // Initiate call via Retell API
    try {
      const retellCall = await retell.call.createPhoneCall({
        from_number: phoneAssignment.phone_number.phone_number,
        to_number: validatedData.to_phone_number,
        override_agent_id: agent.retell_agent_id,
        metadata: {
          call_id: callData.id,
          organization_id: userProfile.profile.organization_id,
          purpose: validatedData.metadata?.purpose || 'outbound_call',
        },
      });

      // Update call record with Retell call ID
      const { error: updateError } = await supabase
        .from('calls')
        .update({
          retell_call_id: retellCall.call_id,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', callData.id);

      if (updateError) {
        console.error('Error updating call with Retell ID:', updateError);
      }

      return NextResponse.json({
        call: savedCall,
        retell_call: retellCall,
        message: 'Call initiated successfully'
      }, { status: 201 });

    } catch (retellError: any) {
      console.error('Error initiating call with Retell:', retellError);
      
      // Update call status to failed
      await supabase
        .from('calls')
        .update({ 
          status: 'failed',
          ended_at: new Date().toISOString()
        })
        .eq('id', callData.id);

      return NextResponse.json({
        error: 'Failed to initiate call',
        details: retellError.message || 'Unknown Retell API error'
      }, { status: 500 });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }

    console.error('Error in POST /api/calls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}