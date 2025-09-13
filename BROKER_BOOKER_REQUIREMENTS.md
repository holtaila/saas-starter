# Broker Booker - Complete Application Requirements

## Project Overview

**Broker Booker** is a comprehensive AI-powered call management platform designed as a multi-tenant B2B SaaS application. It enables businesses to create, manage, and monitor AI voice agents with visual workflow builders, real-time analytics, and CRM integrations.

### Key Value Propositions
- **AI Voice Agents**: Create intelligent voice agents powered by Retell AI
- **Multi-tenant Architecture**: Complete organization-based data isolation
- **Batch Calling**: Execute large-scale outbound call campaigns
- **CRM Integration**: Native Zoho CRM integration for appointment booking
- **Real-time Analytics**: Monitor call performance and agent effectiveness
- **Visual Workflow Builder**: Design complex call flows without code

## Core Technology Stack

### Frontend & Framework
- **Next.js 15.1.x** with App Router
- **TypeScript 5.7.x** for type safety
- **React 18.x** with Server Components
- **ShadCN UI Components** for consistent design system
- **Tailwind CSS** with Linear-inspired design system
- **Framer Motion** for animations

### Backend & Database
- **Supabase** (PostgreSQL with Row Level Security)
- **Drizzle ORM** for type-safe database operations
- **Supabase Auth** with JWT tokens
- **Row Level Security (RLS)** for multi-tenant data isolation

### AI & Voice Integration
- **Retell AI SDK v4.41.x** for voice agent management
- **Voice Configuration**: OpenAI voices (Alloy, Echo, etc.)
- **Conversation Flows**: Visual workflow builder
- **Real-time Call Processing**: WebSocket connections

### Background Jobs & Queue Management
- **Trigger.dev v3.x** for all background processing
- **Batch Call Processing**: Queue management for bulk operations
- **Token Refresh Jobs**: Automated OAuth token maintenance
- **Webhook Processing**: Reliable event handling
- **Email Notifications**: Campaign completion alerts

### Email Service
- **Resend** for transactional emails
- **React Email** for email templates
- **Campaign Notifications**: Completion alerts and reports

### CRM Integration
- **Zoho CRM OAuth Integration**: Organization-level tokens
- **Appointment Booking**: Real-time availability checks
- **Contact Synchronization**: Bidirectional data sync
- **Service & Staff Management**: Dynamic booking configuration

## Architecture Requirements

### Multi-tenant Security Architecture

#### Row Level Security (RLS)
- Every data table includes `organization_id` for tenant isolation
- Helper functions: `public.get_my_org_id()` and `public.is_org_admin()`
- Two Supabase clients:
  - `getBrowserSupabase()`: RLS-enabled for user operations
  - `getServiceSupabase()`: Service role for admin operations

#### Authentication & Authorization
- **JWT-based authentication** via Supabase Auth
- **Role-based access control**: admin, manager, viewer
- **Platform admin role** for super-admin access
- **Organization-scoped permissions**
- **Automatic session refresh**

### Database Schema Requirements

