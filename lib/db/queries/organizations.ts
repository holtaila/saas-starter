import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/auth/supabase-auth'
import type { Database } from '@/lib/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

/**
 * Get current user's organization
 */
export async function getCurrentOrganization(): Promise<Organization | null> {
  const supabase = await createClient()
  
  // Get organization via RLS - user can only see their own org
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - user has no organization
      return null
    }
    throw new Error(`Failed to get organization: ${error.message}`)
  }
  
  return data
}

/**
 * Update current user's organization (admin only)
 */
export async function updateCurrentOrganization(
  updates: OrganizationUpdate
): Promise<Organization> {
  const supabase = await createClient()
  
  // RLS will ensure user can only update their own organization
  // and the is_org_admin() function will check admin role
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update organization: ${error.message}`)
  }
  
  return data
}

/**
 * Get organization usage statistics
 */
export async function getOrganizationUsage(): Promise<{
  organization: Organization
  totalCallsToday: number
  totalCallsThisMonth: number
  minutesUsedThisMonth: number
}> {
  const supabase = await createClient()
  
  // Get organization
  const organization = await getCurrentOrganization()
  if (!organization) {
    throw new Error('No organization found')
  }
  
  // Get today's calls count using RPC function
  const { data: todayCount, error: todayError } = await supabase
    .rpc('get_calls_count_today')
  
  if (todayError) {
    console.warn('Failed to get today calls count:', todayError)
  }
  
  // Get this month's calls and minutes
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const { count: monthlyCallsCount, error: monthlyError } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .gte('created_at', startOfMonth.toISOString())
  
  if (monthlyError) {
    console.warn('Failed to get monthly calls count:', monthlyError)
  }
  
  // Calculate minutes used from completed calls this month
  const { data: monthlyMinutes, error: minutesError } = await supabase
    .from('calls')
    .select('duration_seconds')
    .gte('created_at', startOfMonth.toISOString())
    .eq('status', 'completed')
    .not('duration_seconds', 'is', null)
  
  const totalMinutes = monthlyMinutes?.reduce(
    (sum, call) => sum + (call.duration_seconds || 0) / 60,
    0
  ) || 0
  
  return {
    organization,
    totalCallsToday: todayCount || 0,
    totalCallsThisMonth: monthlyCallsCount || 0,
    minutesUsedThisMonth: Math.round(totalMinutes * 100) / 100 // Round to 2 decimals
  }
}

/**
 * Update organization usage (service role operation)
 */
export async function updateOrganizationUsage(
  organizationId: string,
  minutesUsed: number
): Promise<void> {
  const supabase = createServiceClient() // Bypass RLS for system operations
  
  const { error } = await supabase
    .from('organizations')
    .update({
      usage_minutes_total: minutesUsed,
      usage_minutes_mtd: minutesUsed,
      usage_last_reset_at: new Date().toISOString()
    })
    .eq('id', organizationId)
  
  if (error) {
    throw new Error(`Failed to update organization usage: ${error.message}`)
  }
}

/**
 * Get all organizations (platform admin only)
 */
export async function getAllOrganizations(): Promise<Organization[]> {
  const supabase = createServiceClient() // Bypass RLS for admin operations
  
  // Note: This should be protected by platform admin check in the calling function
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to get all organizations: ${error.message}`)
  }
  
  return data
}