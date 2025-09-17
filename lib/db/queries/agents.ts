import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Agent = Database['public']['Tables']['agents']['Row']
type AgentInsert = Database['public']['Tables']['agents']['Insert']
type AgentUpdate = Database['public']['Tables']['agents']['Update']

/**
 * Get all agents for current user's organization
 */
export async function getAgents(): Promise<Agent[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to get agents: ${error.message}`)
  }
  
  return data
}

/**
 * Get single agent by ID (RLS will ensure user can only access their org's agents)
 */
export async function getAgentById(id: string): Promise<Agent | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null // No rows found
    }
    throw new Error(`Failed to get agent: ${error.message}`)
  }
  
  return data
}

/**
 * Create new agent
 */
export async function createAgent(agent: AgentInsert): Promise<Agent> {
  const supabase = await createClient()
  
  // organization_id will be automatically set by RLS default
  const { data, error } = await supabase
    .from('agents')
    .insert({
      ...agent,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create agent: ${error.message}`)
  }
  
  return data
}

/**
 * Update agent
 */
export async function updateAgent(id: string, updates: AgentUpdate): Promise<Agent> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('agents')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update agent: ${error.message}`)
  }
  
  return data
}

/**
 * Delete agent
 */
export async function deleteAgent(id: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id)
  
  if (error) {
    throw new Error(`Failed to delete agent: ${error.message}`)
  }
}

/**
 * Get agents by status
 */
export async function getAgentsByStatus(
  status: 'active' | 'inactive' | 'draft'
): Promise<Agent[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to get agents by status: ${error.message}`)
  }
  
  return data
}

/**
 * Get agents by type
 */
export async function getAgentsByType(
  type: 'sales' | 'support' | 'appointment' | 'survey' | 'custom'
): Promise<Agent[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to get agents by type: ${error.message}`)
  }
  
  return data
}

/**
 * Get agent with call statistics
 */
export async function getAgentWithStats(id: string): Promise<Agent & {
  totalCalls: number
  completedCalls: number
  activeCampaigns: number
}> {
  const supabase = await createClient()
  
  // Get agent
  const agent = await getAgentById(id)
  if (!agent) {
    throw new Error('Agent not found')
  }
  
  // Get call statistics
  const { count: totalCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('agent_id', id)
  
  const { count: completedCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('agent_id', id)
    .eq('status', 'completed')
  
  const { count: activeCampaigns } = await supabase
    .from('call_campaigns')
    .select('*', { count: 'exact' })
    .eq('agent_id', id)
    .in('status', ['pending', 'processing'])
  
  return {
    ...agent,
    totalCalls: totalCalls || 0,
    completedCalls: completedCalls || 0,
    activeCampaigns: activeCampaigns || 0
  }
}

/**
 * Sync agent with Retell AI (update retell_agent_id)
 */
export async function syncAgentWithRetell(
  id: string,
  retellAgentId: string
): Promise<Agent> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('agents')
    .update({
      retell_agent_id: retellAgentId,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to sync agent with Retell: ${error.message}`)
  }
  
  return data
}