#### Core Tables
```sql
-- Organizations (tenant root)
organizations {
  id: uuid (PK)
  name: text
  stripe_customer_id: text
  subscription_status: text
  plan_tier: enum('starter', 'professional', 'enterprise')
  retell_api_key: text
  timezone: text
  usage_minutes_total: decimal
  usage_minutes_mtd: decimal
  usage_last_reset_at: timestamp
  created_at: timestamp
}

-- User profiles linked to auth.users
profiles {
  id: uuid (PK, FK to auth.users)
  organization_id: uuid (FK to organizations)
  role: enum('admin', 'manager', 'viewer')
  platform_role: enum('platform_admin')
  email: text
  created_at: timestamp
  updated_at: timestamp
}

-- AI Voice agents
agents {
  id: uuid (PK)
  organization_id: uuid (FK)
  name: text
  type: enum('sales', 'support', 'appointment', 'survey', 'custom')
  retell_agent_id: text
  workflow_config: jsonb
  prompt_template: text
  voice_config: jsonb
  status: enum('active', 'inactive', 'draft')
  created_at: timestamp
  updated_at: timestamp
}

-- Call records
calls {
  id: uuid (PK)
  organization_id: uuid (FK)
  agent_id: uuid (FK to agents)
  campaign_id: uuid (FK to call_campaigns)
  batch_call_id: uuid (FK to batch_calls)
  phone_number_id: uuid (FK to phone_numbers)
  retell_call_id: text
  retell_agent_id: text
  retell_batch_call_id: text
  phone_number: text
  crm_id: text
  status: enum('scheduled', 'in_progress', 'completed', 'failed')
  direction: enum('inbound', 'outbound')
  duration_seconds: integer
  cost: numeric
  recording_url: text
  transcript: text
  metadata: jsonb
  risk_score: numeric
  risk_factors: jsonb
  started_at: timestamp
  ended_at: timestamp
  created_at: timestamp
}

-- Campaign management
call_campaigns {
  id: uuid (PK)
  organization_id: uuid (FK)
  agent_id: uuid (FK to agents)
  created_by: uuid (FK to auth.users)
  name: text
  csv_file_url: text
  total_numbers: integer
  processed_numbers: integer
  status: enum('pending', 'processing', 'completed', 'failed')
  trigger_job_id: text
  created_at: timestamp
}

-- Batch calls (Retell integration)
batch_calls {
  id: uuid (PK)
  organization_id: uuid (FK)
  campaign_id: uuid (FK to call_campaigns)
  agent_id: uuid (FK to agents)
  phone_number_id: uuid (FK to phone_numbers)
  retell_batch_call_id: text
  batch_name: text
  from_number: text
  total_task_count: integer
  status: enum('scheduled', 'processing', 'completed', 'failed', 'cancelled')
  scheduled_timestamp: timestamp
  reserved_concurrency: integer
  created_at: timestamp
  updated_at: timestamp
}

-- Phone number management
phone_numbers {
  id: uuid (PK)
  phone_number: text
  display_name: text
  retell_phone_number_id: text
  retell_inbound_agent_id: text
  retell_outbound_agent_id: text
  status: enum('active', 'inactive', 'pending')
  created_at: timestamp
}

-- Phone number assignments (many-to-many)
organization_phone_assignments {
  id: uuid (PK)
  organization_id: uuid (FK)
  phone_number_id: uuid (FK)
  is_primary: boolean
  assigned_at: timestamp
}

-- Appointments from calls
appointments {
  id: uuid (PK)
  call_id: uuid (FK to calls)
  organization_id: uuid (FK)
  contact_name: text
  contact_phone: text
  scheduled_time: timestamp
  status: enum('scheduled', 'confirmed', 'cancelled', 'completed')
  notes: text
  created_at: timestamp
}

-- Email preferences
email_preferences {
  id: uuid (PK)
  organization_id: uuid (FK)
  email_on_campaign_complete: boolean
  recipient_emails: text[]
  created_at: timestamp
  updated_at: timestamp
}

-- Usage tracking and billing
usage_history {
  id: uuid (PK)
  organization_id: uuid (FK)
  call_id: uuid (FK)
  minutes_used: decimal
  cost_cents: integer
  call_started_at: timestamp
  call_ended_at: timestamp
  created_at: timestamp
}
```

#### Zoho CRM Integration Tables
```sql
-- Zoho OAuth credentials (per organization)
zoho_credentials {
  id: uuid (PK)
  organization_id: uuid (FK)
  client_id: text
  client_secret: text
  redirect_uri: text
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}

-- Zoho access tokens
zoho_tokens {
  id: uuid (PK)
  organization_id: uuid (FK)
  access_token: text
  refresh_token: text
  token_type: text
  expires_at: timestamp
  scope: text
  status: enum('active', 'expired', 'revoked')
  zoho_user_id: text
  created_at: timestamp
  updated_at: timestamp
}

-- Booking requests
booking_requests {
  id: uuid (PK)
  organization_id: uuid (FK)
  call_id: uuid (FK)
  zoho_service_id: text
  zoho_staff_id: text
  zoho_resource_id: text
  zoho_booking_id: text
  customer_name: text
  customer_email: text
  customer_phone: text
  appointment_time: timestamp
  duration_minutes: integer
  notes: text
  status: enum('pending', 'success', 'failed', 'cancelled')
  retell_function_call_id: text
  request_payload: jsonb
  response_payload: jsonb
  error_message: text
  requested_at: timestamp
  completed_at: timestamp
  created_at: timestamp
}

-- Cached Zoho services
zoho_services {
  id: uuid (PK)
  organization_id: uuid (FK)
  zoho_service_id: text
  service_name: text
  description: text
  duration_minutes: integer
  price: numeric
  currency: text
  is_active: boolean
  last_synced_at: timestamp
  created_at: timestamp
}

-- Cached Zoho staff
zoho_staff {
  id: uuid (PK)
  organization_id: uuid (FK)
  zoho_staff_id: text
  staff_name: text
  email: text
  phone: text
  is_active: boolean
  last_synced_at: timestamp
  created_at: timestamp
}
```

## Feature Requirements

### 1. Agent Management

