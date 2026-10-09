BEGIN;

INSERT INTO public.permissions(key) VALUES ('sites.read'),('sites.manage') ON CONFLICT DO NOTHING;

-- The existing workspace seeder grants most permissions to sales managers.
-- Keep site access scoped even when it seeds roles in a newly created workspace.
CREATE FUNCTION public.guard_site_role_permissions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE role_key text;
BEGIN
  IF NEW.permission_key NOT IN ('sites.read','sites.manage') THEN RETURN NEW; END IF;
  SELECT key INTO role_key FROM public.roles WHERE id=NEW.role_id;
  IF (NEW.permission_key='sites.read' AND role_key IN ('owner','admin','site_supervisor','sales_manager','viewer'))
    OR (NEW.permission_key='sites.manage' AND role_key IN ('owner','admin','site_supervisor')) THEN
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER guard_site_role_permissions_before_insert
  BEFORE INSERT ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.guard_site_role_permissions();

CREATE FUNCTION public.grant_site_role_permissions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.role_permissions(role_id,permission_key)
  SELECT NEW.id, p.key FROM public.permissions p
  WHERE (p.key = 'sites.read' AND NEW.key IN ('owner','admin','site_supervisor','sales_manager','viewer'))
     OR (p.key = 'sites.manage' AND NEW.key IN ('owner','admin','site_supervisor'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER grant_site_role_permissions_after_insert
  AFTER INSERT ON public.roles FOR EACH ROW EXECUTE FUNCTION public.grant_site_role_permissions();

INSERT INTO public.roles(organization_id,key,name,is_system)
  SELECT id,'site_supervisor','Site Supervisor',true FROM public.organizations
  ON CONFLICT (organization_id,key) DO NOTHING;
INSERT INTO public.role_permissions(role_id,permission_key)
  SELECT r.id,p.key FROM public.roles r CROSS JOIN public.permissions p
  WHERE (p.key='sites.read' AND r.key IN ('owner','admin','site_supervisor','sales_manager','viewer'))
     OR (p.key='sites.manage' AND r.key IN ('owner','admin','site_supervisor'))
  ON CONFLICT DO NOTHING;

CREATE TABLE public.site_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  kind text NOT NULL CHECK (kind IN ('material','expense','work','contractor','stage')),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,kind,name), UNIQUE(organization_id,id)
);

CREATE FUNCTION public.seed_site_workspace() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.roles(organization_id,key,name,is_system)
    VALUES(NEW.id,'site_supervisor','Site Supervisor',true)
    ON CONFLICT (organization_id,key) DO NOTHING;
  INSERT INTO public.site_categories(organization_id,kind,name)
    SELECT NEW.id,v.kind,v.name FROM (VALUES
      ('material','Cement'),('material','Steel'),('material','Sand'),('material','Bricks / Blocks'),
      ('material','Tiles'),('material','Electrical'),('material','Plumbing'),('material','Paint'),('material','Hardware'),
      ('expense','Labour'),('expense','Material'),('expense','Equipment'),('expense','Transport'),('expense','Utilities'),('expense','Other'),
      ('work','Foundation'),('work','Structure'),('work','Masonry'),('work','Electrical'),('work','Plumbing'),('work','Finishing'),
      ('contractor','Civil'),('contractor','Electrical'),('contractor','Plumbing'),('contractor','Painting'),('contractor','Carpentry'),
      ('stage','Planning'),('stage','Foundation'),('stage','Structure'),('stage','Finishing'),('stage','Handover')
    ) v(kind,name) ON CONFLICT (organization_id,kind,name) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER seed_site_workspace_after_org
  AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.seed_site_workspace();
