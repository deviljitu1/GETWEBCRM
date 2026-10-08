BEGIN;

CREATE FUNCTION public.create_self_service_organization(
  org_name text,
  org_slug text,
  org_email text,
  org_phone text DEFAULT NULL,
  org_legal_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org_id uuid; owner_role uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Sign in with a verified account first' USING ERRCODE = '42501';
  END IF;
  IF length(trim(org_name)) NOT BETWEEN 1 AND 160
    OR org_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    OR length(org_slug) > 80
    OR org_slug IN ('admin','auth','api','rtl','login','workspaces') THEN
    RAISE EXCEPTION 'Invalid workspace details';
  END IF;
  IF length(org_email) > 254 OR org_email !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Invalid business email';
  END IF;
  IF org_phone IS NOT NULL AND length(org_phone) > 15 THEN
    RAISE EXCEPTION 'Invalid business phone';
  END IF;
  IF org_legal_name IS NOT NULL AND length(trim(org_legal_name)) > 160 THEN
    RAISE EXCEPTION 'Invalid legal name';
  END IF;

  INSERT INTO public.organizations(name,slug,email,phone,legal_name,status)
    VALUES(trim(org_name),org_slug,lower(org_email),org_phone,nullif(trim(org_legal_name),''),'active')
    RETURNING id INTO org_id;
  PERFORM public.seed_org_configuration(org_id);
  SELECT id INTO owner_role FROM public.roles WHERE organization_id = org_id AND key = 'owner';
  INSERT INTO public.organization_members(organization_id,user_id,role_id)
    VALUES(org_id,auth.uid(),owner_role);
  RETURN org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_self_service_organization(text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_self_service_organization(text,text,text,text,text) TO authenticated;
COMMIT;