#### Agent Creation & Configuration
- **Custom Agent Creation**: Build from scratch with custom prompts
- **Voice Configuration**: Select from available Retell AI voices
- **Workflow Builder**: Visual conversation flow designer
- **Status Management**: Draft, Active, Inactive states
- **Retell Integration**: Automatic sync with Retell AI platform

> **Note**: Agent Templates System is NOT included in this rebuild. All agents will be created manually with custom configurations. This feature is being deliberately ignored for the initial rebuild to focus on core functionality.

### 2. Call Management

#### Inbound Calls
- **Real-time Call Handling**: WebSocket connections for live updates
- **Agent Assignment**: Automatic routing to configured agents
- **Call Recording**: Automatic recording and storage
- **Transcript Generation**: Real-time transcription
- **Call Analytics**: Performance metrics and insights

#### Outbound Calls
- **Individual Calls**: Single phone number calling
- **Batch Campaigns**: Bulk calling with CSV uploads
- **Call Scheduling**: Immediate or scheduled execution
- **Concurrency Control**: Configurable parallel call limits
- **Progress Tracking**: Real-time campaign monitoring

### 3. Batch Call Campaigns (CRITICAL - Complex Retell Integration)

This is one of the most complex and crucial features of the application. The implementation requires sophisticated CSV processing, phone number management, Retell AI batch integration, and real-time monitoring.

#### Campaign Creation Flow

##### CSV Upload & Processing System
```typescript
// RFC 4180 compliant CSV parser with advanced features
- **Multi-line Field Support**: Handle quoted fields with embedded newlines
- **Escaped Quote Handling**: Proper handling of "" within quoted fields
- **Header Normalization**: Lowercase and trim headers for consistency
- **Empty Row Filtering**: Skip completely empty rows
- **Error Location Tracking**: Precise row/column error reporting
```

**Required CSV Format:**
```csv
phone_number,crm_id,customer_name,appointment_type,callback_time
+14157774444,CRM123,John Doe,Consultation,2024-01-15 14:00
+15551234567,CRM456,Jane Smith,Follow-up,2024-01-16 10:00
```

**Required Columns:**
- `phone_number`: E.164 format (automatically validated/formatted)
- `crm_id`: Unique identifier for the contact

**Optional Dynamic Columns:**
- Any additional columns become dynamic variables injected into calls
- System auto-injects: `current_date`, `current_day`

##### Advanced Phone Number Validation
```typescript
// Comprehensive phone number processing
export function formatToE164(phoneNumber: string): string {
  // Auto-format: (415) 555-1234 → +14155551234
  // Auto-format: 415-555-1234 → +14155551234  
  // Auto-format: 4155551234 → +14155551234
  // Handle international: 447700123456 → +447700123456
}

// Test number detection (Retell requires real numbers)
- Detect +1555XXXXXXX patterns (common test numbers)
- Detect +1123XXXXXXX patterns
- Block fake/test numbers to prevent Retell errors
```

**Phone Number Processing Logic:**
1. **Format Detection**: Auto-detect US, international formats
2. **E.164 Conversion**: Automatic conversion to +1XXXXXXXXXX format
3. **Validation**: Regex validation for proper E.164 structure
4. **Test Number Detection**: Block obvious fake/test numbers
5. **Error Reporting**: Precise row-level error messages

#### Phone Number Assignment & Validation

##### Organization Phone Management
```typescript
// Complex phone number assignment logic
interface PhoneNumberAssignment {
  organization_id: string
  phone_number_id: string
  is_primary: boolean        // Only one primary per organization
  retell_outbound_agent_id: string  // REQUIRED for batch calls
}
```

**Assignment Validation Process:**
1. **Primary Phone Lookup**: Find organization's primary phone number
2. **Retell Configuration Check**: Verify outbound agent is configured
3. **Status Validation**: Ensure phone number is active
4. **Fallback Logic**: Handle missing primary phone scenarios
5. **Error Messaging**: Detailed error messages for phone issues

##### Critical Phone Number Error Handling
```typescript
// Sophisticated error handling for phone assignment
if (!primaryPhone) {
  // Check if ANY phones assigned to organization
  const anyPhones = await supabase
    .from('phone_numbers')  
    .select('*')
    .eq('organization_phone_assignments.organization_id', orgId)
    
  if (anyPhones.length === 0) {
    throw new Error('No phone numbers assigned to organization')
  } else {
    throw new Error(`Phones exist but none marked as primary: ${anyPhones.map(p => p.display_name).join(', ')}`)
  }
}
```

#### Retell AI Batch Call Integration

