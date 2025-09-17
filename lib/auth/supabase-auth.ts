import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']

/**
 * Get the current user from Supabase Auth
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw new Error(`Auth error: ${error.message}`)
  }
  
  return user
}

/**
 * Get the current user's profile with organization
 */
export async function getCurrentUserProfile() {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }
  
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('id', user.id)
    .single()
  
  if (error) {
    throw new Error(`Profile error: ${error.message}`)
  }
  
  return {
    user,
    profile
  }
}

/**
 * Validate if user has required role
 */
export async function validateUserRole(requiredRole?: 'admin' | 'manager' | 'viewer') {
  const result = await getCurrentUserProfile()
  
  if (!result) {
    throw new Error('User not authenticated')
  }
  
  const { user, profile } = result
  
  if (!profile.organization_id) {
    throw new Error('User has no organization')
  }
  
  if (requiredRole) {
    const roleHierarchy: Record<string, number> = { 'viewer': 0, 'manager': 1, 'admin': 2 }
    const userRoleLevel = roleHierarchy[profile.role]
    const requiredRoleLevel = roleHierarchy[requiredRole]
    
    if (userRoleLevel < requiredRoleLevel) {
      throw new Error(`Insufficient permissions. Required: ${requiredRole}, User has: ${profile.role}`)
    }
  }
  
  return { user, profile }
}

/**
 * Check if user is platform admin
 */
export async function validatePlatformAdmin() {
  const result = await getCurrentUserProfile()
  
  if (!result) {
    throw new Error('User not authenticated')
  }
  
  const { profile } = result
  
  if (profile.platform_role !== 'platform_admin') {
    throw new Error('Platform admin access required')
  }
  
  return result
}

/**
 * Create organization and profile for a new user (service role operation)
 */
export async function createUserProfile(
  userId: string,
  email: string,
  organizationData: {
    name: string
    plan_tier?: 'starter' | 'professional' | 'enterprise'
  }
) {
  const supabase = createServiceClient() // Use service role to bypass RLS
  
  try {
    // Create organization first
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationData.name,
        plan_tier: organizationData.plan_tier || 'starter',
        subscription_status: 'trial'
      })
      .select()
      .single()
    
    if (orgError) {
      throw new Error(`Organization creation failed: ${orgError.message}`)
    }
    
    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        organization_id: organization.id,
        role: 'admin', // First user in organization is admin
        email: email
      })
      .select()
      .single()
    
    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }
    
    return { organization, profile }
    
  } catch (error) {
    console.error('Create user profile error:', error)
    throw error
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  updates: Partial<Database['public']['Tables']['profiles']['Update']>
) {
  const { user } = await validateUserRole()
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Profile update failed: ${error.message}`)
  }
  
  return data
}

/**
 * Update organization (admin only)
 */
export async function updateOrganization(
  updates: Partial<Database['public']['Tables']['organizations']['Update']>
) {
  const { profile } = await validateUserRole('admin')
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', profile.organization_id!)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Organization update failed: ${error.message}`)
  }
  
  return data
}