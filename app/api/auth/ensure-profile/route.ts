import { createClient } from '@/lib/supabase/server'
import { createUserProfile } from '@/lib/auth/supabase-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const setupProfileSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  planTier: z.enum(['starter', 'professional', 'enterprise']).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationName, planTier } = setupProfileSchema.parse(body)
    
    const supabase = await createClient()
    
    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', user.id)
      .single()
    
    if (existingProfile?.organization_id) {
      return NextResponse.json(
        { 
          message: 'Profile already exists',
          profile: existingProfile
        },
        { status: 200 }
      )
    }
    
    // Create organization and profile
    const { organization, profile } = await createUserProfile(
      user.id,
      user.email!,
      {
        name: organizationName,
        plan_tier: planTier
      }
    )
    
    return NextResponse.json(
      {
        message: 'Profile created successfully',
        organization,
        profile,
        user
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Ensure profile error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Profile creation failed' },
      { status: 500 }
    )
  }
}

// GET route to check profile status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user profile with organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('id', user.id)
      .single()
    
    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected if profile doesn't exist
      throw new Error(`Profile lookup failed: ${profileError.message}`)
    }
    
    return NextResponse.json(
      {
        user,
        profile,
        needsSetup: !profile,
        needsOrgSetup: profile && !profile.organization_id
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Profile status check error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Profile status check failed' },
      { status: 500 }
    )
  }
}