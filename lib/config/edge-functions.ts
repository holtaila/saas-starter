// Configuration for Supabase Edge Functions

const SUPABASE_PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const EDGE_FUNCTIONS_BASE_URL = `${SUPABASE_PROJECT_URL}/functions/v1`

export const EDGE_FUNCTION_URLS = {
  // Webhook endpoints
  retellWebhook: `${EDGE_FUNCTIONS_BASE_URL}/retell-webhook`,
  
  // Campaign management
  campaignTrigger: `${EDGE_FUNCTIONS_BASE_URL}/campaign-trigger`,
} as const

// Helper to call Edge Functions from the app
export async function callEdgeFunction(
  functionUrl: string, 
  payload: any, 
  options: {
    headers?: Record<string, string>
    method?: string
  } = {}
) {
  const { headers = {}, method = 'POST' } = options
  
  // Add authorization header if we have a session
  const authHeaders: Record<string, string> = {}
  
  // In a browser environment, get the auth token from Supabase client
  if (typeof window !== 'undefined') {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.access_token) {
      authHeaders['Authorization'] = `Bearer ${session.access_token}`
    }
  }
  
  const response = await fetch(functionUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...headers,
    },
    body: method === 'GET' ? undefined : JSON.stringify(payload),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Edge Function error (${response.status}): ${errorText}`)
  }
  
  return await response.json()
}

// Campaign management helpers
export const campaignTriggers = {
  async startCampaign(campaignId: string) {
    return callEdgeFunction(EDGE_FUNCTION_URLS.campaignTrigger, {
      action: 'start_campaign',
      campaign_id: campaignId,
    })
  },
  
  async processBatch(campaignId: string, batchSize = 10) {
    return callEdgeFunction(EDGE_FUNCTION_URLS.campaignTrigger, {
      action: 'process_batch',
      campaign_id: campaignId,
      batch_size: batchSize,
    })
  },
  
  async pauseCampaign(campaignId: string) {
    return callEdgeFunction(EDGE_FUNCTION_URLS.campaignTrigger, {
      action: 'pause_campaign',
      campaign_id: campaignId,
    })
  },
  
  async resumeCampaign(campaignId: string) {
    return callEdgeFunction(EDGE_FUNCTION_URLS.campaignTrigger, {
      action: 'resume_campaign',
      campaign_id: campaignId,
    })
  },
  
  async checkScheduledCampaigns(organizationId?: string) {
    return callEdgeFunction(EDGE_FUNCTION_URLS.campaignTrigger, {
      action: 'schedule_check',
      organization_id: organizationId,
    })
  },
}

// Environment-specific configurations
export const getEdgeFunctionConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isLocal = SUPABASE_PROJECT_URL.includes('127.0.0.1') || SUPABASE_PROJECT_URL.includes('localhost')
  
  return {
    isDevelopment,
    isLocal,
    baseUrl: EDGE_FUNCTIONS_BASE_URL,
    urls: EDGE_FUNCTION_URLS,
    // Webhook URLs for external services (like Retell)
    webhookUrls: {
      retell: isDevelopment && isLocal 
        ? `${EDGE_FUNCTIONS_BASE_URL}/retell-webhook` // Use ngrok or similar for local testing
        : `${EDGE_FUNCTIONS_BASE_URL}/retell-webhook`
    }
  }
}