##### Batch Call Creation Process
```typescript
// Complex Retell batch call setup
interface RetellBatchCallPayload {
  from_number: string              // Organization's primary phone (+E.164)
  name: string                     // Campaign name with timestamp
  tasks: RetellCallTask[]          // Individual call tasks
  reserved_concurrency?: number   // Concurrency control (1-5)
  scheduled_timestamp?: number    // Future scheduling
}

interface RetellCallTask {
  to_number: string                    // Target phone number (E.164)
  retell_llm_dynamic_variables: {      // Dynamic data for AI agent
    customer_name?: string
    appointment_type?: string
    current_date: string             // Auto-injected
    current_day: string              // Auto-injected
    [key: string]: string            // Any CSV column data
  }
}
```

##### Concurrency Control Logic
```typescript
// Retell concurrency calculation (complex but crucial)
const RETELL_MAX_CONCURRENCY = 20
const userRequestedSlots = 2              // User wants 2 concurrent calls
const apiConcurrency = 20 - 2             // Send 18 to reserve 18 for "others"
// Result: 2 slots for batch calling, 18 reserved for inbound/other calls
```

##### Batch Call Error Handling
```typescript
// Comprehensive Retell error handling
try {
  const batchCallResponse = await retellClient.batchCall.createBatchCall(payload)
} catch (error) {
  // Handle specific error types:
  - 'not a valid number': Invalid phone number format
  - 'agent': Missing outbound agent configuration  
  - 'from_number': Phone number not registered with Retell
  - Timeout (25 seconds): Prevent infinite spinner
  - Rate limiting: Handle Retell API limits
}
```

#### Database Integration & State Management

##### Campaign State Tracking
```sql
-- Campaign status flow
CREATE TYPE campaign_status AS ENUM (
  'pending',      -- Created but not started
  'processing',   -- Batch call active in Retell
  'completed',    -- All calls finished
  'failed'        -- Campaign encountered errors
);
```

##### Call Record Management
```typescript
// Complex call record creation
interface CallRecord {
  // Database linking
  campaign_id: string              // Link to call_campaigns
  batch_call_id: string           // Link to batch_calls table  
  retell_batch_call_id: string    // Retell's external batch ID
  
  // Phone and agent info
  phone_number: string            // Target number (TO number)
  agent_id: string               // Internal agent ID
  retell_agent_id: string        // Retell's agent ID
  
  // Dynamic metadata storage
  metadata: {
    campaign_name: string
    phone_number_id: string       // Which org phone was used
    source: 'batch_upload'
    batch_call_created: boolean   // Success flag
    // All dynamic variables from CSV
  }
}
```

##### Batch Call Constraints
```sql
-- Critical database constraint for data integrity
ALTER TABLE calls ADD CONSTRAINT calls_batch_consistency 
  CHECK (
    (retell_batch_call_id IS NULL AND batch_call_id IS NULL) OR
    (retell_batch_call_id IS NOT NULL AND batch_call_id IS NOT NULL)
  );
```

#### Real-time Campaign Monitoring

##### WebSocket Event System
```typescript
// Comprehensive real-time event types
export enum CallStatus {
  PENDING = 'pending',           // Call created, not started
  QUEUED = 'queued',            // Queued in batch
  DIALING = 'dialing',          // Retell dialing
  RINGING = 'ringing',          // Phone ringing
  CONNECTED = 'connected',      // Call connected
  IN_PROGRESS = 'in_progress',  // Active call
  ANALYZING = 'analyzing',      // Call ended, analyzing
  COMPLETED = 'completed',      // Fully processed
  FAILED = 'failed',           // Failed to connect
  CANCELLED = 'cancelled'       // Cancelled
}

// Real-time campaign events
interface CampaignEvent {
  type: 'campaign_progress' | 'campaign_completed'
  campaignId: string
  data: {
    total_numbers: number
    processed_numbers: number
    completed_calls: number
    failed_calls: number
    success_rate: number
    estimated_completion?: string
  }
}
```

##### Progress Calculation Logic
```typescript
// Sophisticated progress tracking
export function useRealtimeCampaignProgress(campaignId: string) {
  const handleCampaignUpdate = (campaignData) => {
    // Calculate percentage
    const percentage = (processed / total) * 100
    
    // Estimate completion time
    const callsPerMs = callsDiff / timeDiff
    const remainingCalls = total - processed  
    const remainingMs = remainingCalls / callsPerMs
    const estimatedTime = formatDuration(remainingMs)
  }
}
```

#### Campaign Completion & Notifications

##### Completion Detection Logic
```typescript
// Webhook-driven completion detection
export async function handleCallCompleted(callData: RetellWebhook) {
  // 1. Update call record
  await updateCallRecord(callData)
  
  // 2. Check campaign completion
  const { count: completedCount } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .eq('status', 'completed')
    
  // 3. Update campaign if all calls complete
  if (completedCount >= campaign.total_numbers) {
    await updateCampaignStatus(campaignId, 'completed')
    await triggerCompletionNotifications(campaignId)
  }
}
```

