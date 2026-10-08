BEGIN;
ALTER TABLE public.plans ADD COLUMN razorpay_plan_id text CHECK (razorpay_plan_id ~ '^plan_[A-Za-z0-9]+$');
CREATE TABLE public.billing_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
  payment_required boolean NOT NULL DEFAULT false
);
CREATE TABLE public.billing_contracts (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  provider_id text NOT NULL UNIQUE CHECK (provider_id ~ '^sub_[A-Za-z0-9]+$'),
  mode text NOT NULL CHECK (mode IN ('test','live')),
  status text NOT NULL CHECK (status IN ('created','authenticated','active','pending','halted','cancelled','completed','expired','paused')),
  checkout_url text NOT NULL CHECK (checkout_url ~ '^https://rzp\.io/'),
  paid_count integer NOT NULL DEFAULT 0 CHECK (paid_count >= 0),
  paid_until timestamptz,
  total_count integer NOT NULL CHECK (total_count > 0),
  sync_version bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.billing_events (
  event_id text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_settings_admin ON public.billing_settings FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY billing_contracts_read ON public.billing_contracts FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.has_org_permission(organization_id,'settings.manage'));
GRANT SELECT,INSERT,UPDATE ON public.billing_settings TO authenticated;
GRANT SELECT ON public.billing_contracts TO authenticated;
GRANT ALL ON public.billing_settings,public.billing_contracts,public.billing_events TO service_role;

CREATE FUNCTION public.billing_access(org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.billing_settings WHERE organization_id = org_id AND payment_required)
    OR EXISTS (SELECT 1 FROM public.billing_contracts WHERE organization_id = org_id
      AND mode = 'live' AND paid_count > 0 AND paid_until > now());
$$;
REVOKE ALL ON FUNCTION public.billing_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.billing_access(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.has_org_permission(target_org_id uuid, permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (permission = 'settings.manage' OR public.billing_access(target_org_id)) AND EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.roles r ON r.id = m.role_id AND r.organization_id = m.organization_id
    JOIN public.role_permissions p ON p.role_id = r.id
    JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.organization_id = target_org_id AND m.user_id = auth.uid()
      AND m.status = 'active' AND o.status = 'active' AND p.permission_key = permission
  );
$$;

CREATE FUNCTION public.attach_billing_contract(org_id uuid, local_plan uuid, provider_sub text,
  provider_mode text, provider_status text, checkout text, paid integer, paid_end timestamptz, cycles integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE existing public.billing_contracts;
BEGIN
  PERFORM 1 FROM public.organizations WHERE id = org_id FOR UPDATE;
  SELECT * INTO existing FROM public.billing_contracts WHERE organization_id = org_id;
  IF existing.provider_id IS NOT NULL AND existing.provider_id <> provider_sub
    AND (existing.status NOT IN ('cancelled','completed','expired') OR existing.paid_until > now()) THEN
    RAISE EXCEPTION 'Cancel the previous subscription and wait until its paid period ends before replacing it';
  END IF;
  INSERT INTO public.billing_contracts(organization_id,plan_id,provider_id,mode,status,checkout_url,paid_count,paid_until,total_count)
    VALUES(org_id,local_plan,provider_sub,provider_mode,provider_status,checkout,paid,paid_end,cycles)
    ON CONFLICT (organization_id) DO UPDATE SET plan_id = EXCLUDED.plan_id,provider_id = EXCLUDED.provider_id,
      mode = EXCLUDED.mode,status = EXCLUDED.status,checkout_url = EXCLUDED.checkout_url,
      paid_count = EXCLUDED.paid_count,paid_until = EXCLUDED.paid_until,total_count = EXCLUDED.total_count,
      sync_version = public.billing_contracts.sync_version + 1,updated_at = now();
END;
$$;
CREATE FUNCTION public.begin_billing_sync(provider_sub text) RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.billing_contracts SET sync_version = sync_version + 1 WHERE provider_id = provider_sub RETURNING sync_version;
$$;
CREATE FUNCTION public.finish_billing_sync(provider_sub text, revision bigint, provider_status text,
  paid integer, paid_end timestamptz, event_key text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE existing public.billing_contracts;
BEGIN
  IF event_key IS NOT NULL AND EXISTS (SELECT 1 FROM public.billing_events WHERE event_id = event_key) THEN RETURN true; END IF;
  SELECT * INTO existing FROM public.billing_contracts WHERE provider_id = provider_sub FOR UPDATE;
  IF existing.sync_version IS DISTINCT FROM revision THEN RETURN false; END IF;
  UPDATE public.billing_contracts SET status = provider_status,
    paid_until = CASE WHEN provider_status = 'active' AND paid > existing.paid_count THEN paid_end ELSE paid_until END,
    paid_count = greatest(paid_count,paid),updated_at = now() WHERE provider_id = provider_sub;
  IF event_key IS NOT NULL THEN INSERT INTO public.billing_events(event_id) VALUES(event_key) ON CONFLICT DO NOTHING; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.attach_billing_contract(uuid,uuid,text,text,text,text,integer,timestamptz,integer),
  public.begin_billing_sync(text),public.finish_billing_sync(text,bigint,text,integer,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.attach_billing_contract(uuid,uuid,text,text,text,text,integer,timestamptz,integer),
  public.begin_billing_sync(text),public.finish_billing_sync(text,bigint,text,integer,timestamptz,text) TO service_role;
COMMIT;
