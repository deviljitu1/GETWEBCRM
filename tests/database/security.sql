-- Runs against PostgreSQL or Supabase. Every fixture/change rolls back.
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
 ('11111111-1111-4111-8111-111111111111','rls-owner-a@example.invalid',now(),'{}'),
 ('22222222-2222-4222-8222-222222222222','rls-owner-b@example.invalid',now(),'{}'),
 ('33333333-3333-4333-8333-333333333333','rls-viewer@example.invalid',now(),'{}'),
 ('44444444-4444-4444-8444-444444444444','rls-executive@example.invalid',now(),'{}'),
 ('55555555-5555-4555-8555-555555555555','rls-platform@example.invalid',now(),'{}'),
 ('66666666-6666-4666-8666-666666666666','rls-outsider@example.invalid',now(),'{}'),
 ('77777777-7777-4777-8777-777777777777','rls-invite@example.invalid',now(),'{}');
INSERT INTO public.organizations(id,name,slug,status) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','RLS test A','rls-test-a','active'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','RLS test B','rls-test-b','active');
SELECT public.seed_org_configuration(id) FROM public.organizations WHERE slug IN ('rls-test-a','rls-test-b');
INSERT INTO public.organization_members(organization_id,user_id,role_id)
SELECT o.id,v.user_id::uuid,r.id FROM (VALUES
 ('rls-test-a','11111111-1111-4111-8111-111111111111','owner'),
 ('rls-test-b','22222222-2222-4222-8222-222222222222','owner'),
 ('rls-test-a','33333333-3333-4333-8333-333333333333','viewer'),
 ('rls-test-a','44444444-4444-4444-8444-444444444444','sales_executive')) v(slug,user_id,role)
JOIN public.organizations o ON o.slug = v.slug JOIN public.roles r ON r.organization_id = o.id AND r.key = v.role;
INSERT INTO public.platform_admins(user_id) VALUES ('55555555-5555-4555-8555-555555555555');
INSERT INTO public.leads(id,organization_id,full_name,phone,assigned_to,created_by,stage_id)
SELECT v.id::uuid,o.id,v.name,v.phone,v.user_id::uuid,v.user_id::uuid,s.id FROM (VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001','rls-test-a','Lead A1','+919876500001','11111111-1111-4111-8111-111111111111'),
 ('aaaaaaaa-0000-4000-8000-000000000002','rls-test-a','Lead A2','+919876500002','44444444-4444-4444-8444-444444444444'),
 ('bbbbbbbb-0000-4000-8000-000000000001','rls-test-b','Lead B1','+919876500001','22222222-2222-4222-8222-222222222222')) v(id,slug,name,phone,user_id)
