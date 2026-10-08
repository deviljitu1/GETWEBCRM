BEGIN;
CREATE FUNCTION public.manage_member(org_id uuid, member_id uuid, new_role uuid, new_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target public.organization_members;
BEGIN
  IF NOT public.has_org_permission(org_id,'settings.manage') THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
  IF new_status NOT IN ('active','disabled') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  PERFORM 1 FROM public.organizations WHERE id=org_id FOR UPDATE;
  SELECT * INTO target FROM public.organization_members WHERE id=member_id AND organization_id=org_id FOR UPDATE;
  IF target.id IS NULL OR target.user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.roles WHERE id=target.role_id AND key='owner') THEN
    RAISE EXCEPTION 'Owner and own access cannot be changed here' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.roles WHERE id=new_role AND organization_id=org_id AND key <> 'owner') THEN
    RAISE EXCEPTION 'Invalid workspace role' USING ERRCODE='42501';
  END IF;
  UPDATE public.organization_members SET role_id=new_role,status=new_status WHERE id=member_id AND organization_id=org_id;
END;
$$;
CREATE FUNCTION public.revoke_invitation(org_id uuid, invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_org_permission(org_id,'settings.manage') THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
  UPDATE public.organization_invitations SET expires_at=now() WHERE id=invitation_id AND organization_id=org_id AND accepted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation already accepted or unavailable'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.manage_member(uuid,uuid,uuid,text),public.revoke_invitation(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_member(uuid,uuid,uuid,text),public.revoke_invitation(uuid,uuid) TO authenticated;
COMMIT;
