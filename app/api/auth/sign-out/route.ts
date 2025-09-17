import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'Sign out successful' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Sign out error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}