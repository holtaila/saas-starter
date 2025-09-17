import { createClient as createBrowserClient } from './client'
import { createClient as createServerClient, createServiceClient } from './server'

// Browser client - RLS enabled for user operations
export function getBrowserSupabase() {
  return createBrowserClient()
}

// Server client - RLS enabled for user operations  
export async function getServerSupabase() {
  return await createServerClient()
}

// Service role client - bypasses RLS for admin operations
export function getServiceSupabase() {
  return createServiceClient()
}