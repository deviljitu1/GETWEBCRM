BEGIN;

CREATE VIEW public.site_missing_daily_reports WITH (security_invoker=true) AS
SELECT p.id, p.organization_id, p.name, p.site_supervisor, p.site_incharge,
  (now() AT TIME ZONE 'Asia/Kolkata')::date AS report_date
FROM public.site_projects p
WHERE public.has_org_permission(p.organization_id,'sites.read')
  AND p.status IN ('active','delayed')
  AND (p.start_date IS NULL OR p.start_date <= (now() AT TIME ZONE 'Asia/Kolkata')::date)
  AND NOT EXISTS (SELECT 1 FROM public.site_daily_reports d
    WHERE d.organization_id=p.organization_id AND d.project_id=p.id
      AND d.work_date=(now() AT TIME ZONE 'Asia/Kolkata')::date);

CREATE VIEW public.site_contractor_balances WITH (security_invoker=true) AS
SELECT c.id,c.organization_id,c.name,c.work_type,
  coalesce(f.billed,0) AS billed,coalesce(f.advance,0) AS advance,
  coalesce(f.paid,0) AS paid,
  greatest(coalesce(f.billed,0)-coalesce(f.advance,0)-coalesce(f.paid,0),0) AS outstanding,
  greatest(coalesce(f.advance,0)+coalesce(f.paid,0)-coalesce(f.billed,0),0) AS credit,
  coalesce(l.labour_count,0) AS today_labour
FROM public.site_contractors c
LEFT JOIN LATERAL (
  SELECT sum(amount) FILTER (WHERE kind='bill') AS billed,
    sum(amount) FILTER (WHERE kind='advance') AS advance,
    sum(amount) FILTER (WHERE kind='payment') AS paid
  FROM public.site_contractor_finances
  WHERE organization_id=c.organization_id AND contractor_id=c.id
) f ON true
LEFT JOIN LATERAL (
  SELECT sum(labour_count) AS labour_count FROM public.site_labour_entries
  WHERE organization_id=c.organization_id AND contractor_id=c.id AND attendance='present'
    AND work_date=(now() AT TIME ZONE 'Asia/Kolkata')::date
) l ON true
WHERE public.has_org_permission(c.organization_id,'sites.read');

CREATE VIEW public.site_expense_totals WITH (security_invoker=true) AS
SELECT p.id,p.organization_id,p.name,coalesce(e.total,0) AS total,
  coalesce(e.today_total,0) AS today_total
FROM public.site_projects p
LEFT JOIN LATERAL (
  SELECT sum(amount) AS total,
    sum(amount) FILTER (WHERE expense_date=(now() AT TIME ZONE 'Asia/Kolkata')::date) AS today_total
  FROM public.site_expenses WHERE organization_id=p.organization_id AND project_id=p.id
) e ON true
WHERE public.has_org_permission(p.organization_id,'sites.read');

CREATE VIEW public.site_material_totals WITH (security_invoker=true) AS
SELECT m.id,m.organization_id,m.name,m.unit,m.low_stock_level,
  coalesce(x.received,0) AS received,coalesce(x.used,0) AS used,
  coalesce(x.received,0)-coalesce(x.used,0) AS balance
FROM public.site_materials m
LEFT JOIN LATERAL (
  SELECT sum(quantity) FILTER (WHERE movement_type='received') AS received,
    sum(quantity) FILTER (WHERE movement_type='used') AS used
  FROM public.site_material_movements WHERE organization_id=m.organization_id AND material_id=m.id
) x ON true
WHERE public.has_org_permission(m.organization_id,'sites.read');

REVOKE ALL ON public.site_missing_daily_reports,public.site_contractor_balances,
  public.site_expense_totals,public.site_material_totals FROM anon;
GRANT SELECT ON public.site_missing_daily_reports,public.site_contractor_balances,
  public.site_expense_totals,public.site_material_totals TO authenticated;

COMMIT;
