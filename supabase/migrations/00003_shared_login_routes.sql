BEGIN;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_reserved_routes
  CHECK (slug NOT IN ('login','workspaces')) NOT VALID;
ALTER TABLE public.organizations VALIDATE CONSTRAINT organizations_reserved_routes;
ALTER TABLE public.organization_members VALIDATE CONSTRAINT members_role_same_org;
ALTER TABLE public.leads VALIDATE CONSTRAINT leads_stage_same_org;
ALTER TABLE public.leads VALIDATE CONSTRAINT leads_source_same_org;
COMMIT;
