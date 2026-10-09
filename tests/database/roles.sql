BEGIN;
INSERT INTO public.organizations(id,name,slug,status,member_limit)
VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','Role checks','role-checks','active',20);
SELECT public.seed_org_configuration('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
DO $$ DECLARE role_record record; test_user uuid; BEGIN
  FOR role_record IN SELECT id,key FROM public.roles WHERE organization_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' LOOP
    test_user:=gen_random_uuid();
    INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(test_user,role_record.key||'@roles.invalid',now());
    INSERT INTO public.organization_members(organization_id,user_id,role_id)
    VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',test_user,role_record.id);
  END LOOP;
END $$;
DO $$ DECLARE role_record record; permission_record record; expected boolean; BEGIN
  FOR role_record IN
    SELECT r.key,m.user_id FROM public.roles r JOIN public.organization_members m ON m.role_id=r.id
    WHERE r.organization_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  LOOP
    PERFORM set_config('request.jwt.claim.sub',role_record.user_id::text,true);
    FOR permission_record IN SELECT key FROM public.permissions LOOP
      expected := CASE role_record.key
        WHEN 'owner' THEN true
        WHEN 'admin' THEN true
        WHEN 'sales_manager' THEN permission_record.key IN ('leads.read.all','leads.read.assigned','leads.create','leads.update.all','leads.update.assigned','leads.assign','inventory.read','inventory.manage')
        WHEN 'sales_executive' THEN permission_record.key IN ('leads.read.assigned','leads.create','leads.update.assigned','inventory.read')
        WHEN 'telecaller' THEN permission_record.key IN ('leads.read.assigned','leads.create','leads.update.assigned','inventory.read')
        WHEN 'accountant' THEN permission_record.key IN ('inventory.read','sites.read')
        WHEN 'viewer' THEN permission_record.key IN ('leads.read.all','inventory.read')
        WHEN 'site_supervisor' THEN permission_record.key IN ('sites.read','sites.manage')
        ELSE false END;
      IF public.has_org_permission('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',permission_record.key) IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'Unexpected permission % for role %',permission_record.key,role_record.key;
      END IF;
    END LOOP;
    UPDATE public.organization_members SET status='disabled' WHERE user_id=role_record.user_id;
    IF public.is_org_member('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') OR
       EXISTS(SELECT 1 FROM public.permissions p WHERE public.has_org_permission('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',p.key)) THEN
      RAISE EXCEPTION 'Disabled member retained access';
    END IF;
  END LOOP;
END $$;
ROLLBACK;
