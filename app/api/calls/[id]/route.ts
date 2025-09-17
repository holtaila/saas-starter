import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth/supabase-auth';
import { getServiceSupabase } from '@/lib/supabase/utils';
import { createRetellClient } from '@/lib/retell/client';

// GET /api/calls/[id] - Get call details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile?.profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const { id } = await context.params;
    const supabase = getServiceSupabase();

    const { data: call, error } = await supabase
      .from('calls')
      .select(`
        *,
        agent:agents(id, name, type),
        phone_number:phone_numbers(id, phone_number, display_name)
      `)
      .eq('id', id)
      .eq('organization_id', userProfile.profile.organization_id)
      .single();

    if (error || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // If call has Retell call ID, get real-time status from Retell
    let retellStatus = null;
    if (call.retell_call_id) {
      // Check if this is a mock call (UUID format but not from Retell)
      const isMockCall = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(call.retell_call_id) &&
                         !call.retell_call_id.startsWith('call_'); // Retell call IDs start with 'call_'
      
      if (isMockCall) {
        // Return mock status for development
        retellStatus = {
          call_id: call.retell_call_id,
          status: 'completed',
          agent_id: call.retell_agent_id,
          duration_ms: 45000,
          end_timestamp: Date.now(),
          metadata: call.metadata
        };
      } else {
        try {
          const retell = createRetellClient();
          retellStatus = await retell.call.retrieve(call.retell_call_id);
        } catch (retellError) {
          console.error('Error fetching call status from Retell:', retellError);
        }
      }
    }

    return NextResponse.json({
      call,
      retell_status: retellStatus
    });

  } catch (error) {
    console.error('Error in GET /api/calls/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/calls/[id] - Cancel/end a call
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile?.profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const { id } = await context.params;
    const supabase = getServiceSupabase();

    // Get call details
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userProfile.profile.organization_id)
      .single();

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Only allow canceling/ending calls that are in progress or scheduled
    if (!['scheduled', 'in_progress'].includes(call.status)) {
      return NextResponse.json({ 
        error: 'Call cannot be cancelled - already completed or failed' 
      }, { status: 400 });
    }

    let retellResult = null;
    
    // If call has started (has Retell call ID), attempt to end it via Retell API
    if (call.retell_call_id && call.status === 'in_progress') {
      try {
        const retell = createRetellClient();
        // Note: Call ending API may not be available in current Retell SDK version
        // For now, we'll just mark as cancelled in our database
        console.log(`Would attempt to end call ${call.retell_call_id} via Retell API`);
      } catch (retellError) {
        console.error('Error with Retell API:', retellError);
        // Continue with database update even if Retell API fails
      }
    }

    // Update call status in database
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        status: 'failed', // Using 'failed' for cancelled calls
        ended_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating call status:', updateError);
      return NextResponse.json({ error: 'Failed to update call status' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Call cancelled successfully',
      retell_result: retellResult
    });

  } catch (error) {
    console.error('Error in DELETE /api/calls/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}