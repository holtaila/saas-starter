import { getServiceSupabase } from '@/lib/supabase/utils';
import { Database } from '@/lib/types/database';

type BatchCall = Database['public']['Tables']['batch_calls']['Row'];
type BatchCallInsert = Database['public']['Tables']['batch_calls']['Insert'];
type BatchCallUpdate = Database['public']['Tables']['batch_calls']['Update'];

export async function getBatchCalls(organizationId: string, limit = 50, offset = 0) {
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('batch_calls')
    .select(`
      *,
      campaign:call_campaigns(id, name, status),
      agent:agents(id, name, type),
      phone_number:phone_numbers(id, phone_number, display_name)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching batch calls:', error);
    throw error;
  }

  return data;
}

export async function getBatchCallById(id: string, organizationId: string) {
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('batch_calls')
    .select(`
      *,
      campaign:call_campaigns(id, name, status, total_numbers, processed_numbers),
      agent:agents(id, name, type, retell_agent_id),
      phone_number:phone_numbers(id, phone_number, display_name),
      calls:calls(*)
    `)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    console.error('Error fetching batch call:', error);
    throw error;
  }

  return data;
}

export async function getBatchCallsByRetellId(retellBatchCallId: string) {
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('batch_calls')
    .select('*')
    .eq('retell_batch_call_id', retellBatchCallId)
    .single();

  if (error) {
    console.error('Error fetching batch call by Retell ID:', error);
    throw error;
  }

  return data;
}

export async function createBatchCall(batchCall: BatchCallInsert) {
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('batch_calls')
    .insert(batchCall)
    .select()
    .single();

  if (error) {
    console.error('Error creating batch call:', error);
    throw error;
  }

  return data;
}

export async function updateBatchCall(id: string, updates: BatchCallUpdate) {
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('batch_calls')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating batch call:', error);
    throw error;
  }

  return data;
}

export async function updateBatchCallByRetellId(retellBatchCallId: string, updates: BatchCallUpdate) {
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('batch_calls')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('retell_batch_call_id', retellBatchCallId)
    .select()
    .single();

  if (error) {
    console.error('Error updating batch call by Retell ID:', error);
    throw error;
  }

  return data;
}

export async function getBatchCallStats(organizationId: string) {
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('batch_calls')
    .select('status, total_task_count')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error fetching batch call stats:', error);
    throw error;
  }

  // Calculate statistics
  const stats = {
    total: data.length,
    scheduled: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    totalTasks: 0,
  };

  data.forEach(batch => {
    stats[batch.status as keyof typeof stats]++;
    stats.totalTasks += batch.total_task_count || 0;
  });

  return stats;
}

export async function getActiveBatchCalls(organizationId: string) {
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('batch_calls')
    .select(`
      *,
      campaign:call_campaigns(id, name),
      agent:agents(id, name)
    `)
    .eq('organization_id', organizationId)
    .in('status', ['scheduled', 'processing'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching active batch calls:', error);
    throw error;
  }

  return data;
}