INSERT INTO public.site_categories(organization_id,kind,name)
  SELECT o.id,v.kind,v.name FROM public.organizations o CROSS JOIN (VALUES
    ('material','Cement'),('material','Steel'),('material','Sand'),('material','Bricks / Blocks'),
    ('material','Tiles'),('material','Electrical'),('material','Plumbing'),('material','Paint'),('material','Hardware'),
    ('expense','Labour'),('expense','Material'),('expense','Equipment'),('expense','Transport'),('expense','Utilities'),('expense','Other'),
    ('work','Foundation'),('work','Structure'),('work','Masonry'),('work','Electrical'),('work','Plumbing'),('work','Finishing'),
    ('contractor','Civil'),('contractor','Electrical'),('contractor','Plumbing'),('contractor','Painting'),('contractor','Carpentry'),
    ('stage','Planning'),('stage','Foundation'),('stage','Structure'),('stage','Finishing'),('stage','Handover')
  ) v(kind,name) ON CONFLICT (organization_id,kind,name) DO NOTHING;

CREATE TABLE public.site_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
  site_location text NOT NULL DEFAULT '', site_incharge text NOT NULL DEFAULT '', site_supervisor text NOT NULL DEFAULT '',
  start_date date, target_completion_date date, current_stage text NOT NULL DEFAULT 'Planning',
  total_units integer NOT NULL DEFAULT 0 CHECK (total_units >= 0),
  completed_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (completed_percent BETWEEN 0 AND 100),
  pending_work text NOT NULL DEFAULT '', remarks text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','delayed','on_hold')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,id)
);
CREATE INDEX site_projects_org_status ON public.site_projects(organization_id,status,created_at DESC);

CREATE TABLE public.site_contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160), work_type text NOT NULL DEFAULT '',
  daily_rate numeric(12,2) NOT NULL DEFAULT 0 CHECK (daily_rate >= 0),
  work_status text NOT NULL DEFAULT 'active' CHECK (work_status IN ('active','completed','on_hold')),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,id)
);

CREATE TABLE public.site_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160), category_id uuid,
  unit text NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 30),
  low_stock_level numeric(14,2) NOT NULL DEFAULT 0 CHECK (low_stock_level >= 0),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,id),
  FOREIGN KEY (organization_id,category_id) REFERENCES public.site_categories(organization_id,id)
);

CREATE TABLE public.site_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid NOT NULL, work_date date NOT NULL,
  work_description text NOT NULL CHECK (length(trim(work_description)) BETWEEN 1 AND 4000),
  location_floor text NOT NULL DEFAULT '', labour_count integer NOT NULL DEFAULT 0 CHECK (labour_count >= 0),
  contractor_id uuid, material_used text NOT NULL DEFAULT '', work_completed text NOT NULL DEFAULT '',
  pending_work text NOT NULL DEFAULT '', supervisor text NOT NULL DEFAULT '', photo_paths text[] NOT NULL DEFAULT '{}',
  remarks text NOT NULL DEFAULT '', created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,project_id) REFERENCES public.site_projects(organization_id,id),
  FOREIGN KEY (organization_id,contractor_id) REFERENCES public.site_contractors(organization_id,id)
);
CREATE INDEX site_reports_org_date ON public.site_daily_reports(organization_id,work_date DESC);

CREATE TABLE public.site_material_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  material_id uuid NOT NULL, project_id uuid,
  movement_date date NOT NULL, movement_type text NOT NULL CHECK (movement_type IN ('received','used')),
  quantity numeric(14,2) NOT NULL CHECK (quantity > 0), supplier text NOT NULL DEFAULT '',
  bill_number text NOT NULL DEFAULT '', unit_rate numeric(12,2) CHECK (unit_rate >= 0),
  amount numeric(14,2) CHECK (amount >= 0), receipt_path text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,material_id) REFERENCES public.site_materials(organization_id,id),
  FOREIGN KEY (organization_id,project_id) REFERENCES public.site_projects(organization_id,id)
);
CREATE INDEX site_material_movements_org_date ON public.site_material_movements(organization_id,movement_date DESC);
CREATE VIEW public.site_material_stock WITH (security_invoker=true) AS
  SELECT m.id,m.organization_id,m.name,m.unit,m.low_stock_level,
    coalesce(sum(CASE WHEN x.movement_type='received' THEN x.quantity ELSE -x.quantity END),0) AS balance
  FROM public.site_materials m
  LEFT JOIN public.site_material_movements x ON x.material_id=m.id AND x.organization_id=m.organization_id
  GROUP BY m.id;
