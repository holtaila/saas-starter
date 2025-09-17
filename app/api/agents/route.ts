import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell/client';

// GET /api/agents - List all agents for the user's organization
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get agents from Supabase database
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    return NextResponse.json(agents || []);
  } catch (error) {
    console.error('Error in GET /api/agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const retell = createRetellClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      type,
      voice_id, 
      llm_id, 
      webhook_url,
      is_inbound_enabled,
      inbound_greeting,
      inbound_prompt_template
    } = body;

    // Validate required fields
    if (!name || !voice_id || !llm_id || !type) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, type, voice_id, llm_id' 
      }, { status: 400 });
    }

    // Create agent in Retell first
    const retellAgent = await retell.agent.create({
      agent_name: name,
      voice_id,
      response_engine: {
        type: 'retell-llm',
        llm_id,
      },
      webhook_url: webhook_url || process.env.NEXT_PUBLIC_RETELL_AGENT_WEBHOOK_URL,
      language: 'en-US',
      enable_backchannel: true,
    });

    // Save agent to our database
    const { data: savedAgent, error: saveError } = await supabase
      .from('agents')
      .insert({
        id: retellAgent.agent_id,
        organization_id: profile.organization_id,
        name,
        description: description || null,
        type: type || 'custom',
        voice_id,
        retell_agent_id: retellAgent.agent_id,
        status: 'active',
        // Inbound call configuration
        is_inbound_enabled: is_inbound_enabled || false,
        inbound_greeting: inbound_greeting || null,
        inbound_prompt_template: inbound_prompt_template || null,
        // Voice configuration
        voice_config: {
          voice_id,
          llm_id,
          webhook_url: webhook_url || null,
        },
        // Set timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving agent to database:', saveError);
      // Try to clean up the Retell agent if database save failed
      try {
        await retell.agent.delete(retellAgent.agent_id);
      } catch (cleanupError) {
        console.error('Error cleaning up Retell agent:', cleanupError);
      }
      return NextResponse.json({ error: 'Failed to save agent' }, { status: 500 });
    }

    return NextResponse.json({ 
      agent: savedAgent,
      retell_agent: retellAgent 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in POST /api/agents:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}