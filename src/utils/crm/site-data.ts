import type { SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, any>;
type Page = { rows: Row[]; hasMore: boolean };
export const sitePageSize = 50;

export async function loadSiteData(supabase: SupabaseClient, orgId: string, view: string, canWrite: boolean, page: number, secondaryPage: number) {
  const empty: Page = { rows: [], hasMore: false };
  const query = (table: string, columns: string) => supabase.from(table).select(columns).eq('organization_id', orgId);
  const read = async (request: PromiseLike<{ data: unknown; error: unknown }>): Promise<Row[]> => {
    const result = await request;
    if (result.error) throw new Error('Unable to load records. Please try again.');
    return (result.data || []) as Row[];
  };
  // Dropdowns must include every permitted record, not just the first API page.
  const lookup = async (table: string, columns: string): Promise<Row[]> => {
    const rows: Row[] = [];
    for (let offset = 0; ; offset += 500) {
      const batch = await read(query(table, columns).order('id').range(offset, offset + 499));
      rows.push(...batch);
      if (batch.length < 500) return rows.sort((a, b) => String(a.name || a.customer_name || '').localeCompare(String(b.name || b.customer_name || '')));
    }
  };
  const paged = async (table: string, columns: string, order: string, current: number, active = false): Promise<Page> => {
    let request = query(table, columns);
    if (active) request = request.eq('is_active', true);
    const rows = await read(request.order(order, { ascending: order === 'name' }).order('id')
      .range((current - 1) * sitePageSize, current * sitePageSize));
    return { rows: rows.slice(0, sitePageSize), hasMore: rows.length > sitePageSize };
  };
  const main = () => {
    switch (view) {
      case 'missing': return paged('site_missing_daily_reports', 'id,name,site_supervisor,site_incharge,report_date', 'name', page);
      case 'balances': return paged('site_contractor_balances', 'id,name,work_type,billed,advance,paid,outstanding,credit,today_labour', 'name', page);
      case 'costs': return paged('site_expense_totals', 'id,name,total,today_total', 'name', page);
      case 'consumption': return paged('site_material_totals', 'id,name,unit,received,used,balance,low_stock_level', 'name', page);
      case 'projects': return paged('site_projects', 'id,name,current_stage,status,site_location,site_incharge,site_supervisor,start_date,target_completion_date,total_units,completed_percent,pending_work,remarks', 'created_at', page);
      case 'daily': return paged('site_daily_reports', 'id,project_id,work_date,work_description,location_floor,labour_count,supervisor,work_completed,pending_work,material_used,photo_paths', 'work_date', page);
      case 'materials': return paged('site_material_stock', 'id,name,unit,balance,low_stock_level', 'name', page);
      case 'labour': return paged('site_labour_entries', 'id,project_id,contractor_id,work_date,labour_count,attendance,work_status', 'work_date', page);
      case 'expenses': return paged('site_expenses', 'id,project_id,category_id,expense_date,particular,amount,paid_by,payment_mode,approved_by,receipt_path', 'expense_date', page);
      case 'tasks': return paged('site_tasks', 'id,project_id,title,assigned_person,start_date,target_date,completed_date,status,remarks', 'created_at', page);
      case 'sales': return paged('site_bookings', 'id,customer_name,booking_value,booking_date,project_id', 'booking_date', page);
      case 'categories': return paged('site_categories', 'id,kind,name', 'name', page, true);
      default: return Promise.resolve(empty);
    }
  };
  const extra = () => {
    switch (view) {
      case 'materials': return paged('site_material_movements', 'id,material_id,movement_type,quantity,movement_date,supplier,bill_number,amount,receipt_path', 'movement_date', secondaryPage);
      case 'labour': return paged('site_contractor_finances', 'id,contractor_id,entry_date,kind,amount,receipt_path', 'entry_date', secondaryPage);
      case 'sales': return paged('site_collections', 'id,booking_id,payment_date,payment_mode,reference,amount', 'payment_date', secondaryPage);
      default: return Promise.resolve(empty);
    }
  };
  const [primary, secondary, categories, projects, contractors, materials, bookings, summary] = await Promise.all([
    main(), extra(),
    view === 'expenses' || (canWrite && ['projects', 'materials', 'labour'].includes(view))
      ? lookup('site_categories', 'id,kind,name,is_active') : Promise.resolve([]),
    ['daily', 'labour', 'expenses', 'tasks', 'sales'].includes(view) || (canWrite && view === 'materials')
      ? lookup('site_projects', 'id,name') : Promise.resolve([]),
    view === 'labour' || (canWrite && view === 'daily')
      ? lookup('site_contractors', view === 'labour' ? 'id,name,work_type,daily_rate' : 'id,name') : Promise.resolve([]),
    view === 'materials' ? lookup('site_materials', 'id,name,unit') : Promise.resolve([]),
    view === 'sales' ? lookup('site_bookings', 'id,customer_name,booking_value') : Promise.resolve([]),
    view === 'dashboard' ? (async () => {
      const result = await supabase.rpc('site_management_summary', { org_id: orgId });
      if (result.error) throw new Error('Unable to load records. Please try again.');
      return (result.data || {}) as Row;
    })() : Promise.resolve({} as Row),
  ]);
  return { primary, secondary, categories: categories.filter(row => row.is_active), projects, contractors, materials, bookings, summary };
}
