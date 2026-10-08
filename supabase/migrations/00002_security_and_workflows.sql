BEGIN;

CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$;

UPDATE public.organizations SET status = 'active' WHERE status IS NULL;
ALTER TABLE public.organizations ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.organizations ALTER COLUMN status SET NOT NULL;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.organization_id = target_org_id AND m.user_id = auth.uid()
      AND m.status = 'active' AND o.status = 'active'
  );
$$;

CREATE TABLE public.permissions (key text PRIMARY KEY);
INSERT INTO public.permissions VALUES ('leads.read.all'), ('leads.read.assigned'),
  ('leads.create'), ('leads.update.all'), ('leads.update.assigned'), ('leads.assign'),
  ('inventory.read'), ('inventory.manage'), ('settings.manage');
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key),
  PRIMARY KEY (role_id, permission_key)
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.has_org_permission(target_org_id uuid, permission text) RETURNS boolean
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

CREATE FUNCTION public.seed_org_configuration(org_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.roles (organization_id, key, name, is_system)
  SELECT org_id, key, name, true FROM (VALUES
    ('owner','Owner'), ('admin','Admin'), ('sales_manager','Sales Manager'),
    ('sales_executive','Sales Executive'), ('telecaller','Telecaller'),
    ('accountant','Accountant'), ('viewer','Viewer')) v(key,name)
  ON CONFLICT (organization_id,key) DO NOTHING;
  INSERT INTO public.role_permissions (role_id, permission_key)
  SELECT r.id, p.key FROM public.roles r CROSS JOIN public.permissions p
  WHERE r.organization_id = org_id AND (
    r.key IN ('owner','admin') OR
    (r.key = 'sales_manager' AND p.key <> 'settings.manage') OR
    (r.key IN ('sales_executive','telecaller') AND p.key IN
      ('leads.read.assigned','leads.create','leads.update.assigned','inventory.read')) OR
    (r.key = 'viewer' AND p.key IN ('leads.read.all','inventory.read')) OR
    (r.key = 'accountant' AND p.key = 'inventory.read')
  ) ON CONFLICT DO NOTHING;
  INSERT INTO public.lead_stages (organization_id,key,name,sort_order,is_closed,outcome)
  SELECT org_id,key,name,n,closed,outcome FROM (VALUES
    ('new','New',1,false,'open'), ('contacted','Contacted',2,false,'open'),
    ('qualified','Qualified',3,false,'open'), ('site_visit','Site Visit',4,false,'open'),
    ('negotiation','Negotiation',5,false,'open'), ('booked','Booked',6,true,'won'),
    ('lost','Lost',7,true,'lost')) v(key,name,n,closed,outcome)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.lead_sources (organization_id,key,name)
  SELECT org_id,key,name FROM (VALUES ('website','Website'),('referral','Referral'),
    ('instagram','Instagram'),('manual','Manual')) v(key,name)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.seed_org_configuration(uuid) FROM PUBLIC, anon, authenticated;
SELECT public.seed_org_configuration(id) FROM public.organizations;

ALTER TABLE public.roles ADD CONSTRAINT roles_org_id_unique UNIQUE (organization_id,id);
ALTER TABLE public.lead_stages ADD CONSTRAINT stages_org_id_unique UNIQUE (organization_id,id);
ALTER TABLE public.lead_sources ADD CONSTRAINT sources_org_id_unique UNIQUE (organization_id,id);
-- NOT VALID preserves existing records while enforcing isolation for new writes.
ALTER TABLE public.organization_members ADD CONSTRAINT members_role_same_org
  FOREIGN KEY (organization_id,role_id) REFERENCES public.roles(organization_id,id) NOT VALID;
ALTER TABLE public.leads ADD CONSTRAINT leads_stage_same_org
  FOREIGN KEY (organization_id,stage_id) REFERENCES public.lead_stages(organization_id,id) NOT VALID;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_same_org
  FOREIGN KEY (organization_id,source_id) REFERENCES public.lead_sources(organization_id,id) NOT VALID;
ALTER TABLE public.leads ADD CONSTRAINT leads_org_id_unique UNIQUE (organization_id,id);

CREATE FUNCTION public.can_read_lead(org_id uuid, lead_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.organization_id = org_id
    AND (public.has_org_permission(org_id,'leads.read.all') OR
      (public.has_org_permission(org_id,'leads.read.assigned') AND l.assigned_to = auth.uid())));
$$;
CREATE FUNCTION public.can_update_lead(org_id uuid, lead_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.organization_id = org_id
    AND (public.has_org_permission(org_id,'leads.update.all') OR
      (public.has_org_permission(org_id,'leads.update.assigned') AND l.assigned_to = auth.uid())));
$$;

DROP POLICY "Users can view their organizations" ON public.organizations;
DROP POLICY "Users can view leads in their organization" ON public.leads;
DROP POLICY "Users can insert leads in their organization" ON public.leads;
DROP POLICY "Users can update leads in their organization" ON public.leads;
CREATE POLICY org_read ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id) OR public.is_platform_admin());
CREATE POLICY org_update ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_permission(id,'settings.manage') OR public.is_platform_admin())
  WITH CHECK (public.has_org_permission(id,'settings.manage') OR public.is_platform_admin());
