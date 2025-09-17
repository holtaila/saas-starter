import { createSupabaseClient, corsResponse, handleCors } from '../shared/supabase.ts'

interface CampaignTriggerPayload {
  action: 'start_campaign' | 'process_batch' | 'schedule_check' | 'pause_campaign' | 'resume_campaign'
  campaign_id?: string
  batch_size?: number
  organization_id?: string
}

interface RetellClient {
  createCall: (params: any) => Promise<any>
}

// Retell client for making outbound calls
class RetellAPIClient {
  private apiKey: string
  private baseUrl = 'https://api.retellai.com'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async createCall(params: {
    from_number: string
    to_number: string
    retell_agent_id: string
    metadata?: Record<string, any>
  }) {
    const response = await fetch(`${this.baseUrl}/v2/call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      throw new Error(`Retell API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  async createBatchCall(params: {
    from_number: string
    tasks: Array<{
      to_number: string
    }>
    retell_agent_id?: string
  }) {
    console.log('Retell batch call payload:', JSON.stringify(params, null, 2))
    
    const response = await fetch(`${this.baseUrl}/create-batch-call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Retell API error response:', errorText)
      throw new Error(`Retell Batch API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return await response.json()
  }
}

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
    const payload: CampaignTriggerPayload = await req.json()
    
    console.log('Campaign trigger received:', payload.action, payload.campaign_id)

    switch (payload.action) {
      case 'start_campaign':
        if (!payload.campaign_id) {
          return corsResponse({ error: 'campaign_id required for start_campaign' }, 400)
        }
        await handleStartCampaign(supabase, payload.campaign_id)
        break
        
      case 'process_batch':
        if (!payload.campaign_id) {
          return corsResponse({ error: 'campaign_id required for process_batch' }, 400)
        }
        await handleProcessBatch(supabase, payload.campaign_id, payload.batch_size || 10)
        break
        
      case 'schedule_check':
        await handleScheduleCheck(supabase, payload.organization_id)
        break
        
      case 'pause_campaign':
        if (!payload.campaign_id) {
          return corsResponse({ error: 'campaign_id required for pause_campaign' }, 400)
        }
        await handlePauseCampaign(supabase, payload.campaign_id)
        break
        
      case 'resume_campaign':
        if (!payload.campaign_id) {
          return corsResponse({ error: 'campaign_id required for resume_campaign' }, 400)
        }
        await handleResumeCampaign(supabase, payload.campaign_id)
        break
        
      default:
        return corsResponse({ error: 'Unknown action' }, 400)
    }

    return corsResponse({ success: true, action: payload.action })

  } catch (error) {
    console.error('Campaign trigger processing error:', error)
    return corsResponse({ error: 'Internal server error', details: error.message }, 500)
  }
})

