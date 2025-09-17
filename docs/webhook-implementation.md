# Retell AI Webhook Implementation

This document describes the comprehensive webhook implementation for processing Retell AI webhooks using Supabase Edge Functions.

## Overview

The webhook system processes real-time events from Retell AI for both outbound campaign calls and inbound calls. It provides:

- **Real-time call tracking** for campaign management
- **User notifications** for inbound calls  
- **Proper signature verification** for security
- **Comprehensive call analysis** storage
- **Campaign statistics** updates

## Architecture

### Edge Function Structure

```
supabase/functions/
├── retell-webhook/
│   └── index.ts          # Main webhook processor
└── shared/
    └── supabase.ts       # Shared utilities and auth
```

### Webhook Event Types Supported

1. **`call_started`** - When a call begins (outbound or inbound)
2. **`call_ended`** - When a call terminates
3. **`call_analyzed`** - When call analysis is complete (transcript, sentiment, etc.)
4. **`call_inbound`** - Inbound call webhook for dynamic agent assignment

## Event Processing

### Call Started (`call_started`)
- Creates/updates call record in database
- Links call to campaign if applicable
- Updates campaign contact status to "calling"
- Records metadata and timing information

### Call Ended (`call_ended`) 
- Updates call status based on disconnect reason
- Records call duration, cost, and recording URL
- Updates campaign contact completion status
- Increments campaign processed count

### Call Analyzed (`call_analyzed`)
- Stores call transcript and analysis results
- Records AI analysis data (sentiment, success, summary)
- Updates campaign success metrics
- Stores custom analysis fields

### Inbound Call (`call_inbound`)
- Identifies organization from phone number
- Creates call record for inbound call
- **Notifies all users** in the organization
- Logs activity for audit trail
- Supports dynamic agent assignment

## Security

### Signature Verification
- Uses HMAC-SHA256 with Retell API key
- Verifies `x-retell-signature` header
- Rejects requests with invalid signatures
- Supports both hex and `sha256=` prefixed signatures

### CORS Support
- Handles preflight OPTIONS requests
- Appropriate CORS headers for web clients
- Error responses include CORS headers

## Database Integration

### Tables Updated
- **`calls`** - Main call records with full event data
- **`call_campaigns`** - Campaign progress tracking
- **`campaign_contacts`** - Individual contact call status
- **`notifications`** - User notifications for inbound calls
- **`activity_logs`** - Audit trail of system events

### Key Fields Stored
- Call timing (start/end timestamps, duration)
- Cost and billing information
- Recording URLs and transcripts
- AI analysis results (sentiment, success rate, summary)
- Disconnect reasons and error details
- Campaign and contact associations

## User Notifications

### Inbound Call Notifications
When an inbound call is received:
1. System identifies the organization owning the phone number
2. Creates notifications for all users in that organization
3. Notification includes caller information and timestamp
4. Could be extended to send emails, SMS, or push notifications

### Notification Data Structure
```json
{
  "type": "inbound_call",
  "title": "Incoming Call Received", 
  "message": "New inbound call from +1234567890 to +1987654321",
  "data": {
    "from_number": "+1234567890",
    "to_number": "+1987654321", 
    "agent_id": "agent_123"
  }
}
```

## Testing

### Test Scripts Provided

1. **Bash Script**: `scripts/test-webhook-simple.sh`
   - No dependencies required (just curl + openssl)
   - Tests all webhook event types
   - Validates signature verification
   - Colored output for easy debugging

2. **Usage Examples**:
   ```bash
   # Test all webhook types
   ./scripts/test-webhook-simple.sh
   
   # Test specific webhook
   ./scripts/test-webhook-simple.sh inbound
   
   # Test with custom API key
   ./scripts/test-webhook-simple.sh -k your-api-key all
   
   # Test invalid signature (should fail)
   ./scripts/test-webhook-simple.sh invalid_sig
   ```

### Environment Variables
- `RETELL_API_KEY` - Your Retell AI API key (for signature generation)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

## Configuration

### Retell AI Webhook Setup
1. In Retell AI dashboard, set webhook URL to:
   ```
   https://your-project.supabase.co/functions/v1/retell-webhook
   ```

2. Or for agent-specific webhooks, configure per agent

3. Ensure your Retell API key is set in Supabase Edge Function environment

### Supabase Environment Variables
Set these in your Supabase project settings:
```
RETELL_API_KEY=your_retell_api_key_here
```

## Deployment

The webhook is deployed as a Supabase Edge Function:

```bash
# Deploy the function
supabase functions deploy retell-webhook

# Set environment variables
supabase secrets set RETELL_API_KEY=your_key_here
```

## Error Handling

The webhook implementation includes comprehensive error handling:

- **Invalid signatures** return 401 Unauthorized
- **Missing environment variables** are logged and handled gracefully  
- **Database errors** are caught and logged without failing the webhook
- **Network timeouts** use Retell's 10-second limit
- **Malformed payloads** return appropriate HTTP error codes

## Monitoring

Key metrics to monitor:
- Webhook response times (should be < 10 seconds)
- Signature verification failures (potential security issues)
- Database update errors (data consistency)
- Notification delivery rates (user experience)

## Future Enhancements

Possible improvements:
1. **Retry mechanism** for failed database operations
2. **Email/SMS notifications** for inbound calls
3. **Webhook event queuing** for high-volume scenarios  
4. **Campaign automation triggers** based on call outcomes
5. **Advanced analytics** and reporting dashboards
6. **Webhook event replay** for debugging and recovery

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check Retell API key is set correctly
   - Verify signature generation matches Retell's format
   - Ensure API key has webhook permissions

2. **Database Errors**
   - Verify table schemas match expected format
   - Check RLS policies allow service role access
   - Ensure foreign key relationships exist

3. **Missing Notifications**
   - Check organization-phone number associations
   - Verify user profiles exist and are linked properly
   - Review notification table constraints

### Debug Logging
The webhook includes extensive console logging:
- All incoming webhook events are logged with IDs
- Database operations log success/failure
- Error details include full stack traces
- Processing times for performance monitoring