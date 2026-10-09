BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
 ('88888888-8888-4888-8888-888888888888','billing-owner@example.invalid',now(),'{}');
INSERT INTO public.organizations(id,name,slug,status) VALUES
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Billing test','billing-test','active');
SELECT public.seed_org_configuration('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
INSERT INTO public.organization_members(organization_id,user_id,role_id)
 SELECT 'cccccccc-cccc-4ccc-8ccc-cccccccccccc','88888888-8888-4888-8888-888888888888',id
 FROM public.roles WHERE organization_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc' AND key='owner';
INSERT INTO public.leads(organization_id,full_name) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Billing lead');
INSERT INTO public.plans(id,name,price_monthly) VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Billing test plan',100);
INSERT INTO public.billing_settings VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
DO $$ DECLARE affected int; BEGIN
  IF public.billing_access('cccccccc-cccc-4ccc-8ccc-cccccccccccc') OR NOT EXISTS(SELECT 1 FROM public.leads) THEN RAISE EXCEPTION 'Unpaid read access'; END IF;
  IF NOT public.has_org_permission('cccccccc-cccc-4ccc-8ccc-cccccccccccc','settings.manage') THEN RAISE EXCEPTION 'Billing manager locked out'; END IF;
  BEGIN
    PERFORM public.begin_billing_sync('sub_Test'); RAISE EXCEPTION 'User can synchronize payments' USING ERRCODE='XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.billing_settings VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',false);
    RAISE EXCEPTION 'Owner bypassed enforcement' USING ERRCODE='XX000';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.leads SET full_name='Blocked write' WHERE organization_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION 'Unpaid owner write allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT public.attach_billing_contract('cccccccc-cccc-4ccc-8ccc-cccccccccccc','dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 'sub_Test','test','active','https://rzp.io/rzp/test',1,now()+interval '1 day',12);
DO $$ BEGIN
  IF public.billing_access('cccccccc-cccc-4ccc-8ccc-cccccccccccc') THEN RAISE EXCEPTION 'Test payment granted live access'; END IF;
END $$;
UPDATE public.billing_contracts SET mode='live' WHERE provider_id='sub_Test';
DO $$ DECLARE first_version bigint; second_version bigint; BEGIN
  first_version:=public.begin_billing_sync('sub_Test'); second_version:=public.begin_billing_sync('sub_Test');
  IF public.finish_billing_sync('sub_Test',first_version,'created',0,NULL,'stale') THEN RAISE EXCEPTION 'Stale update accepted'; END IF;
  IF NOT public.finish_billing_sync('sub_Test',second_version,'cancelled',1,NULL,'current') THEN RAISE EXCEPTION 'Current update rejected'; END IF;
  IF NOT public.finish_billing_sync('sub_Test',second_version,'created',0,NULL,'current') THEN RAISE EXCEPTION 'Duplicate receipt failed'; END IF;
  IF (SELECT status FROM public.billing_contracts WHERE provider_id='sub_Test') <> 'cancelled' THEN RAISE EXCEPTION 'Duplicate event rewrote status'; END IF;
  IF NOT public.billing_access('cccccccc-cccc-4ccc-8ccc-cccccccccccc') THEN RAISE EXCEPTION 'Cancelled paid period removed early'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.leads) <> 1 THEN RAISE EXCEPTION 'Paid owner access denied'; END IF;
END $$;
RESET ROLE;
UPDATE public.billing_contracts SET paid_until=now()-interval '1 day' WHERE provider_id='sub_Test';
SET LOCAL ROLE authenticated;
DO $$ DECLARE affected int; BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.leads) THEN RAISE EXCEPTION 'Expired subscription lost read access'; END IF;
  BEGIN
    UPDATE public.leads SET full_name='Blocked write' WHERE organization_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION 'Expired owner write allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
