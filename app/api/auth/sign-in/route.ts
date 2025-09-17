import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = signInSchema.parse(body)
    
    const supabase = await createClient()
    
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 401 }
      )
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }
    
    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role, email')
      .eq('id', authData.user.id)
      .single()
    
    if (profileError || !profile) {
      // User exists in auth.users but no profile - redirect to setup
      return NextResponse.json(
        { 
          user: authData.user,
          needsSetup: true,
          message: 'Account setup required'
        },
        { status: 200 }
      )
    }
    
    if (!profile.organization_id) {
      // Profile exists but no organization - redirect to organization setup
      return NextResponse.json(
        {
          user: authData.user,
          profile,
          needsOrgSetup: true,
          message: 'Organization setup required'
        },
        { status: 200 }
      )
    }
    
    // Successful sign in with complete profile
    return NextResponse.json(
      {
        user: authData.user,
        profile,
        message: 'Sign in successful'
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Sign in error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}