JOIN public.organizations o ON o.slug = v.slug JOIN public.lead_stages s ON s.organization_id = o.id AND s.key = 'new';
DO $$ BEGIN
  IF has_table_privilege('anon','public.leads','SELECT') OR has_function_privilege('anon','public.create_organization(text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous access must be denied'; END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ DECLARE affected int; BEGIN
  IF (SELECT count(*) FROM public.leads WHERE organization_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 2 THEN RAISE EXCEPTION 'Owner must read own leads'; END IF;
  IF EXISTS (SELECT 1 FROM public.leads WHERE organization_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') THEN RAISE EXCEPTION 'Cross-tenant read'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = '22222222-2222-4222-8222-222222222222') THEN RAISE EXCEPTION 'Cross-tenant profile read'; END IF;
  UPDATE public.leads SET full_name = 'Forbidden' WHERE id = 'bbbbbbbb-0000-4000-8000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Cross-tenant update'; END IF;
  BEGIN
    UPDATE public.leads SET organization_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Tenant change accepted' USING ERRCODE = 'XX000';
  EXCEPTION WHEN raise_exception OR insufficient_privilege OR foreign_key_violation THEN NULL; END;
  BEGIN
    UPDATE public.leads SET stage_id = (SELECT id FROM public.lead_stages WHERE organization_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' LIMIT 1),
      assigned_to = '22222222-2222-4222-8222-222222222222' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Cross-tenant assignment accepted' USING ERRCODE = 'XX000';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  BEGIN
    INSERT INTO public.leads(organization_id,full_name,phone,created_by,assigned_to)
      VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Duplicate','+91 98765 00001',auth.uid(),auth.uid());
    RAISE EXCEPTION 'Duplicate accepted' USING ERRCODE = 'XX000';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    PERFORM public.create_organization('Forbidden','forbidden-test','rls-owner-a@example.invalid');
    RAISE EXCEPTION 'Non-platform admin created organization' USING ERRCODE = 'XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
DO $$ DECLARE affected int; BEGIN
  IF (SELECT count(*) FROM public.leads WHERE organization_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 2 THEN RAISE EXCEPTION 'Viewer read denied'; END IF;
  UPDATE public.leads SET full_name = 'Forbidden' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Viewer update allowed'; END IF;
  BEGIN
    INSERT INTO public.leads(organization_id,full_name,created_by,assigned_to) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Forbidden',auth.uid(),auth.uid());
    RAISE EXCEPTION 'Viewer insert allowed' USING ERRCODE = 'XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.roles SET name = 'Forbidden' WHERE organization_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'Role configuration writable' USING ERRCODE = 'XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.leads WHERE organization_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 1 THEN RAISE EXCEPTION 'Executive saw unassigned leads'; END IF;
  UPDATE public.leads SET full_name = 'Lead A2 updated' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000002';
  BEGIN
    UPDATE public.leads SET assigned_to = '11111111-1111-4111-8111-111111111111' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000002';
    RAISE EXCEPTION 'Executive reassigned lead' USING ERRCODE = 'XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO public.lead_activities(organization_id,lead_id,body) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aaaaaaaa-0000-4000-8000-000000000002','Authorized note');
  BEGIN
    INSERT INTO public.lead_activities(organization_id,lead_id,body) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bbbbbbbb-0000-4000-8000-000000000001','Forbidden');
    RAISE EXCEPTION 'Cross-tenant note allowed' USING ERRCODE = 'XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.leads WHERE organization_id IN ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')) THEN RAISE EXCEPTION 'Outsider read'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ DECLARE viewer_member uuid; viewer_role uuid; owner_role uuid; BEGIN
  SELECT id INTO viewer_member FROM public.organization_members WHERE user_id='33333333-3333-4333-8333-333333333333' AND organization_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  SELECT id INTO viewer_role FROM public.roles WHERE organization_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND key='viewer';
  SELECT id INTO owner_role FROM public.roles WHERE organization_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND key='owner';
  BEGIN
    PERFORM public.manage_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',viewer_member,owner_role,'active');
    RAISE EXCEPTION 'Owner promotion allowed' USING ERRCODE='XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM public.manage_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',viewer_member,viewer_role,'disabled');
END $$;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
DO $$ BEGIN
  IF public.is_org_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') OR EXISTS(SELECT 1 FROM public.leads) THEN RAISE EXCEPTION 'Disabled member retained access'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT public.manage_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',m.id,r.id,'active') FROM public.organization_members m JOIN public.roles r ON r.organization_id=m.organization_id AND r.key='viewer' WHERE m.user_id='33333333-3333-4333-8333-333333333333';
INSERT INTO public.organization_invitations(organization_id,email,role_id)
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','rls-invite@example.invalid',id FROM public.roles WHERE organization_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND key = 'viewer';
SELECT set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
SELECT public.accept_pending_invitations();
DO $$ BEGIN
  IF NOT public.is_org_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN RAISE EXCEPTION 'Verified invitation not accepted'; END IF;
  IF public.has_org_permission('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','leads.create') THEN RAISE EXCEPTION 'Invitation escalated permissions'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);
DO $$ BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform check failed'; END IF;
  IF EXISTS (SELECT 1 FROM public.leads WHERE organization_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN RAISE EXCEPTION 'Platform admin bypassed tenant membership'; END IF;
END $$;
SELECT public.set_organization_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','suspended');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
  IF public.is_org_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') OR EXISTS (SELECT 1 FROM public.leads WHERE organization_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN RAISE EXCEPTION 'Suspended tenant access'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
  IF NOT public.consume_rate_limit('crm-security-test',2,60) OR NOT public.consume_rate_limit('crm-security-test',2,60) OR public.consume_rate_limit('crm-security-test',2,60) THEN RAISE EXCEPTION 'Rate limit failed'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF NOT public.database_health() THEN RAISE EXCEPTION 'Public database health failed'; END IF;
  BEGIN
    PERFORM 1 FROM public.leads LIMIT 1;
    RAISE EXCEPTION 'Health checks exposed anonymous CRM access';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
