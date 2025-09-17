# Supabase Edge Functions

This project uses Supabase Edge Functions to handle webhooks and campaign processing in a distributed, scalable manner.

## Overview

Edge Functions provide several advantages over traditional API routes:
- **Global distribution**: Run closer to your users
- **Isolation**: Each function runs in its own secure environment
- **Scalability**: Automatically scale based on demand
- **Performance**: Lower latency for webhook processing

## Available Functions

### 1. Retell Webhook (`retell-webhook`)

Handles incoming webhooks from Retell AI for call events.

**Events handled:**
- `call_started` - Updates call status and campaign contacts
- `call_ended` - Finalizes call data, updates campaign statistics
- `call_analyzed` - Processes call transcripts and analysis data

**URL:** `https://your-project.supabase.co/functions/v1/retell-webhook`

**Headers required:**
- `x-retell-signature`: Webhook signature for verification
- `Content-Type: application/json`

### 2. Campaign Trigger (`campaign-trigger`)

Manages campaign lifecycle and batch processing.

**Actions supported:**
- `start_campaign` - Initiates a campaign
- `process_batch` - Processes a batch of contacts
- `pause_campaign` - Pauses an active campaign
- `resume_campaign` - Resumes a paused campaign
- `schedule_check` - Checks for scheduled campaigns to start

**URL:** `https://your-project.supabase.co/functions/v1/campaign-trigger`

## Local Development

### Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Make sure you have your environment variables set up in `.env.local`:
   ```env
   RETELL_API_KEY=your-retell-api-key
   RETELL_WEBHOOK_SECRET=your-webhook-secret
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Starting Local Development

Start all Supabase services including Edge Functions:
```bash
pnpm functions:dev
```

This will start:
- Database on `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- API on `http://127.0.0.1:54321`
- Edge Functions on `http://127.0.0.1:54321/functions/v1/`
- Studio on `http://127.0.0.1:54323`

### Testing Edge Functions Locally

#### Test Retell Webhook:
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/retell-webhook \
  -H 'Content-Type: application/json' \
  -H 'x-retell-signature: your-webhook-secret' \
  -d '{
    "event_type": "call_started",
    "data": {
      "call_id": "test-123",
      "agent_id": "agent-456",
      "direction": "outbound",
      "from_number": "+1234567890",
      "to_number": "+0987654321"
    }
  }'
```

#### Test Campaign Trigger:
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/campaign-trigger \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "start_campaign",
    "campaign_id": "your-campaign-id"
  }'
```

## Deployment

### Deploy All Functions
```bash
pnpm functions:deploy
```

### Deploy to Production
```bash
pnpm functions:deploy:prod
```

### Deploy Individual Functions
```bash
pnpm functions:deploy:retell
pnpm functions:deploy:campaign
```

### Manual Deployment
```bash
# Deploy specific function
supabase functions deploy retell-webhook --project-ref your-project-ref

# Deploy all functions
supabase functions deploy --project-ref your-project-ref
```

## Environment Variables

Set these environment variables in Supabase Dashboard > Project Settings > Edge Functions:

### Required for all functions:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

### Required for retell-webhook:
- `RETELL_WEBHOOK_SECRET` - Secret for webhook signature verification

### Required for campaign-trigger:
- `RETELL_API_KEY` - Retell AI API key for making outbound calls

## Integration with App

The app uses Edge Functions through the helper functions in `lib/config/edge-functions.ts`:

```typescript
import { campaignTriggers } from '@/lib/config/edge-functions'

// Start a campaign
await campaignTriggers.startCampaign('campaign-id')

// Pause a campaign
await campaignTriggers.pauseCampaign('campaign-id')

// Process a batch
await campaignTriggers.processBatch('campaign-id', 10)
```

## Error Handling

Edge Functions include comprehensive error handling and logging:

- All errors are logged to Supabase Edge Function logs
- Failed operations don't crash the entire system
- Graceful degradation for missing data or API failures
- Proper HTTP status codes for different error types

## Monitoring

Monitor your Edge Functions through:
- **Supabase Dashboard**: View logs, invocation count, and errors
- **Application logs**: Edge Functions log important events
- **Database monitoring**: Track campaign and call status changes

## Security

Edge Functions implement several security measures:
- **Webhook signature verification**: Validates incoming Retell webhooks
- **Row Level Security**: All database operations respect RLS policies  
- **Service role isolation**: Functions use service role for system operations
- **CORS handling**: Proper CORS headers for web client integration

## Best Practices

1. **Idempotency**: Functions handle duplicate calls gracefully
2. **Batch processing**: Campaign processing uses batches to avoid overwhelming APIs
3. **Error resilience**: Failed contacts don't stop campaign processing
4. **Logging**: Comprehensive logging for debugging and monitoring
5. **Testing**: Always test locally before deploying to production

## Troubleshooting

### Common Issues:

1. **Function not found**: Make sure it's deployed and the URL is correct
2. **Authorization errors**: Check that environment variables are set correctly
3. **Database errors**: Verify RLS policies and service role permissions
4. **Webhook signature errors**: Ensure `RETELL_WEBHOOK_SECRET` matches Retell configuration

### Debug Logs:
```bash
# View function logs
supabase functions logs --project-ref your-project-ref

# View specific function logs
supabase functions logs retell-webhook --project-ref your-project-ref
```