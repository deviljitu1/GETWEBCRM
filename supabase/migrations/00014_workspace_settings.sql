BEGIN;

CREATE FUNCTION public.save_workspace_settings(org_id uuid, new_status text, seats integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  -- Both existing admin-only operations share one transaction.
  PERFORM public.set_workspace_member_limit(org_id,seats);
  PERFORM public.set_organization_status(org_id,new_status);
END;
$$;
REVOKE ALL ON FUNCTION public.save_workspace_settings(uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_workspace_settings(uuid,text,integer) TO authenticated;

COMMIT;
