import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        id,
        organization_id,
        role,
        full_name,
        avatar_url,
        organizations (
          id,
          name,
          description
        )
      `)
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: profile?.full_name || user.user_metadata?.name || user.user_metadata?.full_name,
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
      profile: profile ? {
        organization_id: profile.organization_id,
        role: profile.role,
        organization: profile.organizations
      } : null
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}