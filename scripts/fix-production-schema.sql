-- URGENT: Fix Production Database Schema 
-- This script adds missing columns that are causing webhook failures

-- Add missing call detail columns to production database
-- These columns are required for proper webhook processing

BEGIN;

-- Add disconnect_reason column for storing call end reason
ALTER TABLE public.calls 
  ADD COLUMN IF NOT EXISTS disconnect_reason text;

-- Add separate from/to phone number columns  
ALTER TABLE public.calls 
  ADD COLUMN IF NOT EXISTS from_number text;

ALTER TABLE public.calls 
  ADD COLUMN IF NOT EXISTS to_number text;

-- Add index for disconnect_reason for analytics queries
CREATE INDEX IF NOT EXISTS idx_calls_disconnect_reason ON public.calls(disconnect_reason);

-- Add comments for documentation
COMMENT ON COLUMN public.calls.disconnect_reason IS 'Reason why the call ended (from Retell webhook)';
COMMENT ON COLUMN public.calls.from_number IS 'The phone number the call was made from';
COMMENT ON COLUMN public.calls.to_number IS 'The phone number the call was made to';

COMMIT;

-- Reset failed campaigns that should be retryable 
-- This fixes campaigns stuck in 'failed' state due to schema issues
UPDATE public.call_campaigns 
SET status = 'pending'
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '24 hours'  -- Only recent campaigns
  AND (processed_numbers = 0 OR processed_numbers IS NULL); -- That haven't actually processed calls