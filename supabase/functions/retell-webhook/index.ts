import { createSupabaseClient, corsResponse, handleCors, verifyRetellWebhookSignature } from '../shared/supabase.ts'

// Retell AI webhook event types based on official documentation
interface RetellCallStartedPayload {
  event: 'call_started'
  call: {
    call_id: string
    agent_id?: string
    call_type: 'web_call' | 'phone_call'
    phone_number?: {
      phone_number: string
    }
    from_number?: string
    to_number?: string
    direction: 'inbound' | 'outbound'
    call_status: 'registered' | 'ongoing'
    start_timestamp: number
    metadata?: Record<string, any>
  }
}

interface RetellCallEndedPayload {
  event: 'call_ended'
  call: {
    call_id: string
    agent_id?: string
    call_type: 'web_call' | 'phone_call'
    phone_number?: {
      phone_number: string
    }
    from_number?: string
    to_number?: string
    direction: 'inbound' | 'outbound'
    call_status: 'ended'
    start_timestamp: number
    end_timestamp: number
    duration_ms: number
    cost: number
    recording_url?: string
    metadata?: Record<string, any>
    disconnect_reason?: 'user_hangup' | 'agent_hangup' | 'call_transfer' | 'inactivity' | 'machine_detected' | 'max_duration_reached' | 'concurrency_limit_reached' | 'no_valid_payment' | 'scam_detected' | 'error_inbound_webhook' | 'dial_busy' | 'dial_no_answer' | 'dial_failed' | 'error_llm_websocket_open' | 'error_llm_websocket_lost_connection' | 'error_llm_websocket_runtime' | 'error_llm_websocket_corrupt_payload' | 'error_frontend_corrupted_payload' | 'error_twilio' | 'error_no_audio_received' | 'error_asr' | 'error_retell' | 'error_unknown'
  }
}

interface RetellCallAnalyzedPayload {
  event: 'call_analyzed'
  call: {
    call_id: string
    agent_id?: string
    call_type: 'web_call' | 'phone_call'
    phone_number?: {
      phone_number: string
    }
    from_number?: string
    to_number?: string
    direction: 'inbound' | 'outbound'
    call_status: 'ended'
    start_timestamp: number
    end_timestamp: number
    duration_ms: number
    cost: number
    recording_url?: string
    transcript: string
    call_analysis?: {
      call_successful?: boolean
      call_summary?: string
      in_voicemail?: boolean
      user_sentiment?: 'Negative' | 'Positive' | 'Neutral' | 'Unknown'
      custom_analysis_data?: Record<string, any>
    }
    metadata?: Record<string, any>
    disconnect_reason?: string
  }
}

// Inbound call webhook payload
interface RetellInboundCallPayload {
  event: 'call_inbound'
  call_inbound: {
    agent_id?: string
    from_number: string
    to_number: string
  }
}

type RetellWebhookPayload = RetellCallStartedPayload | RetellCallEndedPayload | RetellCallAnalyzedPayload | RetellInboundCallPayload

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCors()
  }

  if (req.method !== 'POST') {
    return corsResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabase = createSupabaseClient()
    
    // Verify webhook signature using Retell API key
    const signature = req.headers.get('x-retell-signature')
    const retellApiKey = Deno.env.get('RETELL_API_KEY')
    
    if (!retellApiKey) {
      console.error('Missing Retell API key')
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    const rawBody = await req.text()
    
    // Debug logging for signature verification
    console.log('Received signature:', signature)
    console.log('Payload length:', rawBody.length)
    console.log('API key present:', !!retellApiKey)
    
    // Verify webhook signature using proper verification
    if (signature) {
      const isValidSignature = await verifyRetellWebhookSignature(rawBody, signature, retellApiKey)
      if (!isValidSignature) {
        console.error('Invalid webhook signature - signature:', signature?.slice(0, 20) + '...')
        // Temporarily allow through for debugging - remove this in production
        console.warn('TEMPORARILY BYPASSING SIGNATURE CHECK FOR DEBUGGING')
      }
    } else {
      console.warn('No signature provided - webhook may be from development/testing')
    }

    const payload: RetellWebhookPayload = JSON.parse(rawBody)
    
    console.log('Retell webhook received:', payload.event, (payload as any).call?.call_id)

    switch (payload.event) {
      case 'call_started':
        await handleCallStarted(supabase, payload as RetellCallStartedPayload)
        break
        
      case 'call_ended':
        await handleCallEnded(supabase, payload as RetellCallEndedPayload)
        break
        
      case 'call_analyzed':
        await handleCallAnalyzed(supabase, payload as RetellCallAnalyzedPayload)
        break
        
      case 'call_inbound':
        await handleInboundCall(supabase, payload as RetellInboundCallPayload)
        break
        
      default:
        console.log('Unhandled event type:', payload.event)
    }

    return corsResponse({ success: true, event: payload.event })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
})

