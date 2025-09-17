-- Create the missing email_preferences table
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  email_on_campaign_complete boolean NOT NULL DEFAULT true,
  recipient_emails text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_org ON public.email_preferences(organization_id);

-- Enable RLS on email_preferences table
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for email_preferences (strict tenant isolation)
DROP POLICY IF EXISTS email_preferences_all ON public.email_preferences;
CREATE POLICY email_preferences_all ON public.email_preferences
FOR ALL USING (organization_id = public.get_my_org_id())
WITH CHECK (organization_id = public.get_my_org_id());

-- Grant necessary permissions
GRANT ALL ON public.email_preferences TO authenticated;