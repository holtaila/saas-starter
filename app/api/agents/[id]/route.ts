import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell/client';

// GET /api/agents/[id] - Get a specific agent
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: agentId } = await context.params;

    // Get agent with organization check
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        *,
        organizations!inner(id, name)
      `)
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if user belongs to the same organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.organization_id !== agent.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error in GET /api/agents/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/agents/[id] - Update an agent
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const retell = createRetellClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: agentId } = await context.params;
    const body = await request.json();
    const { name, description, voice_id, webhook_url } = body;

    // Get agent with organization check
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*, organizations!inner(id)')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if user belongs to the same organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.organization_id !== agent.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update agent in Retell if voice or webhook changed
    if (voice_id || webhook_url) {
      const updateParams: any = {};
      if (voice_id) updateParams.voice_id = voice_id;
      if (webhook_url) updateParams.webhook_url = webhook_url;

      await retell.agent.update(agent.retell_agent_id, updateParams);
    }

    // Update agent in database
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (voice_id) updateData.voice_id = voice_id;
    if (webhook_url !== undefined) updateData.webhook_url = webhook_url;

    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', agentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating agent:', updateError);
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }

    return NextResponse.json({ agent: updatedAgent });

  } catch (error: any) {
    console.error('Error in PATCH /api/agents/[id]:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE /api/agents/[id] - Delete an agent
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const retell = createRetellClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: agentId } = await context.params;

    // Get agent with organization check
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*, organizations!inner(id)')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if user belongs to the same organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.organization_id !== agent.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete from Retell first
    try {
      await retell.agent.delete(agent.retell_agent_id);
    } catch (retellError) {
      console.warn('Error deleting agent from Retell:', retellError);
      // Continue with database deletion even if Retell deletion fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId);

    if (deleteError) {
      console.error('Error deleting agent from database:', deleteError);
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in DELETE /api/agents/[id]:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}