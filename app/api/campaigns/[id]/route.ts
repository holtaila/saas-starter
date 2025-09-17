import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'paused']).optional(),
  total_numbers: z.number().int().min(0).optional(),
  processed_numbers: z.number().int().min(0).optional()
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

    // Get campaign with related data (simplified to match working list route)
    const { data: campaign, error: campaignError } = await supabase
      .from('call_campaigns')
      .select(`
        *,
        agents:agent_id (
          name
        )
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign query error:', campaignError);
      console.log('Queried campaign ID:', id, 'Organization ID:', profile.organization_id);
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Transform the data
    const transformedCampaign = {
      ...campaign,
      agent_name: campaign.agents?.name
    };

    return NextResponse.json(transformedCampaign);
  } catch (error) {
    console.error('Error in GET /api/campaigns/[id]:', error);
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
    const updateData = updateCampaignSchema.parse(body);

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

    // Update campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('call_campaigns')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found or update failed' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error in PATCH /api/campaigns/[id]:', error);
    
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

    // Delete campaign contacts first (foreign key constraint)
    const { error: contactsError } = await supabase
      .from('campaign_contacts')
      .delete()
      .eq('campaign_id', id);

    if (contactsError) {
      console.error('Error deleting campaign contacts:', contactsError);
      return NextResponse.json({ error: 'Failed to delete campaign contacts' }, { status: 500 });
    }

    // Delete campaign
    const { error: campaignError } = await supabase
      .from('call_campaigns')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id);

    if (campaignError) {
      console.error('Error deleting campaign:', campaignError);
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/campaigns/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}