CREATE POLICY members_read ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_platform_admin());
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (
  id = auth.uid() OR public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.organization_members m WHERE m.user_id = profiles.id
      AND public.is_org_member(m.organization_id)));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY roles_read ON public.roles FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_platform_admin());
CREATE POLICY permissions_read ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY role_permissions_read ON public.role_permissions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id));
CREATE POLICY stages_read ON public.lead_stages FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY sources_read ON public.lead_sources FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY leads_read ON public.leads FOR SELECT TO authenticated USING (
  public.has_org_permission(organization_id,'leads.read.all') OR
  (public.has_org_permission(organization_id,'leads.read.assigned') AND assigned_to = auth.uid()));
CREATE POLICY leads_insert ON public.leads FOR INSERT TO authenticated WITH CHECK (
  public.has_org_permission(organization_id,'leads.create') AND created_by = auth.uid() AND
  (public.has_org_permission(organization_id,'leads.assign') OR assigned_to = auth.uid()));
CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated USING (
  public.has_org_permission(organization_id,'leads.update.all') OR
  (public.has_org_permission(organization_id,'leads.update.assigned') AND assigned_to = auth.uid()))
  WITH CHECK (public.has_org_permission(organization_id,'leads.update.all') OR
  (public.has_org_permission(organization_id,'leads.update.assigned') AND assigned_to = auth.uid()));

CREATE TABLE public.property_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_name text NOT NULL CHECK (length(project_name) BETWEEN 1 AND 160),
  unit_number text NOT NULL CHECK (length(unit_number) BETWEEN 1 AND 80),
  configuration text NOT NULL DEFAULT '',
  price numeric(14,2) NOT NULL CHECK (price >= 0),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','blocked','sold')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,project_name,unit_number)
);
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY units_read ON public.property_units FOR SELECT TO authenticated USING (public.has_org_permission(organization_id,'inventory.read'));
CREATE POLICY units_insert ON public.property_units FOR INSERT TO authenticated WITH CHECK (public.has_org_permission(organization_id,'inventory.manage'));
CREATE POLICY units_update ON public.property_units FOR UPDATE TO authenticated USING (public.has_org_permission(organization_id,'inventory.manage')) WITH CHECK (public.has_org_permission(organization_id,'inventory.manage'));
CREATE INDEX units_org_status ON public.property_units(organization_id,status,created_at DESC);

CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  lead_id uuid NOT NULL, body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  performed_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,lead_id) REFERENCES public.leads(organization_id,id)
);
CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  lead_id uuid NOT NULL, scheduled_at timestamptz NOT NULL,
  notes text NOT NULL DEFAULT '', created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,lead_id) REFERENCES public.leads(organization_id,id)
);
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_read ON public.lead_activities FOR SELECT TO authenticated USING (public.can_read_lead(organization_id,lead_id));
CREATE POLICY activity_insert ON public.lead_activities FOR INSERT TO authenticated WITH CHECK (performed_by = auth.uid() AND public.can_update_lead(organization_id,lead_id));
CREATE POLICY visits_read ON public.site_visits FOR SELECT TO authenticated USING (public.can_read_lead(organization_id,lead_id));
CREATE POLICY visits_insert ON public.site_visits FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.can_update_lead(organization_id,lead_id));
CREATE POLICY visits_update ON public.site_visits FOR UPDATE TO authenticated USING (public.can_update_lead(organization_id,lead_id)) WITH CHECK (public.can_update_lead(organization_id,lead_id));
CREATE INDEX activities_lead ON public.lead_activities(organization_id,lead_id,occurred_at DESC);
CREATE INDEX visits_org ON public.site_visits(organization_id,scheduled_at);

CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  email text NOT NULL CHECK (email = lower(email)), role_id uuid NOT NULL,
  invited_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days', accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (organization_id,email),
  FOREIGN KEY (organization_id,role_id) REFERENCES public.roles(organization_id,id)
);
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY invitations_read ON public.organization_invitations FOR SELECT TO authenticated USING (public.has_org_permission(organization_id,'settings.manage'));
CREATE POLICY invitations_insert ON public.organization_invitations FOR INSERT TO authenticated WITH CHECK (
  public.has_org_permission(organization_id,'settings.manage') AND invited_by = auth.uid() AND
  EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.organization_id = organization_invitations.organization_id AND r.key <> 'owner'));
CREATE POLICY invitations_update ON public.organization_invitations FOR UPDATE TO authenticated USING (public.has_org_permission(organization_id,'settings.manage')) WITH CHECK (
  public.has_org_permission(organization_id,'settings.manage') AND invited_by = auth.uid() AND
  EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.organization_id = organization_invitations.organization_id AND r.key <> 'owner'));

CREATE FUNCTION public.accept_pending_invitations() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE invite record; verified_email text;
BEGIN
  SELECT lower(email) INTO verified_email FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF verified_email IS NULL THEN RETURN; END IF;
  FOR invite IN SELECT i.* FROM public.organization_invitations i
    JOIN public.organizations o ON o.id = i.organization_id
    JOIN public.organization_members m ON m.organization_id = i.organization_id AND m.user_id = i.invited_by
    JOIN public.roles r ON r.id = m.role_id AND r.organization_id = m.organization_id
    JOIN public.role_permissions p ON p.role_id = r.id AND p.permission_key = 'settings.manage'
    WHERE i.email = verified_email AND i.accepted_at IS NULL AND i.expires_at > now()
      AND o.status = 'active' AND m.status = 'active' FOR UPDATE OF i
  LOOP
    INSERT INTO public.organization_members (organization_id,user_id,role_id,invited_by)
      VALUES (invite.organization_id,auth.uid(),invite.role_id,invite.invited_by) ON CONFLICT DO NOTHING;
    UPDATE public.organization_invitations SET accepted_at = now() WHERE id = invite.id;
  END LOOP;
END;
$$;

CREATE FUNCTION public.create_organization(org_name text, org_slug text, owner_email text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org_id uuid; owner_id uuid; owner_role uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  IF length(trim(org_name)) NOT BETWEEN 1 AND 160 OR org_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    OR length(org_slug) > 80 OR org_slug IN ('admin','auth','api','rtl') THEN RAISE EXCEPTION 'Invalid organization'; END IF;
  SELECT id INTO owner_id FROM auth.users WHERE lower(email) = lower(owner_email) AND email_confirmed_at IS NOT NULL;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Owner must register and verify their email first'; END IF;
  INSERT INTO public.organizations (name,slug,status) VALUES (trim(org_name),org_slug,'active') RETURNING id INTO org_id;
  PERFORM public.seed_org_configuration(org_id);
  SELECT id INTO owner_role FROM public.roles WHERE organization_id = org_id AND key = 'owner';
  INSERT INTO public.organization_members (organization_id,user_id,role_id) VALUES (org_id,owner_id,owner_role);
  RETURN org_id;
END;
$$;

CREATE FUNCTION public.create_user_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id,full_name) VALUES (NEW.id,coalesce(nullif(NEW.raw_user_meta_data->>'full_name',''),split_part(NEW.email,'@',1),'User')) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER create_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
INSERT INTO public.profiles(id,full_name) SELECT id,coalesce(nullif(raw_user_meta_data->>'full_name',''),split_part(email,'@',1),'User') FROM auth.users ON CONFLICT DO NOTHING;

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  price_monthly numeric(12,2) NOT NULL CHECK (price_monthly >= 0),
  currency_code char(3) NOT NULL DEFAULT 'INR', is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE public.organization_subscriptions (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL CHECK (status IN ('trial','active','cancelled')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id), name text NOT NULL, support_email text NOT NULL
);
INSERT INTO public.platform_settings VALUES (true,'GETWEBCRM','');
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_admin ON public.plans FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY subscriptions_admin ON public.organization_subscriptions FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY platform_settings_admin ON public.platform_settings FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE TABLE public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid, actor_user_id uuid, entity_type text NOT NULL,
  entity_id text, action text NOT NULL, changed_fields text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_read ON public.audit_logs FOR SELECT TO authenticated USING (public.is_platform_admin() OR public.has_org_permission(organization_id,'settings.manage'));
