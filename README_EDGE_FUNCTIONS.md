# Supabase Edge Functions Implementation

This project now includes Supabase Edge Functions for handling webhooks and campaign processing in a distributed, scalable manner.

## Quick Start

### 1. Local Development

```bash
# Start local Supabase with Edge Functions
pnpm functions:dev

# Test Edge Functions locally
pnpm functions:test
```

### 2. Deployment

```bash
# Deploy all Edge Functions to staging
pnpm functions:deploy

# Deploy to production
pnpm functions:deploy:prod

# Deploy specific function
pnpm functions:deploy:retell
```

### 3. Testing

```bash
# Test locally
pnpm functions:test

# Test staging
pnpm functions:test:staging

# Test production  
pnpm functions:test:prod
```

## Available Edge Functions

### 🔗 Retell Webhook (`retell-webhook`)

Handles incoming webhooks from Retell AI for real-time call event processing.

**URL:** `https://your-project.supabase.co/functions/v1/retell-webhook`

**Events:**
- `call_started` - Updates call status, links to campaign contacts
- `call_ended` - Finalizes call data, updates campaign statistics  
- `call_analyzed` - Processes transcripts and call analysis

### 🎯 Campaign Trigger (`campaign-trigger`)

Manages campaign lifecycle and batch processing for outbound calls.

**URL:** `https://your-project.supabase.co/functions/v1/campaign-trigger`

**Actions:**
- `start_campaign` - Initiates a campaign and begins processing contacts
- `process_batch` - Processes a batch of contacts (default: 10)
- `pause_campaign` - Pauses an active campaign
- `resume_campaign` - Resumes a paused campaign  
- `schedule_check` - Checks for scheduled campaigns to start

## Integration Points

### Frontend Integration

The app uses Edge Functions through helper functions:

```typescript
import { campaignTriggers } from '@/lib/config/edge-functions'

// Start a campaign (triggers Edge Function)
await campaignTriggers.startCampaign('campaign-id')

// Pause a campaign
await campaignTriggers.pauseCampaign('campaign-id')
```

### Webhook Integration

Set your Retell webhook URL to:
```
https://your-project.supabase.co/functions/v1/retell-webhook
```

### Campaign Processing Flow

1. **User creates campaign** → Stored in database as `draft`
2. **User clicks "Start"** → Triggers `start_campaign` Edge Function
3. **Edge Function** → Updates status to `active`, processes first batch
4. **For each contact** → Creates outbound call via Retell API
5. **Retell sends webhooks** → `retell-webhook` Edge Function updates status
6. **Campaign continues** → Processing batches until all contacts are done

## Environment Variables

Set these in Supabase Dashboard > Project Settings > Edge Functions:

```env
# Required for all functions
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required for retell-webhook
RETELL_WEBHOOK_SECRET=your-webhook-secret

# Required for campaign-trigger  
RETELL_API_KEY=your-retell-api-key
```

## File Structure

```
supabase/
├── config.toml                    # Supabase configuration
├── functions/
│   ├── shared/
│   │   └── supabase.ts            # Shared utilities
│   ├── retell-webhook/
│   │   └── index.ts               # Retell webhook handler
│   └── campaign-trigger/
│       └── index.ts               # Campaign processing
```

## Key Features

✅ **Global Distribution** - Edge Functions run close to users worldwide  
✅ **Auto-scaling** - Scales automatically based on webhook volume  
✅ **Isolated Processing** - Each function runs in secure isolation  
✅ **Real-time Updates** - Webhooks processed immediately  
✅ **Campaign Orchestration** - Batch processing with error handling  
✅ **RLS Security** - All database operations respect Row Level Security  
✅ **CORS Support** - Proper CORS handling for web clients  
✅ **Error Resilience** - Graceful handling of API failures  

## Development Workflow

1. **Make Changes** - Edit functions in `supabase/functions/`
2. **Test Locally** - `pnpm functions:dev` and `pnpm functions:test`
3. **Deploy** - `pnpm functions:deploy`
4. **Verify** - `pnpm functions:test:staging`

## Monitoring

- **Supabase Dashboard** - View logs, invocation count, errors
- **Application Logs** - Edge Functions log important events
- **Database Monitoring** - Track campaign and call status changes

## Troubleshooting

### Common Issues

**Function not found (404)**
- Ensure function is deployed: `pnpm functions:deploy`
- Check function name in URL

**Authorization errors (401)**  
- Verify environment variables in Supabase dashboard
- Check webhook signature configuration

**Database errors (500)**
- Verify RLS policies allow service role access
- Check service role key is correct

**Webhook signature errors**
- Ensure `RETELL_WEBHOOK_SECRET` matches Retell configuration
- Verify webhook URL is correct in Retell dashboard

### Debug Commands

```bash
# View function logs
supabase functions logs --project-ref your-project-ref

# View specific function logs  
supabase functions logs retell-webhook --project-ref your-project-ref

# Test specific webhook locally
curl -X POST http://127.0.0.1:54321/functions/v1/retell-webhook \
  -H 'Content-Type: application/json' \
  -H 'x-retell-signature: your-webhook-secret' \
  -d '{"event_type": "call_started", "data": {"call_id": "test-123"}}'
```

## Performance & Scaling

- **Cold starts**: ~50-200ms for first invocation
- **Warm execution**: <10ms for subsequent calls
- **Concurrency**: Handles hundreds of concurrent webhook calls
- **Rate limits**: 100 invocations per second per function
- **Timeout**: 300 seconds max execution time

## Security

- **Webhook verification**: All Retell webhooks verified with signatures
- **RLS enforcement**: All database operations respect organization boundaries  
- **Service role isolation**: Functions use dedicated service role
- **HTTPS only**: All function URLs use HTTPS encryption
- **Environment variables**: Secrets stored securely in Supabase

---

For detailed documentation, see [`docs/EDGE_FUNCTIONS.md`](./docs/EDGE_FUNCTIONS.md)