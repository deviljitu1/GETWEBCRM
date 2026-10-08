BEGIN;
-- Public health checks expose availability only, without access to CRM records.
CREATE FUNCTION public.database_health() RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_database WHERE datname = pg_catalog.current_database());
$$;
REVOKE ALL ON FUNCTION public.database_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.database_health() TO anon, authenticated;
COMMIT;
