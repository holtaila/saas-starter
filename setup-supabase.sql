-- Enable required extension for gen_random_uuid
create extension if not exists pgcrypto;

-- Enums (create if not exists via DO blocks)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'viewer');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_tier') THEN
    CREATE TYPE plan_tier AS ENUM ('starter', 'professional', 'enterprise');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_type') THEN
    CREATE TYPE agent_type AS ENUM ('sales', 'support', 'appointment', 'survey', 'custom');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
    CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'draft');
  END IF;
END $$;

-- Agent templates share agent_type and agent_status enums

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_status') THEN
    CREATE TYPE call_status AS ENUM ('scheduled', 'in_progress', 'completed', 'failed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_direction') THEN
    CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'cancelled', 'completed');
  END IF;
END $$;

-- organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stripe_customer_id text,
  subscription_status text,
  plan_tier plan_tier NOT NULL DEFAULT 'starter',
  retell_api_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  email text,
  platform_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- agents
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  name text NOT NULL,
  type agent_type NOT NULL,
  retell_agent_id text,
  workflow_config jsonb,
  prompt_template text,
  voice_config jsonb,
  status agent_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- agent_templates (global catalog, no RLS; curated by platform admins)
CREATE TABLE IF NOT EXISTS public.agent_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type agent_type NOT NULL,
  status agent_status NOT NULL DEFAULT 'active',
  default_voice_id text,
  template_conversation_flow jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optional helpful index
CREATE INDEX IF NOT EXISTS idx_agent_templates_status ON public.agent_templates(status);

-- Link agents to the template they were created from
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.agent_templates(id) ON DELETE SET NULL;