GRANT SELECT ON public.site_material_stock TO authenticated;
CREATE FUNCTION public.prevent_negative_site_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE available numeric;
BEGIN
  PERFORM 1 FROM public.site_materials WHERE id=NEW.material_id AND organization_id=NEW.organization_id FOR UPDATE;
  SELECT coalesce(sum(CASE WHEN movement_type='received' THEN quantity ELSE -quantity END),0)
    INTO available FROM public.site_material_movements
    WHERE material_id=NEW.material_id AND organization_id=NEW.organization_id;
  IF NEW.movement_type='used' AND NEW.quantity > available THEN
    RAISE EXCEPTION 'Material use exceeds available stock';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prevent_negative_site_stock_before_insert
  BEFORE INSERT ON public.site_material_movements FOR EACH ROW EXECUTE FUNCTION public.prevent_negative_site_stock();

CREATE TABLE public.site_labour_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid NOT NULL, contractor_id uuid NOT NULL, work_date date NOT NULL,
  attendance text NOT NULL DEFAULT 'present' CHECK (attendance IN ('present','absent')),
  labour_count integer NOT NULL DEFAULT 0 CHECK (labour_count >= 0),
  work_status text NOT NULL DEFAULT 'in_progress' CHECK (work_status IN ('pending','in_progress','completed','on_hold')),
  remarks text NOT NULL DEFAULT '', created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,project_id) REFERENCES public.site_projects(organization_id,id),
  FOREIGN KEY (organization_id,contractor_id) REFERENCES public.site_contractors(organization_id,id)
);
CREATE INDEX site_labour_org_date ON public.site_labour_entries(organization_id,work_date DESC);

CREATE TABLE public.site_contractor_finances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid NOT NULL, contractor_id uuid NOT NULL, entry_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('bill','advance','payment')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0), receipt_path text,
  remarks text NOT NULL DEFAULT '', created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,project_id) REFERENCES public.site_projects(organization_id,id),
  FOREIGN KEY (organization_id,contractor_id) REFERENCES public.site_contractors(organization_id,id)
);
CREATE INDEX site_contractor_finances_org_date ON public.site_contractor_finances(organization_id,entry_date DESC);

CREATE TABLE public.site_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid NOT NULL, expense_date date NOT NULL, category_id uuid,
  particular text NOT NULL CHECK (length(trim(particular)) BETWEEN 1 AND 500),
  amount numeric(14,2) NOT NULL CHECK (amount > 0), paid_by text NOT NULL DEFAULT '',
  payment_mode text NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash','upi','bank','card','other')),
  receipt_path text, approved_by text NOT NULL DEFAULT '', remarks text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,project_id) REFERENCES public.site_projects(organization_id,id),
  FOREIGN KEY (organization_id,category_id) REFERENCES public.site_categories(organization_id,id)
);
CREATE INDEX site_expenses_org_date ON public.site_expenses(organization_id,expense_date DESC);

CREATE TABLE public.site_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid NOT NULL, title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  assigned_person text NOT NULL DEFAULT '', start_date date, target_date date, completed_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','delayed','on_hold')),
  remarks text NOT NULL DEFAULT '', created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,project_id) REFERENCES public.site_projects(organization_id,id)
);
CREATE INDEX site_tasks_org_status ON public.site_tasks(organization_id,status,target_date);