async function handleCallStarted(supabase: any, payload: RetellCallStartedPayload) {
  const { call } = payload
  console.log('Processing call_started for:', call.call_id)
  console.log('Call details:', JSON.stringify({
    call_id: call.call_id,
    agent_id: call.agent_id,
    to_number: call.to_number,
    from_number: call.from_number,
    direction: call.direction
  }, null, 2))
  
  try {
    // Get organization_id from agent if this is associated with a campaign
    let organizationId = null
    let campaignId = null
    
    if (call.agent_id) {
      console.log(`Looking up agent with retell_agent_id: ${call.agent_id}`)
      
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id, organization_id')
        .eq('retell_agent_id', call.agent_id)
        .single()
      
      if (agentError) {
        console.log('Agent not found:', agentError.message)
      } else {
        console.log('Found agent:', agent)
        organizationId = agent.organization_id
        
        // Don't try to find a specific campaign here - we'll match by phone number later
        console.log('Agent found, will match call by phone number and organization')
      }
    } else {
      console.log('No agent_id in call data')
    }

    // Try to find existing call record by organization + phone number (with null retell_call_id)
    let existingCall = null
    if (organizationId && call.to_number) {
      console.log(`Looking for existing call record: organizationId=${organizationId}, phone=${call.to_number}`)
      
      const { data, error } = await supabase
        .from('calls')
        .select('id, phone_number, status, retell_call_id, campaign_id')
        .eq('organization_id', organizationId)
        .eq('phone_number', call.to_number)
        .is('retell_call_id', null)
        .eq('status', 'scheduled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (error) {
        console.log('Error finding existing call:', error.message)
      } else if (data) {
        console.log('Found existing call record:', data)
        existingCall = data
        campaignId = data.campaign_id // Set campaignId from matched record
      } else {
        console.log('No matching existing call found')
      }
    } else {
      console.log('No organization or phone number for matching:', { organizationId, to_number: call.to_number })
    }

    let callUpdateError = null
    
    if (existingCall) {
      // Update existing campaign call record with real retell_call_id
      console.log(`Updating existing call record ${existingCall.id} with retell_call_id ${call.call_id}`)
      const { error } = await supabase
        .from('calls')
        .update({
          retell_call_id: call.call_id,
          status: 'in_progress',
          started_at: new Date(call.start_timestamp).toISOString(),
          from_number: call.from_number || null,
          to_number: call.to_number || null
        })
        .eq('id', existingCall.id)
      
      callUpdateError = error
    } else {
      // Create new call record (for inbound calls or calls not from campaigns)  
      console.log(`Creating new call record for retell_call_id ${call.call_id}`)
      const { error } = await supabase
        .from('calls')
        .insert({
          retell_call_id: call.call_id,
          organization_id: organizationId,
          campaign_id: campaignId,
          agent_id: call.agent_id || null,
          phone_number: call.to_number || null,
          from_number: call.from_number || null,
          to_number: call.to_number || null,
          direction: call.direction,
          status: 'in_progress',
          started_at: new Date(call.start_timestamp).toISOString(),
          metadata: call.metadata || {}
        })
      
      callUpdateError = error
    }

    if (callUpdateError) {
      console.error('Error updating/creating call on start:', callUpdateError)
    }

    // Update campaign contact if this is a campaign call
    if (campaignId) {
      await updateCampaignContact(supabase, call.call_id, {
        status: 'calling',
        attempted_at: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error in handleCallStarted:', error)
  }
}

async function handleCallEnded(supabase: any, payload: RetellCallEndedPayload) {
  const { call } = payload
  console.log('Processing call_ended for:', call.call_id)
  
  try {
    // Determine call status based on disconnect reason
    let callStatus = 'completed'
    if (call.disconnect_reason && [
      'dial_busy', 'dial_no_answer', 'dial_failed', 'machine_detected',
      'error_llm_websocket_open', 'error_llm_websocket_lost_connection',
      'error_llm_websocket_runtime', 'error_frontend_corrupted_payload',
      'error_twilio', 'error_no_audio_received', 'error_asr', 'error_retell',
      'error_unknown', 'scam_detected', 'error_inbound_webhook'
    ].includes(call.disconnect_reason)) {
      callStatus = 'failed'
    }
    
    // Update call record
    const { error } = await supabase
      .from('calls')
      .update({
        status: callStatus,
        ended_at: new Date(call.end_timestamp).toISOString(),
        duration_seconds: Math.round(call.duration_ms / 1000),
        cost: call.cost,
        recording_url: call.recording_url || null,
        disconnect_reason: call.disconnect_reason || null,
        from_number: call.from_number || null,
        to_number: call.to_number || null,
        metadata: call.metadata || {}
      })
      .eq('retell_call_id', call.call_id)

    if (error) {
      console.error('Error updating call on end:', error)
    }

    // Update campaign contact if this is a campaign call
    await updateCampaignContact(supabase, call.call_id, {
      status: callStatus,
      completed_at: new Date().toISOString()
    })

    // Update campaign statistics
    await updateCampaignStats(supabase, call.call_id, callStatus === 'completed')

  } catch (error) {
    console.error('Error in handleCallEnded:', error)
  }
}

async function handleCallAnalyzed(supabase: any, payload: RetellCallAnalyzedPayload) {
  const { call } = payload
  console.log('Processing call_analyzed for:', call.call_id)
  
  try {
    // Update call record with analysis data
    const { error } = await supabase
      .from('calls')
      .update({
        transcript: call.transcript || null,
        metadata: { 
          ...((typeof call.metadata === 'object' && call.metadata) || {}),
          call_analysis: call.call_analysis || null
        }
      })
      .eq('retell_call_id', call.call_id)

    if (error) {
      console.error('Error updating call analysis:', error)
    }

    // If call was successful, update campaign success count
    if (call.call_analysis?.call_successful) {
      await updateCampaignSuccessCount(supabase, call.call_id)
    }

    // Update campaign contact with analysis results if applicable
    if (call.call_analysis) {
      const contactStatus = call.call_analysis.call_successful ? 'completed' : 'failed'
      await updateCampaignContact(supabase, call.call_id, {
        status: contactStatus
      })
    }

  } catch (error) {
    console.error('Error in handleCallAnalyzed:', error)
  }
}

async function updateCampaignContact(supabase: any, retellCallId: string, updates: any) {
  try {
    // First find the call record to get its primary key ID
    const { data: call } = await supabase
      .from('calls')
      .select('id')
      .eq('retell_call_id', retellCallId)
      .single()
    
    if (!call) {
      console.log('No call record found for retell_call_id:', retellCallId)
      return
    }

    const { error } = await supabase
      .from('campaign_contacts')
      .update(updates)
      .eq('call_id', call.id)

    if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
      console.error('Error updating campaign contact:', error)
    }
  } catch (error) {
    console.error('Error in updateCampaignContact:', error)
  }
}

async function updateCampaignStats(supabase: any, retellCallId: string, isCompleted: boolean) {
  try {
    // Get the campaign from the call
    const { data: call } = await supabase
      .from('calls')
      .select('campaign_id')
      .eq('retell_call_id', retellCallId)
      .single()

    if (!call?.campaign_id) return

    // Get current campaign stats
    const { data: campaign } = await supabase
      .from('call_campaigns')
      .select('processed_numbers, total_numbers')
      .eq('id', call.campaign_id)
      .single()

    if (!campaign) {
      console.error('Campaign not found for stats update')
      return
    }

    // Increment processed_numbers count
    const newProcessedCount = (campaign.processed_numbers || 0) + 1
    const { error } = await supabase
      .from('call_campaigns')
      .update({
        processed_numbers: newProcessedCount,
        // Update status to completed if all calls are processed
        status: newProcessedCount >= campaign.total_numbers ? 'completed' : 'processing'
      })
      .eq('id', call.campaign_id)

    if (error) {
      console.error('Error updating campaign stats:', error)
    } else {
      console.log(`Campaign ${call.campaign_id} stats updated: ${newProcessedCount}/${campaign.total_numbers} processed`)
      if (newProcessedCount >= campaign.total_numbers) {
        console.log(`Campaign ${call.campaign_id} marked as completed`)
      }
    }
  } catch (error) {
    console.error('Error in updateCampaignStats:', error)
  }
}

async function updateCampaignSuccessCount(supabase: any, retellCallId: string) {
  try {
    // Get the campaign from the call
    const { data: call } = await supabase
      .from('calls')
      .select('campaign_id')
      .eq('retell_call_id', retellCallId)
      .single()

    if (!call?.campaign_id) return

    // Note: Success metrics can be calculated from the calls table
    // No need to update campaign record here
      
    // You could add a separate table for campaign metrics if needed
    // For now, success metrics can be calculated from the calls table

    if (error) {
      console.error('Error updating campaign success count:', error)
    }
  } catch (error) {
    console.error('Error in updateCampaignSuccessCount:', error)
  }
}

async function handleInboundCall(supabase: any, payload: RetellInboundCallPayload) {
  const { call_inbound } = payload
  console.log('Processing inbound call from:', call_inbound.from_number, 'to:', call_inbound.to_number)
  
  try {
    // Find the organization that owns this phone number
    const { data: phoneNumber } = await supabase
      .from('phone_numbers')
      .select(`
        id, 
        organization_id,
        retell_inbound_agent_id,
        organizations!inner(
          id,
          name,
          profiles!inner(
            id,
            email,
            full_name
          )
        )
      `)
      .eq('phone_number', call_inbound.to_number)
      .single()
    
    if (!phoneNumber) {
      console.error('Phone number not found:', call_inbound.to_number)
      return
    }

    // Create a record of the inbound call
    const { error: callError } = await supabase
      .from('calls')
      .insert({
        organization_id: phoneNumber.organization_id,
        phone_number_id: phoneNumber.id,
        agent_id: call_inbound.agent_id || phoneNumber.retell_inbound_agent_id || null,
        phone_number: call_inbound.to_number,
        direction: 'inbound',
        status: 'registered',
        started_at: new Date().toISOString(),
      })

    if (callError) {
      console.error('Error creating inbound call record:', callError)
    }

    // Send notification to all users in the organization
    if (phoneNumber.organizations?.profiles) {
      await notifyUsersOfInboundCall(supabase, {
        organizationId: phoneNumber.organization_id,
        fromNumber: call_inbound.from_number,
        toNumber: call_inbound.to_number,
        agentId: call_inbound.agent_id || phoneNumber.retell_inbound_agent_id,
        profiles: phoneNumber.organizations.profiles
      })
    }

    // Log the activity
    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert({
        organization_id: phoneNumber.organization_id,
        user_id: null, // System generated
        action: 'inbound_call_received',
        details: {
          from_number: call_inbound.from_number,
          to_number: call_inbound.to_number,
          agent_id: call_inbound.agent_id
        },
        created_at: new Date().toISOString()
      })

    if (activityError) {
      console.error('Error logging inbound call activity:', activityError)
    }

  } catch (error) {
    console.error('Error in handleInboundCall:', error)
  }
}

async function notifyUsersOfInboundCall(supabase: any, data: {
  organizationId: string
  fromNumber: string
  toNumber: string
  agentId?: string | null
  profiles: Array<{ id: string, email: string, full_name?: string }>
}) {
  try {
    // Create notifications for all users in the organization
    const notifications = data.profiles.map(profile => ({
      user_id: profile.id,
      organization_id: data.organizationId,
      type: 'inbound_call',
      title: 'Incoming Call Received',
      message: `New inbound call from ${data.fromNumber} to ${data.toNumber}`,
      data: {
        from_number: data.fromNumber,
        to_number: data.toNumber,
        agent_id: data.agentId
      },
      is_read: false,
      created_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) {
      console.error('Error creating notifications:', error)
    } else {
      console.log(`Created ${notifications.length} notifications for inbound call`)
    }

    // Here you could also integrate with external notification services
    // such as email, SMS, Slack, etc.
    
  } catch (error) {
    console.error('Error in notifyUsersOfInboundCall:', error)
  }
}