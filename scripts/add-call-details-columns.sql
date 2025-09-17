-- Add missing columns to calls table for better call tracking
-- These columns will store data from Retell webhooks

-- Add disconnect_reason column to store why the call ended
ALTER TABLE public.calls 
  ADD COLUMN IF NOT EXISTS disconnect_reason text;

-- Add separate from/to phone number columns for better tracking
ALTER TABLE public.calls 
  ADD COLUMN IF NOT EXISTS from_number text;

ALTER TABLE public.calls 
  ADD COLUMN IF NOT EXISTS to_number text;

-- Add comment for documentation
COMMENT ON COLUMN public.calls.disconnect_reason IS 'Reason why the call ended (from Retell webhook)';
COMMENT ON COLUMN public.calls.from_number IS 'The phone number the call was made from';
COMMENT ON COLUMN public.calls.to_number IS 'The phone number the call was made to';

-- Create index for disconnect_reason for analytics queries
CREATE INDEX IF NOT EXISTS idx_calls_disconnect_reason ON public.calls(disconnect_reason);