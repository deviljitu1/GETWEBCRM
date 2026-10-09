-- Site records remain tenant-scoped and financial counters cannot overrun stock or bookings.
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
  ('a1111111-1111-4111-8111-111111111111','site-owner-a@example.invalid',now()),
  ('b2222222-2222-4222-8222-222222222222','site-owner-b@example.invalid',now()),
  ('c3333333-3333-4333-8333-333333333333','site-viewer@example.invalid',now());
INSERT INTO public.organizations(id,name,slug,status) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Site test A','site-test-a','active'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Site test B','site-test-b','active');
SELECT public.seed_org_configuration(id) FROM public.organizations WHERE slug IN ('site-test-a','site-test-b');
INSERT INTO public.organization_members(organization_id,user_id,role_id)
SELECT o.id,v.user_id::uuid,r.id FROM (VALUES
  ('site-test-a','a1111111-1111-4111-8111-111111111111','owner'),
  ('site-test-b','b2222222-2222-4222-8222-222222222222','owner'),
  ('site-test-a','c3333333-3333-4333-8333-333333333333','viewer')
) v(slug,user_id,role)
JOIN public.organizations o ON o.slug=v.slug
JOIN public.roles r ON r.organization_id=o.id AND r.key=v.role;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
DO $$
DECLARE project_id uuid; material_id uuid; booking_id uuid;
BEGIN
  INSERT INTO public.site_projects(organization_id,name)
    VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Site A') RETURNING id INTO project_id;
  INSERT INTO public.site_materials(organization_id,name,unit)
    VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Cement','bags') RETURNING id INTO material_id;
  INSERT INTO public.site_material_movements(organization_id,material_id,movement_date,movement_type,quantity)
    VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',material_id,current_date,'received',10);
  INSERT INTO public.site_material_movements(organization_id,material_id,movement_date,movement_type,quantity)
    VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',material_id,current_date,'used',4);
  IF (SELECT balance FROM public.site_material_stock WHERE id=material_id) <> 6 THEN
    RAISE EXCEPTION 'Stock balance incorrect';
  END IF;
  BEGIN
    INSERT INTO public.site_material_movements(organization_id,material_id,movement_date,movement_type,quantity)
      VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',material_id,current_date,'used',7);
    RAISE EXCEPTION 'Overuse accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Material use exceeds available stock' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.site_daily_reports(organization_id,project_id,work_date,work_description,supervisor)
      VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',project_id,current_date,'Foundation work','Supervisor');
    RAISE EXCEPTION 'Photo-free report accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO public.site_bookings(organization_id,project_id,customer_name,booking_date,booking_value)
    VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',project_id,'Customer',current_date,100)
    RETURNING id INTO booking_id;
  INSERT INTO public.site_collections(organization_id,booking_id,payment_date,amount)
    VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',booking_id,current_date,60);
  BEGIN
    INSERT INTO public.site_collections(organization_id,booking_id,payment_date,amount)
      VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',booking_id,current_date,41);
    RAISE EXCEPTION 'Overcollection accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Collection exceeds booking value' THEN RAISE; END IF;
  END;
  IF (public.site_management_summary('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->>'outstanding')::numeric <> 40 THEN
    RAISE EXCEPTION 'Outstanding balance incorrect';
  END IF;
  BEGIN
    INSERT INTO public.site_projects(organization_id,name)
      VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Forbidden');
    RAISE EXCEPTION 'Cross-tenant project accepted' USING ERRCODE='XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.site_projects WHERE organization_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN
    RAISE EXCEPTION 'Cross-tenant site read';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','c3333333-3333-4333-8333-333333333333',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.site_projects) OR
     public.has_org_permission('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','sites.read') THEN
    RAISE EXCEPTION 'Viewer gained site access';
  END IF;
END $$;
ROLLBACK;
