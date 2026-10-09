BEGIN;

ALTER TABLE public.organizations
  ADD COLUMN member_limit integer NOT NULL DEFAULT 5 CHECK (member_limit BETWEEN 1 AND 1000);

CREATE FUNCTION public.enforce_workspace_member_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE seats integer;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN RETURN NEW; END IF;
  SELECT member_limit INTO seats FROM public.organizations
    WHERE id = NEW.organization_id FOR UPDATE;
  IF seats IS NULL THEN RAISE EXCEPTION 'Workspace unavailable'; END IF;
  IF (SELECT count(*) FROM public.organization_members
      WHERE organization_id = NEW.organization_id AND status = 'active') >= seats THEN
    RAISE EXCEPTION 'Workspace member limit reached' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER workspace_member_limit_before_insert
  BEFORE INSERT OR UPDATE OF status ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_member_limit();

CREATE FUNCTION public.set_workspace_member_limit(org_id uuid, seats integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF seats NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid member limit'; END IF;
  UPDATE public.organizations SET member_limit = seats WHERE id = org_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace unavailable'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_workspace_member_limit(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_workspace_member_limit(uuid,integer) TO authenticated;
COMMIT;