-- calls
CREATE TABLE IF NOT EXISTS public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.call_campaigns(id) ON DELETE SET NULL,
  retell_call_id text,
  retell_agent_id text,
  phone_number text NOT NULL,
  crm_id text,
  status call_status NOT NULL DEFAULT 'scheduled',
  direction call_direction NOT NULL,
  duration_seconds integer,
  cost numeric,
  recording_url text,
  transcript text,
  metadata jsonb,
  risk_score integer,
  risk_factors jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES public.calls(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  scheduled_time timestamptz NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add retell_agent_id column if it doesn't exist (for existing databases)
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS retell_agent_id text;

-- Add created_at column if it doesn't exist (for existing databases)
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- helpful indexes
CREATE INDEX IF NOT EXISTS idx_agents_org ON public.agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_calls_org ON public.calls(organization_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent ON public.calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_retell_agent ON public.calls(retell_agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.appointments(organization_id);

-- ensure call idempotency by retell_call_id
CREATE UNIQUE INDEX IF NOT EXISTS calls_retell_call_id_uidx ON public.calls(retell_call_id);

-- =========================
-- Call Campaigns (used by /api/calls/bulk)
-- =========================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
    CREATE TYPE campaign_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.call_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  csv_file_url text,
  total_numbers integer DEFAULT 0,
  processed_numbers integer DEFAULT 0,
  status campaign_status NOT NULL DEFAULT 'pending',
  trigger_job_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add created_by column to existing campaigns table (for migration)
ALTER TABLE public.call_campaigns 
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Set default for new campaigns to current user
ALTER TABLE public.call_campaigns 
  ALTER COLUMN created_by SET DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_call_campaigns_org ON public.call_campaigns(organization_id);

-- =========================
-- Multi-tenant RLS helpers & policies
-- =========================

-- Function: get current user's organization id from profiles
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT p.organization_id INTO org_id
  FROM public.profiles p
  WHERE p.id = auth.uid();
  RETURN org_id;
END;
$$;

-- Optional helper to check admin role
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- =========================
-- Email Preferences
-- =========================

CREATE TABLE IF NOT EXISTS public.email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  email_on_campaign_complete boolean NOT NULL DEFAULT true,
  recipient_emails text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_preferences_org ON public.email_preferences(organization_id);

-- Enable RLS on tenant tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Defaults to auto-populate organization_id from the current session where safe
ALTER TABLE public.agents ALTER COLUMN organization_id SET DEFAULT public.get_my_org_id();
ALTER TABLE public.calls ALTER COLUMN organization_id SET DEFAULT public.get_my_org_id();
ALTER TABLE public.appointments ALTER COLUMN organization_id SET DEFAULT public.get_my_org_id();

-- Policies: organizations (users can see only their org; admins can update)
DROP POLICY IF EXISTS org_select ON public.organizations;
CREATE POLICY org_select ON public.organizations
FOR SELECT USING (id = public.get_my_org_id());

DROP POLICY IF EXISTS org_update ON public.organizations;
CREATE POLICY org_update ON public.organizations
FOR UPDATE USING (id = public.get_my_org_id() AND public.is_org_admin())
WITH CHECK (id = public.get_my_org_id());

-- Policies: profiles (members can read profiles in their org; users can update themselves; admin can manage)
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
FOR SELECT USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
FOR INSERT WITH CHECK (id = auth.uid());

-- Policies: agents (strict tenant isolation)
DROP POLICY IF EXISTS agents_all ON public.agents;
CREATE POLICY agents_all ON public.agents
FOR ALL USING (organization_id = public.get_my_org_id())
WITH CHECK (organization_id = public.get_my_org_id());

-- Policies: calls (strict tenant isolation)
DROP POLICY IF EXISTS calls_all ON public.calls;
CREATE POLICY calls_all ON public.calls
FOR ALL USING (organization_id = public.get_my_org_id())
WITH CHECK (organization_id = public.get_my_org_id());

-- Policies: appointments (strict tenant isolation)
DROP POLICY IF EXISTS appointments_all ON public.appointments;
CREATE POLICY appointments_all ON public.appointments
FOR ALL USING (organization_id = public.get_my_org_id())
WITH CHECK (organization_id = public.get_my_org_id());

-- Policies: call_campaigns (strict tenant isolation)
DROP POLICY IF EXISTS call_campaigns_all ON public.call_campaigns;
CREATE POLICY call_campaigns_all ON public.call_campaigns
FOR ALL USING (organization_id = public.get_my_org_id())
WITH CHECK (organization_id = public.get_my_org_id());

-- Policies: email_preferences (strict tenant isolation)
DROP POLICY IF EXISTS email_preferences_all ON public.email_preferences;
CREATE POLICY email_preferences_all ON public.email_preferences
FOR ALL USING (organization_id = public.get_my_org_id())
WITH CHECK (organization_id = public.get_my_org_id());

-- =========================
-- RPCs for analytics
-- =========================
CREATE OR REPLACE FUNCTION public.get_calls_count_today()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT count(*)::int FROM public.calls
  WHERE started_at::date = now()::date
    AND organization_id = public.get_my_org_id();
$$;

-- =========================
-- Automatic Profile Creation
-- =========================

-- Create a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  org_name text;
  new_org_id uuid;
BEGIN
  -- Extract organization name from user metadata if provided
  org_name := COALESCE(
    new.raw_user_meta_data->>'organization_name',
    new.email || '''s Organization'
  );

  -- Check if organization already exists
  SELECT id INTO new_org_id
  FROM public.organizations
  WHERE name = org_name
  LIMIT 1;

  -- If organization doesn't exist, create it
  IF new_org_id IS NULL THEN
    INSERT INTO public.organizations (name, plan_tier, subscription_status)
    VALUES (org_name, 'starter', 'active')
    RETURNING id INTO new_org_id;
  END IF;

  -- Create the user profile
  INSERT INTO public.profiles (id, organization_id, role, email)
  VALUES (
    new.id,
    new_org_id,
    'admin', -- First user in org is admin
    new.email
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
-- DISABLED: Profile creation is now handled by the /api/auth/ensure-profile endpoint
-- after email confirmation to avoid race conditions and properly handle organization data
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also handle email confirmations/updates
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger AS $$
BEGIN
  -- Update the profile email when user confirms their email
  UPDATE public.profiles
  SET 
    email = new.email,
    updated_at = now()
  WHERE id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email_confirmed_at, email ON auth.users
  FOR EACH ROW 
  WHEN (new.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_user_email_confirmed();

-- User impersonation audit log (platform admin only)
CREATE TABLE IF NOT EXISTS public.impersonation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  admin_ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on impersonation logs (platform admins only)
ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only platform admins can view/create impersonation logs
DROP POLICY IF EXISTS impersonation_logs_platform_admin ON public.impersonation_logs;
CREATE POLICY impersonation_logs_platform_admin ON public.impersonation_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND platform_role = 'platform_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND platform_role = 'platform_admin'
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.impersonation_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin() TO authenticated;