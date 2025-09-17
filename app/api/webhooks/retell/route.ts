import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';
import { getServiceSupabase } from '@/lib/supabase/utils';

interface RetellWebhookPayload {
  event: 'call_started' | 'call_ended' | 'call_analyzed';
  call: {
    call_type: 'phone_call';
    from_number: string;
    to_number: string;
    direction: 'inbound' | 'outbound';
    call_id: string; // Retell's call ID
    agent_id: string;
    call_status: string;
    metadata?: Record<string, any>;
    retell_llm_dynamic_variables?: Record<string, any>;
    start_timestamp: number; // Unix timestamp in milliseconds
    end_timestamp?: number; // Only present in call_ended
    disconnection_reason?: string; // e.g., "user_hangup", "call_transferred", "error"
    transcript?: string;
    transcript_object?: Array<any>;
    transcript_with_tool_calls?: Array<any>;
    opt_out_sensitive_data_storage: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-retell-signature');

    if (!signature) {
      console.error('No signature provided in webhook');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    if (!process.env.RETELL_API_KEY) {
      console.error('RETELL_API_KEY not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify webhook signature
    try {
      const isValidSignature = Retell.verify(
        JSON.stringify(body),
        process.env.RETELL_API_KEY,
        signature,
      );

      if (!isValidSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch (verificationError) {
      console.error('Signature verification failed:', verificationError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, call }: RetellWebhookPayload = body;
    const supabase = getServiceSupabase();

    console.log(`Processing Retell webhook: ${event} for call ${call.call_id}`);

    switch (event) {
      case 'call_started':
        // Update call status to 'in_progress'
        const { error: startError } = await supabase
          .from('calls')
          .update({
            status: 'in_progress',
            started_at: new Date(call.start_timestamp).toISOString(),
            metadata: {
              ...((await supabase.from('calls').select('metadata').eq('retell_call_id', call.call_id).single()).data?.metadata || {}),
              retell_metadata: call.metadata,
              retell_llm_variables: call.retell_llm_dynamic_variables,
            }
          })
          .eq('retell_call_id', call.call_id);

        if (startError) {
          console.error('Error updating call on start:', startError);
        } else {
          console.log(`Call ${call.call_id} marked as in_progress`);
        }
        break;

      case 'call_ended':
        // Calculate duration in seconds
        const durationSeconds = call.end_timestamp 
          ? Math.round((call.end_timestamp - call.start_timestamp) / 1000)
          : null;

        // Determine final status based on disconnection reason
        let finalStatus = 'completed';
        if (call.disconnection_reason === 'error' || call.call_status === 'error') {
          finalStatus = 'failed';
        }

        const { error: endError } = await supabase
          .from('calls')
          .update({
            status: finalStatus,
            ended_at: call.end_timestamp ? new Date(call.end_timestamp).toISOString() : new Date().toISOString(),
            duration_seconds: durationSeconds,
            transcript: call.transcript || null,
            disconnection_reason: call.disconnection_reason || null,
            metadata: {
              ...((await supabase.from('calls').select('metadata').eq('retell_call_id', call.call_id).single()).data?.metadata || {}),
              retell_metadata: call.metadata,
              retell_llm_variables: call.retell_llm_dynamic_variables,
              transcript_object: call.transcript_object,
              transcript_with_tool_calls: call.transcript_with_tool_calls,
            }
          })
          .eq('retell_call_id', call.call_id);

        if (endError) {
          console.error('Error updating call on end:', endError);
        } else {
          console.log(`Call ${call.call_id} ended with status: ${finalStatus}, duration: ${durationSeconds}s`);
        }
        break;

      case 'call_analyzed':
        // Update call with analysis completion flag
        const { error: analysisError } = await supabase
          .from('calls')
          .update({
            metadata: {
              ...((await supabase.from('calls').select('metadata').eq('retell_call_id', call.call_id).single()).data?.metadata || {}),
              analysis_completed: true,
              analyzed_at: new Date().toISOString(),
            }
          })
          .eq('retell_call_id', call.call_id);

        if (analysisError) {
          console.error('Error updating call analysis:', analysisError);
        } else {
          console.log(`Call ${call.call_id} analysis completed`);
        }
        break;

      default:
        console.warn(`Unknown webhook event: ${event}`);
        break;
    }

    // Respond with 204 No Content as recommended by Retell
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Error processing Retell webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}