CREATE FUNCTION public.audit_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE row_data jsonb; previous jsonb; changed text[];
BEGIN
  row_data := to_jsonb(NEW);
  previous := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  SELECT array_agg(key) INTO changed FROM jsonb_each(row_data) WHERE previous->key IS DISTINCT FROM value;
  INSERT INTO public.audit_logs(organization_id,actor_user_id,entity_type,entity_id,action,changed_fields)
  VALUES (coalesce((row_data->>'organization_id')::uuid,CASE WHEN TG_TABLE_NAME = 'organizations' THEN (row_data->>'id')::uuid END),
    auth.uid(),TG_TABLE_NAME,coalesce(row_data->>'id',row_data->>'organization_id'),TG_OP,coalesce(changed,'{}'));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.guard_tenant_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.organization_id <> OLD.organization_id THEN RAISE EXCEPTION 'Organization is immutable'; END IF;
  IF TG_TABLE_NAME = 'leads' THEN
    IF TG_OP = 'UPDATE' AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'Creator is immutable'; END IF;
    IF NEW.assigned_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = NEW.organization_id AND user_id = NEW.assigned_to AND status = 'active') THEN RAISE EXCEPTION 'Assignee must be an active member'; END IF;
    IF TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
      AND auth.uid() IS NOT NULL AND NOT public.has_org_permission(NEW.organization_id,'leads.assign') THEN RAISE EXCEPTION 'Assignment forbidden' USING ERRCODE = '42501'; END IF;
    NEW.email_normalized := lower(nullif(trim(NEW.email),''));
    NEW.phone_normalized := nullif(regexp_replace(coalesce(NEW.phone_normalized,NEW.phone,''),'[^0-9]','','g'),'');
    IF NEW.phone_normalized IS NOT NULL THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.organization_id::text || ':phone:' || NEW.phone_normalized,0));
    END IF;
    IF NEW.email_normalized IS NOT NULL THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.organization_id::text || ':email:' || NEW.email_normalized,0));
    END IF;
    IF (TG_OP = 'INSERT' OR NEW.phone_normalized IS DISTINCT FROM OLD.phone_normalized OR
      NEW.email_normalized IS DISTINCT FROM OLD.email_normalized OR NEW.stage_id IS DISTINCT FROM OLD.stage_id)
      AND NOT EXISTS (SELECT 1 FROM public.lead_stages s WHERE s.id = NEW.stage_id AND s.outcome = 'lost')
      AND EXISTS (SELECT 1 FROM public.leads l LEFT JOIN public.lead_stages s ON s.id = l.stage_id
      WHERE l.organization_id = NEW.organization_id AND l.id <> NEW.id AND coalesce(s.outcome,'open') <> 'lost'
      AND ((NEW.phone_normalized IS NOT NULL AND regexp_replace(coalesce(l.phone_normalized,l.phone,''),'[^0-9]','','g') = NEW.phone_normalized)
        OR (NEW.email_normalized IS NOT NULL AND lower(l.email) = NEW.email_normalized))) THEN
      RAISE EXCEPTION 'Duplicate lead' USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.guard_organization_write() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.slug <> OLD.slug THEN RAISE EXCEPTION 'Organization identity is immutable'; END IF;
  IF NEW.status <> OLD.status AND NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Only platform admins may change status' USING ERRCODE = '42501'; END IF;
  NEW.updated_at := now(); RETURN NEW;
