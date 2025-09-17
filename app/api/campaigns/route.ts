import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  agent_id: z.string().uuid('Invalid agent ID'),
  contacts: z.array(z.object({
    name: z.string().min(1, 'Contact name is required'),
    phone: z.string().min(1, 'Contact phone is required'),
    email: z.string().email().optional().or(z.literal('')),
    company: z.string().optional(),
    notes: z.string().optional()
  })).min(1, 'At least one contact is required')
});

export async function GET(request: NextRequest) {
  try {
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

    // Get campaigns with related data
    const { data: campaigns, error: campaignsError } = await supabase
      .from('call_campaigns')
      .select(`
        *,
        agents:agent_id (
          name
        )
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    // Transform the data to include nested properties as flat properties
    const transformedCampaigns = campaigns?.map(campaign => ({
      ...campaign,
      agent_name: campaign.agents?.name
    })) || [];

    return NextResponse.json(transformedCampaigns);
  } catch (error) {
    console.error('Error in GET /api/campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, agent_id, contacts } = createCampaignSchema.parse(body);

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


    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('call_campaigns')
      .insert({
        name,
        agent_id,
        organization_id: profile.organization_id,
        status: 'pending',
        total_numbers: contacts.length,
        processed_numbers: 0,
        created_by: user.id,
        can_retry: true,
        retry_count: 0
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      console.error('Campaign data attempted:', {
        name,
        agent_id,
        organization_id: profile.organization_id,
        status: 'pending',
        total_numbers: contacts.length,
        processed_numbers: 0,
        created_by: user.id,
        can_retry: true,
        retry_count: 0
      });
      return NextResponse.json({ 
        error: 'Failed to create campaign', 
        details: campaignError.message || campaignError 
      }, { status: 500 });
    }

    // Create campaign contacts
    const campaignContacts = contacts.map(contact => ({
      campaign_id: campaign.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email || null,
      company: contact.company || null,
      notes: contact.notes || null,
      status: 'pending' as const
    }));

    // Use service client for campaign_contacts to bypass RLS since we've already verified org access
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { error: contactsError } = await serviceClient
      .from('campaign_contacts')
      .insert(campaignContacts);

    if (contactsError) {
      console.error('Error creating campaign contacts:', contactsError);
      console.error('Contact data attempted:', campaignContacts.slice(0, 2)); // Log first 2 contacts for debugging
      // Clean up the campaign if contacts failed  
      await serviceClient.from('call_campaigns').delete().eq('id', campaign.id);
      return NextResponse.json({ 
        error: 'Failed to create campaign contacts', 
        details: contactsError.message || contactsError 
      }, { status: 500 });
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/campaigns:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}