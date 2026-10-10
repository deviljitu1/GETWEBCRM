BEGIN;

ALTER TABLE public.support_access_grants ADD COLUMN can_manage boolean NOT NULL DEFAULT false;

CREATE FUNCTION public.has_support_management(target_org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_support_access(target_org_id) AND EXISTS (
    SELECT 1 FROM public.support_access_grants
    WHERE organization_id=target_org_id AND user_id=auth.uid() AND can_manage AND expires_at>now()
  );
$$;
REVOKE ALL ON FUNCTION public.has_support_management(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_support_management(uuid) TO authenticated,service_role;

CREATE FUNCTION public.grant_support_management(target_org_id uuid) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE expiry timestamptz;
BEGIN
  -- The existing grant verifies the platform role, active workspace and writes an audit event.
  expiry := public.grant_support_access(target_org_id);
  UPDATE public.support_access_grants SET can_manage=true
    WHERE organization_id=target_org_id AND user_id=auth.uid();
  INSERT INTO public.audit_logs(organization_id,actor_user_id,entity_type,entity_id,action,changed_fields)
  VALUES(target_org_id,auth.uid(),'support_access',target_org_id::text,'MANAGE',ARRAY['can_manage','expires_at']);
  RETURN expiry;
END;
$$;
REVOKE ALL ON FUNCTION public.grant_support_management(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.grant_support_management(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_org_permission(target_org_id uuid, permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (public.has_support_management(target_org_id) AND EXISTS (
    SELECT 1 FROM public.permissions WHERE key=permission
  )) OR (public.has_support_access(target_org_id) AND permission IN
    ('leads.read.all','inventory.read','sites.read')) OR EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.roles r ON r.id=m.role_id AND r.organization_id=m.organization_id
    JOIN public.role_permissions p ON p.role_id=r.id
    JOIN public.organizations o ON o.id=m.organization_id
    WHERE m.organization_id=target_org_id AND m.user_id=auth.uid()
      AND m.status='active' AND o.status='active' AND p.permission_key=permission
  );
$$;

-- Only the current administrator's temporary support session bypasses billing.
-- Tenant accounts and subscription records retain their existing rules.
CREATE OR REPLACE FUNCTION public.billing_access(org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_support_management(org_id)
    OR NOT EXISTS (SELECT 1 FROM public.billing_settings WHERE organization_id=org_id AND payment_required)
    OR EXISTS (SELECT 1 FROM public.billing_contracts WHERE organization_id=org_id
      AND mode='live' AND paid_count>0 AND paid_until>now());
$$;

COMMIT;