CREATE TABLE public.site_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid NOT NULL, lead_id uuid, customer_name text NOT NULL CHECK (length(trim(customer_name)) BETWEEN 1 AND 160),
  booking_date date NOT NULL, booking_value numeric(14,2) NOT NULL CHECK (booking_value > 0),
  remarks text NOT NULL DEFAULT '', created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,id),
  FOREIGN KEY (organization_id,project_id) REFERENCES public.site_projects(organization_id,id),
  FOREIGN KEY (organization_id,lead_id) REFERENCES public.leads(organization_id,id)
);
CREATE TABLE public.site_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  booking_id uuid NOT NULL, payment_date date NOT NULL, amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_mode text NOT NULL DEFAULT 'bank' CHECK (payment_mode IN ('cash','upi','bank','card','other')),
  reference text NOT NULL DEFAULT '', created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,booking_id) REFERENCES public.site_bookings(organization_id,id)
);
CREATE FUNCTION public.prevent_over_collection() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE booked numeric; collected numeric;
BEGIN
  SELECT booking_value INTO booked FROM public.site_bookings
    WHERE id=NEW.booking_id AND organization_id=NEW.organization_id FOR UPDATE;
  SELECT coalesce(sum(amount),0) INTO collected FROM public.site_collections
    WHERE booking_id=NEW.booking_id AND organization_id=NEW.organization_id;
  IF booked IS NULL OR collected + NEW.amount > booked THEN
    RAISE EXCEPTION 'Collection exceeds booking value';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prevent_over_collection_before_insert
  BEFORE INSERT ON public.site_collections FOR EACH ROW EXECUTE FUNCTION public.prevent_over_collection();

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'site_categories','site_projects','site_contractors','site_materials','site_daily_reports',
    'site_material_movements','site_labour_entries','site_contractor_finances','site_expenses',
    'site_tasks','site_bookings','site_collections'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY site_read ON public.%I FOR SELECT TO authenticated USING (public.has_org_permission(organization_id,''sites.read''))',table_name);
    IF table_name IN ('site_daily_reports','site_material_movements','site_labour_entries','site_contractor_finances','site_expenses','site_tasks','site_bookings','site_collections') THEN
      EXECUTE format('CREATE POLICY site_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_org(organization_id,''sites.manage'') AND created_by=auth.uid())',table_name);
    ELSE
      EXECUTE format('CREATE POLICY site_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_org(organization_id,''sites.manage''))',table_name);
    END IF;
    EXECUTE format('GRANT SELECT,INSERT ON public.%I TO authenticated',table_name);
    IF table_name IN ('site_categories','site_projects','site_contractors','site_materials','site_tasks') THEN
      EXECUTE format('CREATE POLICY site_update ON public.%I FOR UPDATE TO authenticated USING (public.can_write_org(organization_id,''sites.manage'')) WITH CHECK (public.can_write_org(organization_id,''sites.manage''))',table_name);
      EXECUTE format('GRANT UPDATE ON public.%I TO authenticated',table_name);
    END IF;
  END LOOP;
END;
$$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  VALUES('site-files','site-files',false,5242880,ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
  ON CONFLICT (id) DO NOTHING;
CREATE FUNCTION public.site_file_org(file_name text) RETURNS uuid
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN split_part(file_name,'/',1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN split_part(file_name,'/',1)::uuid ELSE NULL END;
$$;
REVOKE ALL ON FUNCTION public.site_file_org(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.site_file_org(text) TO authenticated;
CREATE POLICY site_files_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='site-files' AND public.has_org_permission(public.site_file_org(name),'sites.read'));
CREATE POLICY site_files_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='site-files' AND public.can_write_org(public.site_file_org(name),'sites.manage'));
CREATE POLICY site_files_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='site-files' AND public.can_write_org(public.site_file_org(name),'sites.manage'));