END;
$$;
CREATE TRIGGER guard_organization BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.guard_organization_write();
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['leads','property_units','lead_activities','site_visits','organization_invitations','organization_members'] LOOP
    EXECUTE format('CREATE TRIGGER guard_tenant BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_write()',table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['leads','property_units','lead_activities','site_visits','organization_invitations','organization_members','organizations','plans','organization_subscriptions','platform_settings'] LOOP
    EXECUTE format('CREATE TRIGGER audit_write AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_change()',table_name);
  END LOOP;
END $$;
CREATE TRIGGER units_timestamp BEFORE UPDATE ON public.property_units FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TABLE public.rate_limit_buckets (key text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL);
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.consume_rate_limit(bucket text, max_attempts integer, window_seconds integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attempts integer;
BEGIN
  IF length(bucket) > 200 OR max_attempts NOT BETWEEN 1 AND 1000 OR window_seconds NOT BETWEEN 1 AND 86400 THEN RAISE EXCEPTION 'Invalid rate limit'; END IF;
  DELETE FROM public.rate_limit_buckets WHERE expires_at < now() - interval '1 day';
  INSERT INTO public.rate_limit_buckets AS b VALUES (bucket,1,now() + make_interval(secs => window_seconds))
  ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN b.expires_at <= now() THEN 1 ELSE b.attempts + 1 END,
    expires_at = CASE WHEN b.expires_at <= now() THEN now() + make_interval(secs => window_seconds) ELSE b.expires_at END
  RETURNING b.attempts INTO attempts;
  RETURN attempts <= max_attempts;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text,integer,integer) TO service_role;

-- Explicit grants: RLS controls rows; privileged configuration is never client writable.
REVOKE ALL ON public.organizations,public.profiles,public.roles,public.organization_members,
  public.lead_stages,public.lead_sources,public.leads,public.platform_admins,public.permissions,
  public.role_permissions,public.property_units,public.lead_activities,public.site_visits,
  public.organization_invitations,public.plans,public.organization_subscriptions,
  public.platform_settings,public.audit_logs,public.rate_limit_buckets FROM anon;
GRANT SELECT ON public.organizations,public.profiles,public.organization_members,public.roles,
  public.permissions,public.role_permissions,public.lead_stages,public.lead_sources,public.leads,
  public.property_units,public.lead_activities,public.site_visits,public.organization_invitations,
  public.plans,public.organization_subscriptions,public.platform_settings,public.audit_logs TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.platform_admins,public.roles,public.permissions,public.role_permissions,
  public.organization_members,public.audit_logs,public.rate_limit_buckets FROM authenticated;
GRANT INSERT,UPDATE ON public.leads,public.property_units,public.site_visits,public.organization_invitations,
  public.plans,public.organization_subscriptions TO authenticated;
GRANT INSERT ON public.lead_activities TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.organizations,public.profiles,public.platform_settings FROM authenticated;
GRANT UPDATE(name,email,phone,website,legal_name) ON public.organizations TO authenticated;
-- Platform status changes go through an authorization-checked RPC.
CREATE FUNCTION public.set_organization_status(org_id uuid, new_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  IF new_status NOT IN ('active','suspended','archived') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.organizations SET status = new_status WHERE id = org_id;
END;
$$;
GRANT UPDATE(full_name,phone,avatar_path) ON public.profiles TO authenticated;
GRANT UPDATE(name,support_email) ON public.platform_settings TO authenticated;
REVOKE ALL ON FUNCTION public.is_platform_admin(),public.is_org_member(uuid),public.has_org_permission(uuid,text),
  public.can_read_lead(uuid,uuid),public.can_update_lead(uuid,uuid),public.accept_pending_invitations(),
  public.create_organization(text,text,text),public.set_organization_status(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(),public.is_org_member(uuid),public.has_org_permission(uuid,text),
  public.can_read_lead(uuid,uuid),public.can_update_lead(uuid,uuid),public.accept_pending_invitations(),
  public.create_organization(text,text,text),public.set_organization_status(uuid,text) TO authenticated;

CREATE FUNCTION public.workspace_summary(org_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'leads', (SELECT count(*) FROM public.leads WHERE organization_id = org_id),
    'overdue', (SELECT count(*) FROM public.leads l LEFT JOIN public.lead_stages s ON s.id = l.stage_id WHERE l.organization_id = org_id AND l.next_followup_at < now() AND NOT coalesce(s.is_closed,false)),
    'visits', (SELECT count(*) FROM public.site_visits WHERE organization_id = org_id AND status = 'scheduled' AND scheduled_at >= now() AND scheduled_at < now() + interval '7 days'),
    'units', (SELECT count(*) FROM public.property_units WHERE organization_id = org_id AND status = 'available'),
    'pipeline', (SELECT coalesce(jsonb_agg(t),'[]'::jsonb) FROM (SELECT s.name,count(l.id) AS total FROM public.lead_stages s LEFT JOIN public.leads l ON l.stage_id = s.id AND l.organization_id = org_id WHERE s.organization_id = org_id GROUP BY s.id,s.name,s.sort_order ORDER BY s.sort_order) t)
  );
$$;
CREATE FUNCTION public.platform_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object('organizations',(SELECT count(*) FROM public.organizations),
    'active',(SELECT count(*) FROM public.organizations WHERE status = 'active'),
    'members',(SELECT count(DISTINCT user_id) FROM public.organization_members),
    'subscriptions',(SELECT count(*) FROM public.organization_subscriptions WHERE status = 'active'));
$$;
REVOKE ALL ON FUNCTION public.workspace_summary(uuid),public.platform_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.workspace_summary(uuid),public.platform_summary() TO authenticated;

COMMIT;
