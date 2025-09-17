import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Campaign = Database['public']['Tables']['call_campaigns']['Row']
type CampaignInsert = Database['public']['Tables']['call_campaigns']['Insert']
type CampaignUpdate = Database['public']['Tables']['call_campaigns']['Update']

/**
 * Get all campaigns for current user's organization
 */
export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('call_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to get campaigns: ${error.message}`)
  }
  
  return data
}

/**
 * Get campaign by ID with agent details
 */
export async function getCampaignById(id: string): Promise<any | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('call_campaigns')
    .select(`
      *,
      agent:agents(name, type),
    `)
    .eq('id', id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to get campaign: ${error.message}`)
  }
  
  return data
}

/**
 * Create new campaign
 */
export async function createCampaign(campaign: CampaignInsert): Promise<Campaign> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('call_campaigns')
    .insert(campaign)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create campaign: ${error.message}`)
  }
  
  return data
}

/**
 * Update campaign
 */
export async function updateCampaign(id: string, updates: CampaignUpdate): Promise<Campaign> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('call_campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update campaign: ${error.message}`)
  }
  
  return data
}

/**
 * Update campaign status (service role for webhook/trigger updates)
 */
export async function updateCampaignStatus(
  id: string, 
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused'
): Promise<Campaign> {
  const supabase = createServiceClient() // Use service role for system updates
  
  const { data, error } = await supabase
    .from('call_campaigns')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update campaign status: ${error.message}`)
  }
  
  return data
}

/**
 * Delete campaign
 */
export async function deleteCampaign(id: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('call_campaigns')
    .delete()
    .eq('id', id)
  
  if (error) {
    throw new Error(`Failed to delete campaign: ${error.message}`)
  }
}

/**
 * Get campaigns by status
 */
export async function getCampaignsByStatus(
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused'
): Promise<Campaign[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('call_campaigns')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to get campaigns by status: ${error.message}`)
  }
  
  return data
}

/**
 * Get campaign with detailed statistics
 */
export async function getCampaignWithStats(id: string): Promise<any | null> {
  const supabase = await createClient()
  
  // Get campaign details
  const campaign = await getCampaignById(id)
  if (!campaign) {
    return null
  }
  
  // Get call statistics for this campaign
  const { count: totalCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('campaign_id', id)
  
  const { count: completedCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('campaign_id', id)
    .eq('status', 'completed')
  
  const { count: failedCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('campaign_id', id)
    .eq('status', 'failed')
  
  const { count: inProgressCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('campaign_id', id)
    .eq('status', 'in_progress')
  
  // Get duration and cost statistics
  const { data: callDetails } = await supabase
    .from('calls')
    .select('duration_seconds, cost')
    .eq('campaign_id', id)
    .eq('status', 'completed')
  
  const totalDuration = callDetails?.reduce(
    (sum, call) => sum + (call.duration_seconds || 0),
    0
  ) || 0
  
  const totalCost = callDetails?.reduce(
    (sum, call) => sum + (call.cost || 0),
    0
  ) || 0
  
  const averageDuration = callDetails?.length 
    ? totalDuration / callDetails.length 
    : 0
  
  // Calculate success rate
  const successRate = totalCalls ? (completedCalls || 0) / totalCalls * 100 : 0
  
  return {
    ...campaign,
    statistics: {
      totalCalls: totalCalls || 0,
      completedCalls: completedCalls || 0,
      failedCalls: failedCalls || 0,
      inProgressCalls: inProgressCalls || 0,
      totalDuration,
      averageDuration: Math.round(averageDuration),
      totalCost,
      successRate: Math.round(successRate * 100) / 100
    }
  }
}

/**
 * Get active campaigns (processing or pending)
 */
export async function getActiveCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('call_campaigns')
    .select('*')
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to get active campaigns: ${error.message}`)
  }
  
  return data
}

/**
 * Get campaign progress (for real-time updates)
 */
export async function getCampaignProgress(id: string): Promise<{
  campaign: Campaign
  progress: {
    totalNumbers: number
    processedNumbers: number
    completedCalls: number
    failedCalls: number
    inProgressCalls: number
    completionPercentage: number
  }
} | null> {
  const supabase = await createClient()
  
  const campaign = await getCampaignById(id)
  if (!campaign) {
    return null
  }
  
  // Count calls by status
  const { count: completedCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('campaign_id', id)
    .eq('status', 'completed')
  
  const { count: failedCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('campaign_id', id)
    .eq('status', 'failed')
  
  const { count: inProgressCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('campaign_id', id)
    .eq('status', 'in_progress')
  
  const processedNumbers = (completedCalls || 0) + (failedCalls || 0)
  const completionPercentage = campaign.total_numbers 
    ? (processedNumbers / campaign.total_numbers) * 100 
    : 0
  
  return {
    campaign,
    progress: {
      totalNumbers: campaign.total_numbers,
      processedNumbers,
      completedCalls: completedCalls || 0,
      failedCalls: failedCalls || 0,
      inProgressCalls: inProgressCalls || 0,
      completionPercentage: Math.round(completionPercentage * 100) / 100
    }
  }
}

/**
 * Mark campaign as completed (system operation)
 */
export async function markCampaignCompleted(id: string): Promise<Campaign> {
  return updateCampaignStatus(id, 'completed')
}

/**
 * Mark campaign as paused (system operation)
 */
export async function markCampaignPaused(id: string): Promise<Campaign> {
  return updateCampaignStatus(id, 'paused')
}

/**
 * Mark campaign as processing (system operation)
 */
export async function markCampaignProcessing(id: string): Promise<Campaign> {
  return updateCampaignStatus(id, 'processing')
}