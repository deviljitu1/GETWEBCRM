-- 1. Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Base Configuration Tables
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    legal_name TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    currency_code CHAR(3) DEFAULT 'INR',
    logo_path TEXT,
    brand_config JSONB DEFAULT '{}',
    status TEXT CHECK (status IN ('active', 'suspended', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_organizations_status ON organizations(status);

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_path TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, key)
);

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id),
    status TEXT CHECK (status IN ('invited', 'active', 'disabled')) DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);
CREATE INDEX idx_org_members_user_status ON organization_members(user_id, status);

CREATE TABLE lead_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    color TEXT,
    is_closed BOOLEAN DEFAULT false,
    outcome TEXT CHECK (outcome IN ('open', 'won', 'lost')) DEFAULT 'open',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, key),
    UNIQUE(organization_id, sort_order)
);

CREATE TABLE lead_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, key)
);

-- 3. Core CRM Tables
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT NOT NULL,
    phone TEXT,
    phone_normalized TEXT,
    email TEXT,
    email_normalized TEXT,
    source_id UUID REFERENCES lead_sources(id),
    stage_id UUID REFERENCES lead_stages(id),
    assigned_to UUID REFERENCES auth.users(id),
    project_id UUID, -- Will reference projects(id)
    budget_min NUMERIC(14,2),
    budget_max NUMERIC(14,2),
    property_interest TEXT,
    city TEXT,
    notes TEXT,
    next_followup_at TIMESTAMPTZ,
    lost_reason TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (budget_min <= budget_max)
);
CREATE INDEX idx_leads_stage ON leads(organization_id, stage_id, created_at DESC);
CREATE INDEX idx_leads_followup ON leads(organization_id, assigned_to, next_followup_at);
CREATE INDEX idx_leads_phone ON leads(organization_id, phone_normalized);

-- 4. Set up basic RLS Policies (Row Level Security)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Helper function to check org membership
CREATE OR REPLACE FUNCTION is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = target_org_id 
    AND user_id = auth.uid() 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for Organizations
CREATE POLICY "Users can view their organizations" 
ON organizations FOR SELECT 
USING (is_org_member(id));

-- Policies for Leads
CREATE POLICY "Users can view leads in their organization"
ON leads FOR SELECT
USING (is_org_member(organization_id));

CREATE POLICY "Users can insert leads in their organization"
ON leads FOR INSERT
WITH CHECK (is_org_member(organization_id));

CREATE POLICY "Users can update leads in their organization"
ON leads FOR UPDATE
USING (is_org_member(organization_id));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_leads
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
