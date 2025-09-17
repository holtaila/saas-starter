import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Call = Database['public']['Tables']['calls']['Row']
type CallInsert = Database['public']['Tables']['calls']['Insert']
type CallUpdate = Database['public']['Tables']['calls']['Update']

/**
 * Get all calls for current user's organization
 */
export async function getCalls(
  limit: number = 50,
  offset: number = 0
): Promise<Call[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)
  
  if (error) {
    throw new Error(`Failed to get calls: ${error.message}`)
  }
  
  return data
}

/**
 * Get single call by ID
 */
export async function getCallById(id: string): Promise<Call | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to get call: ${error.message}`)
  }
  
  return data
}

/**
 * Get call by Retell call ID (for webhook processing)
 */
export async function getCallByRetellId(retellCallId: string): Promise<Call | null> {
  const supabase = createServiceClient() // Use service role for webhook processing
  
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('retell_call_id', retellCallId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to get call by Retell ID: ${error.message}`)
  }
  
  return data
}

/**
 * Create new call
 */
export async function createCall(call: CallInsert): Promise<Call> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('calls')
    .insert(call)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create call: ${error.message}`)
  }
  
  return data
}

/**
 * Update call (typically from webhook data)
 */
export async function updateCall(id: string, updates: CallUpdate): Promise<Call> {
  const supabase = createServiceClient() // Use service role for webhook updates
  
  const { data, error } = await supabase
    .from('calls')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update call: ${error.message}`)
  }
  
  return data
}

/**
 * Update call by Retell ID (for webhook processing)
 */
export async function updateCallByRetellId(
  retellCallId: string, 
  updates: CallUpdate
): Promise<Call | null> {
  const supabase = createServiceClient() // Use service role for webhook processing
  
  const { data, error } = await supabase
    .from('calls')
    .update(updates)
    .eq('retell_call_id', retellCallId)
    .select()
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null // No matching call found
    }
    throw new Error(`Failed to update call by Retell ID: ${error.message}`)
  }
  
  return data
}

/**
 * Get calls by campaign ID
 */
export async function getCallsByCampaign(campaignId: string): Promise<Call[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to get calls by campaign: ${error.message}`)
  }
  
  return data
}

/**
 * Get calls by agent ID
 */
export async function getCallsByAgent(agentId: string): Promise<Call[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to get calls by agent: ${error.message}`)
  }
  
  return data
}

/**
 * Get calls by status
 */
export async function getCallsByStatus(
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed'
): Promise<Call[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to get calls by status: ${error.message}`)
  }
  
  return data
}

/**
 * Get call statistics for dashboard
 */
export async function getCallStatistics(): Promise<{
  totalCalls: number
  callsToday: number
  callsThisWeek: number
  callsThisMonth: number
  completedCalls: number
  inProgressCalls: number
  failedCalls: number
  totalDuration: number
  averageDuration: number
}> {
  const supabase = await createClient()
  
  // Get total calls count
  const { count: totalCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
  
  // Get today's calls using RPC function
  const { data: callsToday } = await supabase
    .rpc('get_calls_count_today')
  
  // Get this week's calls
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  
  const { count: callsThisWeek } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .gte('created_at', startOfWeek.toISOString())
  
  // Get this month's calls
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const { count: callsThisMonth } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .gte('created_at', startOfMonth.toISOString())
  
  // Get status counts
  const { count: completedCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('status', 'completed')
  
  const { count: inProgressCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('status', 'in_progress')
  
  const { count: failedCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('status', 'failed')
  
  // Get duration statistics
  const { data: durationData } = await supabase
    .from('calls')
    .select('duration_seconds')
    .eq('status', 'completed')
    .not('duration_seconds', 'is', null)
  
  const totalDuration = durationData?.reduce(
    (sum, call) => sum + (call.duration_seconds || 0),
    0
  ) || 0
  
  const averageDuration = durationData?.length 
    ? totalDuration / durationData.length 
    : 0
  
  return {
    totalCalls: totalCalls || 0,
    callsToday: callsToday || 0,
    callsThisWeek: callsThisWeek || 0,
    callsThisMonth: callsThisMonth || 0,
    completedCalls: completedCalls || 0,
    inProgressCalls: inProgressCalls || 0,
    failedCalls: failedCalls || 0,
    totalDuration,
    averageDuration: Math.round(averageDuration)
  }
}

/**
 * Create multiple calls for batch campaign
 */
export async function createBatchCalls(calls: CallInsert[]): Promise<Call[]> {
  const supabase = createServiceClient() // Use service role for batch operations
  
  const { data, error } = await supabase
    .from('calls')
    .insert(calls)
    .select()
  
  if (error) {
    throw new Error(`Failed to create batch calls: ${error.message}`)
  }
  
  return data
}

/**
 * Get recent calls with agent and campaign info
 */
export async function getRecentCallsWithDetails(limit: number = 10): Promise<any[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('calls')
    .select(`
      *,
      agent:agents(name, type),
      campaign:call_campaigns(name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    throw new Error(`Failed to get recent calls with details: ${error.message}`)
  }
  
  return data
}