##### Email Notification System (Resend Integration)
```typescript
// Comprehensive email notifications
export async function sendCampaignCompletionEmail({
  campaignId,
  batchId, 
  organizationId
}) {
  // 1. Gather campaign statistics
  const stats = await calculateCampaignStats(campaignId)
  
  // 2. Generate email content
  const emailContent = createCampaignCompletionEmail({
    campaignName: campaign.name,
    totalCalls: stats.totalCalls,
    completedCalls: stats.completedCalls,
    successfulCalls: stats.successfulCalls,
    callbackCount: stats.callbackRequests,
    avgDuration: stats.avgDuration,
    campaignUrl: `${appUrl}/campaigns/${campaignId}`,
    exportUrl: `${appUrl}/api/campaigns/${campaignId}/export`
  })
  
  // 3. Send via Resend
  await resend.emails.send({
    from: 'Broker Booker <notifications@brokerbooter.com>',
    to: campaignCreatorEmail,
    subject: emailContent.subject,
    text: emailContent.text
  })
}
```

**Email Template Types:**
- **Campaign Started**: Immediate confirmation when batch call begins
- **Campaign Completed**: Full statistics and results summary  
- **Campaign Failed**: Error details and retry options
- **Progress Updates**: Periodic status updates for long campaigns

#### Webhook Integration & State Synchronization

##### Retell Webhook Processing
```typescript
// Complex webhook event handling
export async function handleRetellWebhook(event: RetellWebhookEvent) {
  switch (event.event) {
    case 'call_started':
      // Find existing call record (from batch creation)
      // Update with retell_call_id and status
      await linkWebhookToCallRecord(event.call)
      break
      
    case 'call_analyzed':  // Call completed with AI analysis
      // Update call with transcript, analysis, metadata
      // Trigger campaign completion check
      // Send notifications if campaign complete
      await processCallCompletion(event.call)
      break
  }
}
```

##### Call Record Linking Logic
```typescript
// Complex call record matching for webhooks
async function findCallRecordForWebhook(webhookData) {
  // Try multiple matching strategies:
  
  // 1. Match by retell_call_id (if already linked)
  let call = await findByRetellCallId(webhookData.call_id)
  
  // 2. Match by phone number + batch ID (batch calls)
  if (!call && webhookData.batch_call_id) {
    call = await findByPhoneAndBatch(
      webhookData.to_number,
      webhookData.batch_call_id
    )
  }
  
  // 3. Handle phone number format mismatches
  if (!call) {
    call = await findWithPhoneNormalization(webhookData.to_number)
  }
  
  // 4. Emergency call record creation if not found
  if (!call && hasRequiredData(webhookData)) {
    call = await createEmergencyCallRecord(webhookData)
  }
}
```

#### Campaign Analytics & Reporting

##### Statistics Calculation
```typescript
// Comprehensive campaign statistics
interface CampaignStats {
  totalCalls: number
  completedCalls: number              // Successfully connected
  successfulCalls: number             // AI marked as successful
  failedCalls: number                 // Failed to connect
  callbackRequests: number            // Customers requesting callbacks
  avgDuration: number                 // Average call duration
  totalCost: number                   // Cost in cents ($0.25/minute)
  successRate: number                 // Percentage successful
  completionRate: number              // Percentage completed
  
  // Advanced metrics
  appointmentsBooked: number          // Via Zoho integration
  callbacksScheduled: number          // Manual follow-ups needed
  sentimentAnalysis: {               // From Retell AI analysis
    positive: number
    neutral: number  
    negative: number
  }
}
```

##### Data Export System
```typescript
// Campaign results export to CSV
export async function exportCampaignResults(campaignId: string) {
  const calls = await getCampaignCalls(campaignId)
  
  const csvData = calls.map(call => ({
    phone_number: call.phone_number,
    status: call.status,
    duration_seconds: call.duration_seconds,
    call_successful: call.metadata?.call_analysis?.call_successful,
    user_sentiment: call.metadata?.call_analysis?.user_sentiment,
    call_summary: call.metadata?.call_analysis?.call_summary,
    recording_url: call.recording_url,
    // All dynamic variables from original CSV
    ...extractDynamicVariables(call.metadata)
  }))
  
  return generateCSV(csvData)
}
```

#### Campaign Cleanup & Maintenance

