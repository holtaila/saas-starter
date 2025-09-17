import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  organizationName: z.string().min(1, 'Organization name is required').optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, organizationName } = signUpSchema.parse(body)
    
    const supabase = await createClient()
    
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          organization_name: organizationName || `${email}'s Organization`
        }
      }
    })
    
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 400 }
      )
    }
    
    // Check if email confirmation is required
    if (!authData.session) {
      return NextResponse.json(
        {
          user: authData.user,
          message: 'Registration successful. Please check your email to confirm your account.',
          requiresConfirmation: true
        },
        { status: 200 }
      )
    }
    
    // If user is immediately signed in, return success
    return NextResponse.json(
      {
        user: authData.user,
        session: authData.session,
        message: 'Registration successful',
        needsSetup: true // User will need to complete profile setup
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Sign up error:', error)
    
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