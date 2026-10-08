BEGIN;

-- Membership roles govern what a user may read. A live subscription is required only for changes.
CREATE OR REPLACE FUNCTION public.has_org_permission(target_org_id uuid, permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.roles r ON r.id = m.role_id AND r.organization_id = m.organization_id
    JOIN public.role_permissions p ON p.role_id = r.id
    JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.organization_id = target_org_id AND m.user_id = auth.uid()
      AND m.status = 'active' AND o.status = 'active' AND p.permission_key = permission
  );
$$;

CREATE FUNCTION public.can_write_org(target_org_id uuid, permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.billing_access(target_org_id) AND public.has_org_permission(target_org_id, permission);
$$;
REVOKE ALL ON FUNCTION public.can_write_org(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_org(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_update_lead(org_id uuid, lead_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.billing_access(org_id) AND EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.organization_id = org_id
      AND (public.has_org_permission(org_id,'leads.update.all') OR
        (public.has_org_permission(org_id,'leads.update.assigned') AND l.assigned_to = auth.uid())));
$$;

DROP POLICY org_update ON public.organizations;
CREATE POLICY org_update ON public.organizations FOR UPDATE TO authenticated
  USING (public.can_write_org(id,'settings.manage') OR public.is_platform_admin())
  WITH CHECK (public.can_write_org(id,'settings.manage') OR public.is_platform_admin());

DROP POLICY leads_insert ON public.leads;
DROP POLICY leads_update ON public.leads;
CREATE POLICY leads_insert ON public.leads FOR INSERT TO authenticated WITH CHECK (
  public.can_write_org(organization_id,'leads.create') AND created_by = auth.uid() AND
  (public.has_org_permission(organization_id,'leads.assign') OR assigned_to = auth.uid()));
CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated USING (
  public.billing_access(organization_id) AND (public.has_org_permission(organization_id,'leads.update.all') OR
  (public.has_org_permission(organization_id,'leads.update.assigned') AND assigned_to = auth.uid())))
  WITH CHECK (public.billing_access(organization_id) AND (public.has_org_permission(organization_id,'leads.update.all') OR
  (public.has_org_permission(organization_id,'leads.update.assigned') AND assigned_to = auth.uid())));

DROP POLICY units_insert ON public.property_units;
DROP POLICY units_update ON public.property_units;
CREATE POLICY units_insert ON public.property_units FOR INSERT TO authenticated WITH CHECK (public.can_write_org(organization_id,'inventory.manage'));
CREATE POLICY units_update ON public.property_units FOR UPDATE TO authenticated USING (public.can_write_org(organization_id,'inventory.manage')) WITH CHECK (public.can_write_org(organization_id,'inventory.manage'));

DROP POLICY invitations_insert ON public.organization_invitations;
DROP POLICY invitations_update ON public.organization_invitations;
CREATE POLICY invitations_insert ON public.organization_invitations FOR INSERT TO authenticated WITH CHECK (
  public.can_write_org(organization_id,'settings.manage') AND invited_by = auth.uid() AND
  EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.organization_id = organization_invitations.organization_id AND r.key <> 'owner'));
CREATE POLICY invitations_update ON public.organization_invitations FOR UPDATE TO authenticated USING (public.can_write_org(organization_id,'settings.manage')) WITH CHECK (
  public.can_write_org(organization_id,'settings.manage') AND invited_by = auth.uid() AND
  EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.organization_id = organization_invitations.organization_id AND r.key <> 'owner'));

CREATE OR REPLACE FUNCTION public.manage_member(org_id uuid, member_id uuid, new_role uuid, new_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target public.organization_members;
BEGIN
  IF NOT public.can_write_org(org_id,'settings.manage') THEN RAISE EXCEPTION 'Subscription required' USING ERRCODE='42501'; END IF;
  IF new_status NOT IN ('active','disabled') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  PERFORM 1 FROM public.organizations WHERE id=org_id FOR UPDATE;
  SELECT * INTO target FROM public.organization_members WHERE id=member_id AND organization_id=org_id FOR UPDATE;
  IF target.id IS NULL OR target.user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.roles WHERE id=target.role_id AND key='owner') THEN RAISE EXCEPTION 'Owner and own access cannot be changed here' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.roles WHERE id=new_role AND organization_id=org_id AND key <> 'owner') THEN RAISE EXCEPTION 'Invalid workspace role' USING ERRCODE='42501'; END IF;
  UPDATE public.organization_members SET role_id=new_role,status=new_status WHERE id=member_id AND organization_id=org_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.revoke_invitation(org_id uuid, invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.can_write_org(org_id,'settings.manage') THEN RAISE EXCEPTION 'Subscription required' USING ERRCODE='42501'; END IF;
  UPDATE public.organization_invitations SET expires_at=now() WHERE id=invitation_id AND organization_id=org_id AND accepted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation already accepted or unavailable'; END IF;
END;
$$;
COMMIT;