##### Stuck Campaign Detection
```typescript
// Cleanup campaigns stuck in processing status
export async function cleanupStuckCampaigns() {
  // Find campaigns processing > 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  
  const stuckCampaigns = await supabase
    .from('call_campaigns')
    .select('*')
    .eq('status', 'processing')
    .lt('created_at', oneHourAgo.toISOString())
    
  for (const campaign of stuckCampaigns) {
    // Check if Retell batch is actually complete
    const retellStatus = await checkRetellBatchStatus(campaign.retell_batch_call_id)
    
    if (retellStatus === 'completed') {
      await updateCampaignStatus(campaign.id, 'completed')
    } else if (retellStatus === 'failed') {
      await updateCampaignStatus(campaign.id, 'failed')
    }
  }
}
```

#### Trigger.dev Integration Requirements

##### Campaign Processing Jobs
```typescript
// Batch campaign processing job
export const processBatchCampaign = task({
  id: "process-batch-campaign",
  run: async (payload: { campaignId: string }) => {
    // 1. Validate campaign and contacts
    const { campaign, contacts } = await validateCampaignData(payload.campaignId)
    
    // 2. Get organization's primary phone number
    const primaryPhone = await getOrganizationPrimaryPhone(campaign.organization_id)
    
    // 3. Create Retell batch call
    const retellBatch = await createRetellBatchCall({
      from_number: primaryPhone.phone_number,
      tasks: contacts.map(contact => ({
        to_number: contact.phone_number,
        retell_llm_dynamic_variables: {
          ...contact,
          current_date: new Date().toISOString().split('T')[0],
          current_day: dayNames[new Date().getDay()]
        }
      }))
    })
    
    // 4. Store batch call record and individual call records  
    await storeBatchCallRecords(campaign, retellBatch, contacts)
    
    // 5. Monitor progress and send notifications
    await monitorCampaignProgress(campaign.id)
  }
});
```

**Additional Trigger.dev Jobs:**
- **Campaign Status Monitor**: Check for webhook delivery failures
- **Retry Failed Calls**: Retry calls that failed due to temporary issues  
- **Analytics Aggregation**: Calculate campaign statistics
- **Cleanup Jobs**: Remove old campaign data
- **Export Generation**: Generate campaign result exports

#### Error Handling & Recovery

##### Comprehensive Error Scenarios
1. **CSV Upload Errors**
   - Invalid phone number formats → Detailed validation errors
   - Missing required columns → Specific column requirements
   - File parsing errors → Line/column error location

2. **Phone Number Configuration Errors**  
   - No primary phone → List available phones, prompt admin
   - Phone not active → Show status, provide resolution steps
   - Missing outbound agent → Retell configuration guide

3. **Retell API Errors**
   - Invalid phone numbers → Real number requirement explanation
   - Agent configuration → Phone/agent mapping issues
   - Rate limiting → Retry with backoff
   - Timeout → 25-second timeout with user messaging

4. **Database Constraints**
   - Batch consistency errors → Emergency call record creation
   - RLS policy violations → Permission error handling
   - Unique constraint violations → Duplicate campaign name handling

5. **Real-time Connection Errors**
   - WebSocket disconnection → Automatic reconnection with exponential backoff
   - Event delivery failures → Event queuing and retry
   - Authentication failures → Token refresh and reconnection

### 4. Phone Number Management

#### Phone Number System
- **Multi-tenant Assignment**: Organizations can have multiple numbers
- **Primary Number Selection**: Default number for outbound calls
- **Retell Integration**: Sync with Retell AI phone numbers
- **Agent Configuration**: Inbound/outbound agent assignment
- **Status Management**: Active/Inactive number states

#### Assignment Logic
- **Organization Assignment**: Many-to-many relationship
- **Primary Number Logic**: One primary per organization
- **Agent Mapping**: Inbound and outbound agent configuration
- **Availability Checking**: Real-time status validation

### 5. Webhook Processing

#### Retell AI Webhooks
- **Call Events**: call.started, call.ended, call.analyzed
- **Signature Verification**: Security validation
- **Database Sync**: Update call records from webhook data
- **Real-time Updates**: Broadcast events to frontend
- **Error Recovery**: Handle webhook delivery failures

#### Event Broadcasting
- **Organization-scoped Events**: Real-time updates per tenant
- **Campaign Events**: Progress and completion notifications
- **Call Status Changes**: Live call monitoring
- **Analytics Updates**: Dashboard refresh triggers

### 6. Zoho CRM Integration

#### OAuth Configuration
- **Organization-level Setup**: Per-tenant OAuth credentials
- **Token Management**: Automatic refresh and storage
- **Scope Configuration**: Booking and contact permissions
- **Error Handling**: Graceful authentication failures

