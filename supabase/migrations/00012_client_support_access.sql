BEGIN;

CREATE TABLE public.support_access_grants (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (organization_id,user_id)
);
CREATE INDEX support_access_grants_expiry ON public.support_access_grants(expires_at);
ALTER TABLE public.support_access_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_access_admin_read ON public.support_access_grants FOR SELECT TO authenticated
  USING (public.is_platform_admin());
REVOKE ALL ON public.support_access_grants FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.support_access_grants TO authenticated;

CREATE FUNCTION public.has_support_access(target_org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.is_platform_admin() AND EXISTS (
    SELECT 1 FROM public.support_access_grants g
    JOIN public.organizations o ON o.id=g.organization_id
    WHERE g.organization_id=target_org_id AND g.user_id=auth.uid()
      AND g.expires_at>now() AND o.status='active'
  );
$$;
REVOKE ALL ON FUNCTION public.has_support_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_support_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_support_access(target_org_id) OR EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.organizations o ON o.id=m.organization_id
    WHERE m.organization_id=target_org_id AND m.user_id=auth.uid()
      AND m.status='active' AND o.status='active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_permission(target_org_id uuid, permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (public.has_support_access(target_org_id) AND permission IN
    ('leads.read.all','inventory.read','sites.read')) OR EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.roles r ON r.id=m.role_id AND r.organization_id=m.organization_id
    JOIN public.role_permissions p ON p.role_id=r.id
    JOIN public.organizations o ON o.id=m.organization_id
    WHERE m.organization_id=target_org_id AND m.user_id=auth.uid()
      AND m.status='active' AND o.status='active' AND p.permission_key=permission
  );
$$;

CREATE FUNCTION public.grant_support_access(target_org_id uuid) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE expiry timestamptz := now()+interval '1 hour';
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=target_org_id AND status='active') THEN
    RAISE EXCEPTION 'Workspace unavailable';
  END IF;
  INSERT INTO public.support_access_grants(organization_id,user_id,granted_by,expires_at)
  VALUES(target_org_id,auth.uid(),auth.uid(),expiry)
  ON CONFLICT(organization_id,user_id) DO UPDATE SET
    granted_by=EXCLUDED.granted_by,created_at=now(),expires_at=EXCLUDED.expires_at;
  INSERT INTO public.audit_logs(organization_id,actor_user_id,entity_type,entity_id,action,changed_fields)
  VALUES(target_org_id,auth.uid(),'support_access',target_org_id::text,'GRANT',ARRAY['expires_at']);
  RETURN expiry;
END;
$$;
REVOKE ALL ON FUNCTION public.grant_support_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.grant_support_access(uuid) TO authenticated;

CREATE FUNCTION public.revoke_support_access(target_org_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  DELETE FROM public.support_access_grants WHERE organization_id=target_org_id AND user_id=auth.uid();
  INSERT INTO public.audit_logs(organization_id,actor_user_id,entity_type,entity_id,action,changed_fields)
  VALUES(target_org_id,auth.uid(),'support_access',target_org_id::text,'REVOKE',ARRAY['expires_at']);
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_support_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revoke_support_access(uuid) TO authenticated;

CREATE FUNCTION public.platform_org_members(target_org_id uuid)
RETURNS TABLE(user_id uuid,email text,role_key text,status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT m.user_id,u.email::text,r.key,m.status
    FROM public.organization_members m
    JOIN auth.users u ON u.id=m.user_id
    JOIN public.roles r ON r.id=m.role_id
    WHERE m.organization_id=target_org_id ORDER BY u.email;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_org_members(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.platform_org_members(uuid) TO authenticated;

COMMIT;
