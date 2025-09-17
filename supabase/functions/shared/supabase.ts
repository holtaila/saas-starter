import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

export function createSupabaseClientWithAuth(authHeader?: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  if (authHeader) {
    supabase.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: '',
    })
  }
  
  return supabase
}

// Helper to verify webhook signatures
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
  
  const signatureBytes = new Uint8Array(
    signature.split('').map((char) => char.charCodeAt(0))
  )
  
  const payloadBytes = new TextEncoder().encode(payload)
  
  return await crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes)
}

// Helper to verify Retell AI webhook signatures
export async function verifyRetellWebhookSignature(
  payload: string,
  signature: string,
  apiKey: string
): Promise<boolean> {
  try {
    // Retell uses HMAC-SHA256 with the API key as the secret
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(apiKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const payloadBytes = new TextEncoder().encode(payload)
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadBytes)
    
    // Convert signature to base64 string (Retell uses base64, not hex)
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    
    // Compare with provided signature directly
    return expectedSignature === signature
  } catch (error) {
    console.error('Error verifying Retell webhook signature:', error)
    return false
  }
}

// Helper to get user profile from auth token
export async function getCurrentUserProfile(supabase: any) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    throw new Error('Unauthorized')
  }
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  if (profileError || !profile) {
    throw new Error('Profile not found')
  }
  
  return { user, profile }
}

// Helper to respond with CORS headers
export function corsResponse(body: any, status = 200, headers: Record<string, string> = {}) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-signature',
    ...headers,
  }

  // Status 204 (No Content) should not have a body
  if (status === 204) {
    return new Response(null, {
      status,
      headers: corsHeaders,
    })
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

// Helper to handle OPTIONS requests
export function handleCors() {
  return corsResponse('', 204)
}