#### Appointment Booking
- **Service Availability**: Real-time Zoho service lookup
- **Staff Scheduling**: Available staff member checking
- **Booking Creation**: Direct appointment creation in Zoho
- **Confirmation Handling**: Booking status management
- **Error Recovery**: Failed booking retry logic

#### Data Synchronization
- **Service Caching**: Local storage of Zoho services
- **Staff Caching**: Local storage of staff information
- **Incremental Sync**: Efficient data updates
- **Conflict Resolution**: Handle data inconsistencies

#### Background Jobs (Trigger.dev)
- **Token Refresh**: Every 50 minutes token renewal
- **Data Sync**: Regular service/staff updates
- **Booking Retries**: Failed booking processing
- **Cleanup Tasks**: Remove stale data

### 7. User Interface Requirements

#### Design System
- **Linear-inspired Design**: Minimal, functional aesthetic
- **ShadCN Components**: Consistent UI component library
- **Tailwind CSS**: Utility-first styling approach
- **13px Base Font**: Inter font family
- **Subtle Shadows**: Minimal visual hierarchy
- **4px Grid System**: Consistent spacing

#### Dashboard Components
- **Real-time Metrics**: Live updating statistics
- **Campaign Overview**: Active campaign monitoring
- **Call Analytics**: Performance visualizations
- **Agent Status**: Agent health monitoring
- **Recent Activity**: Timeline of recent events

#### Agent Management Interface
- **Agent List View**: Sortable and filterable agent grid
- **Agent Detail View**: Comprehensive agent information
- **Workflow Builder**: Visual conversation flow editor
- **Voice Selector**: Available voice options

#### Campaign Management Interface
- **Campaign Creation**: Step-by-step campaign setup
- **CSV Upload**: Drag-and-drop file interface
- **Progress Monitoring**: Real-time campaign tracking
- **Results Dashboard**: Campaign outcome visualization
- **Call Details**: Individual call result exploration

#### Settings Interface
- **Organization Settings**: Company configuration
- **User Management**: Team member administration
- **Phone Numbers**: Number assignment interface
- **Zoho Integration**: CRM connection management
- **Email Preferences**: Notification configuration

### 8. API Routes & Endpoints

#### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User authentication
- `POST /api/auth/signout` - Session termination
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/ensure-profile` - Profile creation
- `POST /api/auth/setup-organization` - Organization setup

#### Agent Management Endpoints
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `GET /api/agents/[id]` - Get agent details
- `PUT /api/agents/[id]` - Update agent
- `DELETE /api/agents/[id]` - Delete agent
- `POST /api/agents/[id]/sync` - Sync with Retell
- `GET /api/agents/[id]/calls` - Agent call history
- `GET /api/agents/[id]/campaigns` - Agent campaigns

#### Call Management Endpoints
- `GET /api/calls` - List calls
- `POST /api/calls` - Create individual call
- `GET /api/calls/[id]` - Get call details
- `PUT /api/calls/[id]` - Update call
- `POST /api/calls/bulk` - Create batch campaign
- `POST /api/calls/sync` - Sync with Retell
- `GET /api/calls/campaigns/[id]` - Campaign details

#### Phone Number Endpoints
- `GET /api/phone-numbers` - List phone numbers
- `POST /api/phone-numbers` - Add phone number
- `PUT /api/phone-numbers/[id]` - Update phone number
- `DELETE /api/phone-numbers/[id]` - Remove phone number
- `POST /api/phone-numbers/[id]/assign` - Assign to organization

#### Webhook Endpoints
- `POST /api/webhooks/retell` - Retell AI webhook handler
- `POST /api/webhooks/zoho` - Zoho CRM webhook handler

#### Zoho Integration Endpoints
- `GET /api/zoho/status` - Connection status
- `POST /api/zoho/connect` - Initiate OAuth flow
- `GET /api/zoho/callback` - OAuth callback handler
- `POST /api/zoho/disconnect` - Revoke tokens
- `GET /api/zoho/services` - List services
- `GET /api/zoho/staff` - List staff
- `POST /api/zoho/book` - Create appointment

#### Admin Endpoints
- `GET /api/admin/organizations` - List all organizations
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/impersonate` - User impersonation
- `GET /api/admin/analytics` - Platform analytics

### 9. Background Job Requirements (Trigger.dev)

#### Job Categories
- **Webhook Processing**: Handle inbound webhooks reliably
- **Batch Operations**: Process large-scale campaigns
- **Token Management**: OAuth token refresh and maintenance
- **Data Synchronization**: CRM data sync and caching
- **Notification Delivery**: Email alerts and reports
- **Cleanup Tasks**: Data maintenance and garbage collection

#### Specific Jobs