CREATE FUNCTION public.site_management_summary(org_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF NOT public.has_org_permission(org_id,'sites.read') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'projects',(SELECT count(*) FROM public.site_projects WHERE organization_id=org_id),
    'active_sites',(SELECT count(*) FROM public.site_projects WHERE organization_id=org_id AND status='active'),
    'completed_sites',(SELECT count(*) FROM public.site_projects WHERE organization_id=org_id AND status='completed'),
    'delayed_sites',(SELECT count(*) FROM public.site_projects WHERE organization_id=org_id AND (status='delayed' OR (target_completion_date<today AND status='active'))),
    'today_reports',(SELECT count(*) FROM public.site_daily_reports WHERE organization_id=org_id AND work_date=today),
    'completed_tasks',(SELECT count(*) FROM public.site_tasks WHERE organization_id=org_id AND status='completed'),
    'pending_tasks',(SELECT count(*) FROM public.site_tasks WHERE organization_id=org_id AND status IN ('pending','in_progress','on_hold')),
    'delayed_tasks',(SELECT count(*) FROM public.site_tasks WHERE organization_id=org_id AND (status='delayed' OR (target_date<today AND status NOT IN ('completed','on_hold')))),
    'stock_available',(SELECT count(*) FROM public.site_materials m LEFT JOIN LATERAL (
      SELECT coalesce(sum(CASE WHEN movement_type='received' THEN quantity ELSE -quantity END),0) balance
      FROM public.site_material_movements x WHERE x.material_id=m.id AND x.organization_id=org_id
    ) stock ON true WHERE m.organization_id=org_id AND stock.balance>0),
    'low_stock',(SELECT count(*) FROM public.site_materials m LEFT JOIN LATERAL (
      SELECT coalesce(sum(CASE WHEN movement_type='received' THEN quantity ELSE -quantity END),0) balance
      FROM public.site_material_movements x WHERE x.material_id=m.id AND x.organization_id=org_id
    ) stock ON true WHERE m.organization_id=org_id AND stock.balance<=m.low_stock_level),
    'material_purchased',(SELECT coalesce(sum(quantity),0) FROM public.site_material_movements WHERE organization_id=org_id AND movement_type='received'),
    'material_used',(SELECT coalesce(sum(quantity),0) FROM public.site_material_movements WHERE organization_id=org_id AND movement_type='used'),
    'today_labour',(SELECT coalesce(sum(labour_count),0) FROM public.site_labour_entries WHERE organization_id=org_id AND work_date=today AND attendance='present'),
    'contractor_attendance',(SELECT count(DISTINCT contractor_id) FROM public.site_labour_entries WHERE organization_id=org_id AND work_date=today AND attendance='present'),
    'contractor_pending',(SELECT coalesce(sum(CASE WHEN kind='bill' THEN amount ELSE -amount END),0) FROM public.site_contractor_finances WHERE organization_id=org_id),
    'today_expenses',(SELECT coalesce(sum(amount),0) FROM public.site_expenses WHERE organization_id=org_id AND expense_date=today),
    'site_expenses',(SELECT coalesce(sum(amount),0) FROM public.site_expenses WHERE organization_id=org_id),
    'contractor_payments',(SELECT coalesce(sum(amount),0) FROM public.site_contractor_finances WHERE organization_id=org_id AND kind IN ('payment','advance')),
    'material_payments',(SELECT coalesce(sum(amount),0) FROM public.site_material_movements WHERE organization_id=org_id AND movement_type='received'),
    'leads',(SELECT count(*) FROM public.leads WHERE organization_id=org_id),
    'followups',(SELECT count(*) FROM public.leads WHERE organization_id=org_id AND next_followup_at::date=today),
    'visits',(SELECT count(*) FROM public.site_visits WHERE organization_id=org_id AND status='scheduled'),
    'bookings',(SELECT count(*) FROM public.site_bookings WHERE organization_id=org_id),
    'collection',(SELECT coalesce(sum(amount),0) FROM public.site_collections WHERE organization_id=org_id),
    'outstanding',(SELECT coalesce(sum(booking_value),0) FROM public.site_bookings WHERE organization_id=org_id)
      -(SELECT coalesce(sum(amount),0) FROM public.site_collections WHERE organization_id=org_id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.site_management_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.site_management_summary(uuid) TO authenticated;

COMMIT;
