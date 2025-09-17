import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateBatchCallSchema = z.object({
  batch_name: z.string().min(1).optional(),
  status: z.enum(['scheduled', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  scheduled_timestamp: z.string().datetime().optional(),
  reserved_concurrency: z.number().int().min(1).max(10).optional(),
  total_task_count: z.number().int().min(0).optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get batch call with related data
    const { data: batchCall, error: batchCallError } = await supabase
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
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (batchCallError || !batchCall) {
      return NextResponse.json({ error: 'Batch call not found' }, { status: 404 });
    }

    // Transform the data
    const transformedBatchCall = {
      ...batchCall,
      campaign_name: batchCall.call_campaigns?.name,
      agent_name: batchCall.agents?.name,
      phone_number: batchCall.phone_numbers?.phone_number
    };

    return NextResponse.json(transformedBatchCall);
  } catch (error) {
    console.error('Error in GET /api/batch-calls/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updateData = updateBatchCallSchema.parse(body);

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

    // Update batch call
    const { data: batchCall, error: batchCallError } = await supabase
      .from('batch_calls')
      .update({
        ...updateData,
        scheduled_timestamp: updateData.scheduled_timestamp ? 
          new Date(updateData.scheduled_timestamp).toISOString() : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single();

    if (batchCallError || !batchCall) {
      return NextResponse.json({ error: 'Batch call not found or update failed' }, { status: 404 });
    }

    return NextResponse.json(batchCall);
  } catch (error) {
    console.error('Error in PATCH /api/batch-calls/[id]:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Delete batch call
    const { error: batchCallError } = await supabase
      .from('batch_calls')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id);

    if (batchCallError) {
      console.error('Error deleting batch call:', batchCallError);
      return NextResponse.json({ error: 'Failed to delete batch call' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Batch call deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/batch-calls/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}