##### Batch Call Processing
```typescript
// Process bulk call campaigns
export const processBatchCampaign = task({
  id: "process-batch-campaign",
  run: async (payload: { campaignId: string }) => {
    // 1. Retrieve campaign and contacts
    // 2. Validate phone numbers
    // 3. Create Retell batch call
    // 4. Monitor progress
    // 5. Update database with results
    // 6. Send completion notifications
  }
});
```

##### Zoho Token Refresh
```typescript
// Refresh expiring Zoho tokens
export const zohoTokenRefresh = schedules.task({
  id: "zoho-token-refresh",
  cron: "0 */50 * * * *", // Every 50 minutes
  run: async () => {
    // 1. Find expiring tokens
    // 2. Refresh using Zoho OAuth
    // 3. Update database
    // 4. Handle failures
  }
});
```

##### Webhook Event Processing
```typescript
// Process Retell webhooks reliably
export const processRetellWebhook = task({
  id: "process-retell-webhook",
  retry: {
    maxAttempts: 3,
    factor: 2,
    randomize: true
  },
  run: async (payload: { event: string, data: any }) => {
    // 1. Validate webhook signature
    // 2. Update call records
    // 3. Broadcast real-time events
    // 4. Update campaign status
    // 5. Handle billing updates
  }
});
```

##### Campaign Completion Notifications
```typescript
// Send email notifications for completed campaigns
export const sendCampaignNotification = task({
  id: "send-campaign-notification",
  run: async (payload: { campaignId: string }) => {
    // 1. Generate campaign report
    // 2. Get email preferences
    // 3. Send via Resend
    // 4. Log delivery status
  }
});
```

### 10. Real-time Features

#### WebSocket Events
- **Call Status Updates**: Live call monitoring
- **Campaign Progress**: Real-time batch progress
- **Agent Status**: Agent availability changes
- **Dashboard Metrics**: Live analytics updates
- **System Notifications**: Error alerts and warnings

#### Event Broadcasting System
- **Organization Channels**: Tenant-scoped events
- **Campaign Channels**: Campaign-specific updates
- **User Channels**: Personal notifications
- **Admin Channels**: Platform-wide alerts

### 11. Security Requirements

#### Data Protection
- **Row Level Security**: Database-level tenant isolation
- **JWT Token Validation**: Secure API access
- **Webhook Signature Verification**: Prevent replay attacks
- **API Rate Limiting**: Prevent abuse
- **Sensitive Data Encryption**: Encrypt API keys and tokens

#### Access Control
- **Role-based Permissions**: Admin, Manager, Viewer roles
- **Organization Scoping**: Strict tenant boundaries
- **Platform Admin Access**: Super-admin capabilities
- **API Key Management**: Secure credential storage
- **Audit Logging**: Track sensitive operations

### 12. Monitoring & Analytics

#### Application Monitoring
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: API response times
- **Usage Analytics**: Feature adoption metrics
- **Real-time Dashboards**: System health monitoring

#### Business Analytics
- **Call Success Rates**: Agent performance metrics
- **Campaign Effectiveness**: Conversion tracking
- **Usage Patterns**: Customer behavior insights
- **Revenue Tracking**: Per-minute billing analytics

### 13. Deployment Requirements

#### Infrastructure
- **Vercel Hosting**: Next.js application deployment
- **Supabase Database**: Managed PostgreSQL instance
- **Trigger.dev Workers**: Background job processing
- **Resend Email**: Transactional email delivery
- **CDN**: Static asset distribution

#### Environment Configuration
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Retell AI
RETELL_API_KEY=
RETELL_WEBHOOK_SECRET=

# Trigger.dev
TRIGGER_API_KEY=
TRIGGER_API_URL=

# Resend
RESEND_API_KEY=

# Application
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

#### Scaling Considerations
- **Database Connection Pooling**: Handle concurrent requests
- **Background Job Scaling**: Auto-scaling workers
- **CDN Configuration**: Global asset delivery
- **Monitoring Setup**: Health checks and alerts

## Technical Implementation Notes

### Database Migrations
- Use Drizzle ORM for schema management
- Implement versioned migration system
- Include data seeding for initial setup
- Handle backward compatibility

### Error Handling
- Implement comprehensive error boundaries
- Use structured error logging
- Provide user-friendly error messages
- Include retry mechanisms for transient failures

### Performance Optimization
- Implement database query optimization
- Use React Server Components where applicable
- Implement proper caching strategies
- Optimize API response times

### Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Mock external dependencies (Retell, Zoho)

This comprehensive requirements document provides the complete specification for rebuilding the Broker Booker application with Trigger.dev handling all background operations, Resend for email delivery, ShadCN for UI components, and maintaining all existing functionality while improving reliability and scalability.