async function handleStartCampaign(supabase: any, campaignId: string) {
  console.log('Starting campaign:', campaignId)
  
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('call_campaigns')
      .select(`
        *,
        agents:agent_id (
          retell_agent_id
        )
      `)
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignId}`)
    }

    // Allow starting campaigns that are pending or failed (for retries)
    if (!['pending', 'failed'].includes(campaign.status)) {
      throw new Error(`Campaign ${campaignId} is not in a startable state: ${campaign.status}`)
    }

    // Update campaign status to processing
    const { error: updateError } = await supabase
      .from('call_campaigns')
      .update({
        status: 'processing'
      })
      .eq('id', campaignId)

    if (updateError) {
      throw new Error(`Failed to update campaign status: ${updateError.message}`)
    }

    // Start processing the first batch
    await handleProcessBatch(supabase, campaignId, 10)

    console.log('Campaign started successfully:', campaignId)

  } catch (error) {
    console.error('Error starting campaign:', error)
    
    // Mark campaign as failed
    await supabase
      .from('call_campaigns')
      .update({
        status: 'failed'
      })
      .eq('id', campaignId)
      
    throw error
  }
}

async function handleProcessBatch(supabase: any, campaignId: string, batchSize: number) {
  console.log(`Processing batch for campaign ${campaignId}, size: ${batchSize}`)
  
  try {
    // Get campaign with agent details  
    const { data: campaign, error: campaignError } = await supabase
      .from('call_campaigns')
      .select(`
        *,
        agents:agent_id (
          retell_agent_id
        )
      `)
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignId}`)
    }

    if (campaign.status !== 'processing') {
      console.log(`Campaign ${campaignId} is not processing, skipping batch processing`)
      return
    }

    // Get pending contacts for this campaign
    const { data: contacts, error: contactsError } = await supabase
      .from('campaign_contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .limit(batchSize)

    if (contactsError) {
      throw new Error(`Failed to get campaign contacts: ${contactsError.message}`)
    }

    if (!contacts || contacts.length === 0) {
      console.log(`No pending contacts for campaign ${campaignId}, marking as completed`)
      
      // Mark campaign as completed
      await supabase
        .from('call_campaigns')
        .update({
          status: 'completed'
        })
        .eq('id', campaignId)
      
      return
    }

    const retellApiKey = Deno.env.get('RETELL_API_KEY')
    if (!retellApiKey) {
      throw new Error('RETELL_API_KEY not configured')
    }

    // Get organization's phone number for outbound calls
    const { data: phoneAssignment } = await supabase
      .from('organization_phone_assignments')
      .select(`
        phone_numbers!inner(
          phone_number,
          retell_phone_number_id,
          status
        )
      `)
      .eq('organization_id', campaign.organization_id)
      .eq('is_primary', true)
      .eq('phone_numbers.status', 'active')
      .single()

    if (!phoneAssignment?.phone_numbers?.phone_number) {
      throw new Error(`No active phone number found for organization ${campaign.organization_id}`)
    }

    const fromPhoneNumber = phoneAssignment.phone_numbers.phone_number
    console.log(`Using phone number ${fromPhoneNumber} for outbound calls`)

    const retellClient = new RetellAPIClient(retellApiKey)

    // Prepare batch call tasks (minimal - Retell batch API doesn't support dynamic_variables)
    const batchTasks = contacts.map(contact => ({
      to_number: contact.phone
    }))

    try {
      console.log(`Creating batch call for ${contacts.length} contacts`)
      
      // Create actual Retell batch call
      const batchCallResponse = await retellClient.createBatchCall({
        from_number: fromPhoneNumber,
        retell_agent_id: campaign.agents?.retell_agent_id,
        tasks: batchTasks
      })

      console.log(`Batch call created successfully: ${batchCallResponse.batch_call_id}`)

      // Create call records in database for each contact
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i]
        try {
          console.log(`Creating call record for contact ${contact.id}`)

          // Create call record in database (retell_call_id will be set by webhook)
          const { data: callData, error: callError } = await supabase
            .from('calls')
            .insert({
              retell_call_id: null, // Will be updated by webhook when actual call starts
              campaign_id: campaignId,
              agent_id: campaign.agent_id,
              organization_id: campaign.organization_id,
              phone_number: contact.phone,
              direction: 'outbound',
              status: 'scheduled',
              metadata: {
                contact_name: contact.name,
                contact_id: contact.id,
                batch_call_id: batchCallResponse.batch_call_id,
                batch_task_index: i,
                agent_retell_id: campaign.agents?.retell_agent_id
              }
            })
            .select()
            .single()

          if (callError) {
            console.error('Failed to create call record:', callError)
            continue
          }

          // Update contact status
          if (callData) {
            const { error: contactUpdateError } = await supabase
              .from('campaign_contacts')
              .update({
                status: 'calling',
                call_id: callData.id
              })
              .eq('id', contact.id)

            if (contactUpdateError) {
              console.error('Failed to update contact status:', contactUpdateError)
            }
          }

          console.log(`Call record created successfully for contact ${contact.id}`)

        } catch (error) {
          console.error(`Failed to create call record for contact ${contact.id}:`, error)
          
          // Mark contact as failed
          await supabase
            .from('campaign_contacts')
            .update({
              status: 'failed'
            })
            .eq('id', contact.id)
        }
      }

    } catch (error) {
      console.error('Failed to create batch call:', error)
      
      // Mark all contacts as failed
      for (const contact of contacts) {
        await supabase
          .from('campaign_contacts')
          .update({
            status: 'failed'
          })
          .eq('id', contact.id)
      }
      
      throw error
    }

    // Schedule next batch processing (you might want to implement this with a queue system)
    console.log(`Batch processing completed for campaign ${campaignId}`)

  } catch (error) {
    console.error('Error processing batch:', error)
    throw error
  }
}

async function handleScheduleCheck(supabase: any, organizationId?: string) {
  console.log('Checking scheduled campaigns')
  
  try {
    const now = new Date()
    let query = supabase
      .from('call_campaigns')
      .select('*')
      .eq('status', 'pending')

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: campaigns, error } = await query

    if (error) {
      throw new Error(`Failed to get scheduled campaigns: ${error.message}`)
    }

    for (const campaign of campaigns || []) {
      try {
        await handleStartCampaign(supabase, campaign.id)
        console.log(`Started scheduled campaign: ${campaign.id}`)
      } catch (error) {
        console.error(`Failed to start scheduled campaign ${campaign.id}:`, error)
      }
    }

  } catch (error) {
    console.error('Error checking scheduled campaigns:', error)
    throw error
  }
}

async function handlePauseCampaign(supabase: any, campaignId: string) {
  console.log('Pausing campaign:', campaignId)
  
  try {
    const { error } = await supabase
      .from('call_campaigns')
      .update({
        status: 'cancelled'  // Use 'cancelled' instead of 'paused' since enum doesn't have 'paused'
      })
      .eq('id', campaignId)
      .eq('status', 'processing') // Only pause if currently processing

    if (error) {
      throw new Error(`Failed to pause campaign: ${error.message}`)
    }

    console.log('Campaign paused successfully:', campaignId)

  } catch (error) {
    console.error('Error pausing campaign:', error)
    throw error
  }
}

async function handleResumeCampaign(supabase: any, campaignId: string) {
  console.log('Resuming campaign:', campaignId)
  
  try {
    const { error } = await supabase
      .from('call_campaigns')
      .update({
        status: 'processing'
      })
      .eq('id', campaignId)
      .eq('status', 'cancelled') // Only resume if currently cancelled

    if (error) {
      throw new Error(`Failed to resume campaign: ${error.message}`)
    }

    // Continue processing the next batch
    await handleProcessBatch(supabase, campaignId, 10)

    console.log('Campaign resumed successfully:', campaignId)

  } catch (error) {
    console.error('Error resuming campaign:', error)
    throw error
  }
}