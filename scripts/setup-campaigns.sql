-- Create campaigns table (enhanced version of call_campaigns)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  csv_file_url TEXT,
  total_contacts INTEGER DEFAULT 0,
  completed_calls INTEGER DEFAULT 0,
  success_calls INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'scheduled')),
  scheduled_start TIMESTAMPTZ,
  trigger_job_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaign_contacts table
CREATE TABLE IF NOT EXISTS campaign_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'completed', 'failed', 'cancelled')),
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  attempted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see campaigns from their organization
CREATE POLICY "Users can view campaigns from their organization" ON campaigns
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert campaigns for their organization
CREATE POLICY "Users can create campaigns for their organization" ON campaigns
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update campaigns from their organization
CREATE POLICY "Users can update campaigns from their organization" ON campaigns
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete campaigns from their organization
CREATE POLICY "Users can delete campaigns from their organization" ON campaigns
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Add RLS policies for campaign_contacts
ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see campaign contacts from their organization's campaigns
CREATE POLICY "Users can view campaign contacts from their organization" ON campaign_contacts
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can insert campaign contacts for their organization's campaigns
CREATE POLICY "Users can create campaign contacts for their organization" ON campaign_contacts
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can update campaign contacts from their organization's campaigns
CREATE POLICY "Users can update campaign contacts from their organization" ON campaign_contacts
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can delete campaign contacts from their organization's campaigns
CREATE POLICY "Users can delete campaign contacts from their organization" ON campaign_contacts
  FOR DELETE USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_id ON campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON campaign_contacts(status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_phone ON campaign_contacts(phone);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- If call_campaigns table exists, migrate data to campaigns
-- Note: This is optional and can be run manually if needed
-- INSERT INTO campaigns (id, organization_id, agent_id, created_by, name, csv_file_url, total_contacts, completed_calls, status, trigger_job_id, created_at, updated_at)
-- SELECT id, organization_id, agent_id, created_by, name, csv_file_url, total_numbers, processed_numbers, 
--        CASE status 
--          WHEN 'pending' THEN 'draft'
--          WHEN 'processing' THEN 'active'  
--          WHEN 'completed' THEN 'completed'
--          WHEN 'failed' THEN 'completed'
--          ELSE 'draft'
--        END as status,
--        trigger_job_id, created_at, created_at as updated_at
-- FROM call_campaigns
-- ON CONFLICT (id) DO NOTHING;