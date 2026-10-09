'use server';

import { revalidatePath } from 'next/cache';
import { requireWriteOrg } from 'utils/crm/access';
import { money, text, uuid } from 'utils/crm/validation';
import { rateLimit } from 'utils/crm/rate-limit';
import type { ActionState } from 'components/crm/ActionForm';

type Context = Awaited<ReturnType<typeof requireWriteOrg>>;

function date(form: FormData, key: string, required = false) {
  const value = text(form, key, 10, required);
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    throw new Error(`Enter a valid ${key.replaceAll('_', ' ')}.`);
  return value;
}

function count(form: FormData, key: string, max = 100000) {
  const value = Number(text(form, key, 12, true));
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error(`Enter a valid ${key.replaceAll('_', ' ')}.`);
  return value;
}

function amount(form: FormData, key: string, required = true) {
  const raw = text(form, key, 16, required);
  return raw ? money(raw) : null;
}

function choice(form: FormData, key: string, options: string[]) {
  const value = text(form, key, 32, true);
  if (!options.includes(value)) throw new Error(`Choose a valid ${key.replaceAll('_', ' ')}.`);
  return value;
}

function optionalId(form: FormData, key: string) {
  const value = text(form, key, 36);
  return value ? uuid(value) : null;
}

function dbError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === '23505') throw new Error('A matching record already exists.');
  if (error.message?.includes('Material use exceeds available stock')) throw new Error('Material use exceeds available stock.');
  if (error.message?.includes('Collection exceeds booking value')) throw new Error('Collection exceeds the booking value.');
  throw new Error('Unable to save. Check the details and try again.');
}

async function save(slug: string, work: (context: Context) => Promise<string>): Promise<ActionState> {
  const context = await requireWriteOrg(slug, 'sites.manage');
  try {
    await rateLimit(`sites:${context.user.id}`, 40, 60);
    const message = await work(context);
    revalidatePath(`/${slug}/sites`);
    return { message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to save.' };
  }
}

async function files(context: Context, form: FormData, key: string, imagesOnly = false, required = false) {
  const uploads = form.getAll(key).filter((value): value is File => value instanceof File && value.size > 0);
  if (required && uploads.length === 0) throw new Error('Add at least one site photo.');
  if (uploads.length > 1) throw new Error('Upload one file at a time.');
  const paths: string[] = [];
  for (const file of uploads) {
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' } as Record<string, string>)[file.type];
    if (!extension || (imagesOnly && extension === 'pdf') || file.size > 3 * 1024 * 1024)
      throw new Error('Use a JPG, PNG, WebP or PDF file under 3 MB.');
    const path = `${context.org.id}/${crypto.randomUUID()}.${extension}`;
    const uploaded = await context.supabase.storage.from('site-files').upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) throw new Error('Could not upload the file. Please try again.');
    paths.push(path);
  }
  return paths;
}

export async function addCategory(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async ({ supabase, org }) => {
    const result = await supabase.from('site_categories').insert({
      organization_id: org.id,
      kind: choice(form, 'kind', ['material','expense','work','contractor','stage']),
      name: text(form, 'name', 100, true),
    });
    dbError(result.error);
    return 'Category added.';
  });
}

export async function addProject(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async ({ supabase, org }) => {
    const result = await supabase.from('site_projects').insert({
      organization_id: org.id, name: text(form,'name',160,true),
      site_location: text(form,'site_location',250), site_incharge: text(form,'site_incharge',160),
      site_supervisor: text(form,'site_supervisor',160), start_date: date(form,'start_date'),
      target_completion_date: date(form,'target_completion_date'), current_stage: text(form,'current_stage',100,true),
      total_units: count(form,'total_units',1000000), pending_work: text(form,'pending_work',4000),
      remarks: text(form,'remarks',4000),
    });
    dbError(result.error);
    return 'Project created.';
  });
}

export async function updateProject(slug: string, id: string, _state: ActionState, form: FormData) {
  return save(slug, async ({ supabase, org }) => {
    const progress = Number(text(form,'completed_percent',6,true));
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) throw new Error('Progress must be between 0 and 100%.');
    const result = await supabase.from('site_projects').update({
      current_stage: text(form,'current_stage',100,true), completed_percent: progress,
      status: choice(form,'status',['active','completed','delayed','on_hold']),
      pending_work: text(form,'pending_work',4000), remarks: text(form,'remarks',4000),
      updated_at: new Date().toISOString(),
    }).eq('id',uuid(id)).eq('organization_id',org.id).select('id').single();
    dbError(result.error);
    return 'Project updated.';
  });
}

export async function addContractor(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async ({ supabase, org }) => {
    const result = await supabase.from('site_contractors').insert({
      organization_id: org.id, name: text(form,'name',160,true),
      work_type: text(form,'work_type',100), daily_rate: amount(form,'daily_rate') || 0,
    });
    dbError(result.error);
    return 'Contractor added.';
  });
}

export async function addMaterial(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async ({ supabase, org }) => {
    const result = await supabase.from('site_materials').insert({
      organization_id: org.id, name: text(form,'name',160,true), category_id: optionalId(form,'category_id'),
      unit: text(form,'unit',30,true), low_stock_level: amount(form,'low_stock_level') || 0,
    });
    dbError(result.error);
    return 'Material added.';
  });
}

export async function addDailyReport(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async (context) => {
    const { supabase, org } = context;
    const record = {
      organization_id: org.id, project_id: uuid(text(form,'project_id',36,true)),
      work_date: date(form,'work_date',true), work_description: text(form,'work_description',4000,true),
      location_floor: text(form,'location_floor',160), labour_count: count(form,'labour_count'),
      contractor_id: optionalId(form,'contractor_id'), material_used: text(form,'material_used',1000),
      work_completed: text(form,'work_completed',2000), pending_work: text(form,'pending_work',2000),
      supervisor: text(form,'supervisor',160,true),
      remarks: text(form,'remarks',2000),
    };
    const photoPaths = await files(context,form,'photos',true,true);
    const result = await supabase.from('site_daily_reports').insert({ ...record, photo_paths: photoPaths });
    if (result.error) await supabase.storage.from('site-files').remove(photoPaths);
    dbError(result.error);
    return 'Daily report submitted.';
  });
}

export async function addMaterialMovement(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async (context) => {
    const { supabase, org } = context;
    const quantity = amount(form,'quantity');
    if (!quantity || quantity <= 0) throw new Error('Quantity must be greater than zero.');
    const rate = amount(form,'unit_rate',false);
    const record = {
      organization_id: org.id, material_id: uuid(text(form,'material_id',36,true)),
      project_id: optionalId(form,'project_id'), movement_date: date(form,'movement_date',true),
      movement_type: choice(form,'movement_type',['received','used']), quantity,
      supplier: text(form,'supplier',160), bill_number: text(form,'bill_number',100),
      unit_rate: rate, amount: rate === null ? null : Math.round(quantity * rate * 100) / 100,
    };
    const receipt = await files(context,form,'receipt');
    const result = await supabase.from('site_material_movements').insert({ ...record, receipt_path: receipt[0] || null });
    if (result.error && receipt.length) await supabase.storage.from('site-files').remove(receipt);
    dbError(result.error);
    return 'Material movement recorded.';
  });
}

export async function addLabourEntry(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async ({ supabase, org }) => {
    const attendance = choice(form,'attendance',['present','absent']);
    const labourCount = count(form,'labour_count');
    const result = await supabase.from('site_labour_entries').insert({
      organization_id: org.id, project_id: uuid(text(form,'project_id',36,true)),
      contractor_id: uuid(text(form,'contractor_id',36,true)), work_date: date(form,'work_date',true),
      attendance, labour_count: attendance === 'absent' ? 0 : labourCount,
      work_status: choice(form,'work_status',['pending','in_progress','completed','on_hold']),
      remarks: text(form,'remarks',2000),
    });
    dbError(result.error);
    return 'Attendance recorded.';
  });
}

export async function addContractorFinance(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async (context) => {
    const { supabase, org } = context;
    const record = {
      organization_id: org.id, project_id: uuid(text(form,'project_id',36,true)),
      contractor_id: uuid(text(form,'contractor_id',36,true)), entry_date: date(form,'entry_date',true),
      kind: choice(form,'kind',['bill','advance','payment']), amount: amount(form,'amount'),
      remarks: text(form,'remarks',2000),
    };
    const receipt = await files(context,form,'receipt');
    const result = await supabase.from('site_contractor_finances').insert({ ...record, receipt_path: receipt[0] || null });
    if (result.error && receipt.length) await supabase.storage.from('site-files').remove(receipt);
    dbError(result.error);
    return 'Contractor amount recorded.';
  });
}

export async function addExpense(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async (context) => {
    const { supabase, org } = context;
    const record = {
      organization_id: org.id, project_id: uuid(text(form,'project_id',36,true)),
      expense_date: date(form,'expense_date',true), category_id: optionalId(form,'category_id'),
      particular: text(form,'particular',500,true), amount: amount(form,'amount'),
      paid_by: text(form,'paid_by',160), payment_mode: choice(form,'payment_mode',['cash','upi','bank','card','other']),
      approved_by: text(form,'approved_by',160),
      remarks: text(form,'remarks',2000),
    };
    const receipt = await files(context,form,'receipt');
    const result = await supabase.from('site_expenses').insert({ ...record, receipt_path: receipt[0] || null });
    if (result.error && receipt.length) await supabase.storage.from('site-files').remove(receipt);
    dbError(result.error);
    return 'Expense recorded.';
  });
}

export async function addTask(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async ({ supabase, org }) => {
    const result = await supabase.from('site_tasks').insert({
      organization_id: org.id, project_id: uuid(text(form,'project_id',36,true)),
      title: text(form,'title',200,true), assigned_person: text(form,'assigned_person',160),
      start_date: date(form,'start_date'), target_date: date(form,'target_date'),
      status: choice(form,'status',['pending','in_progress','completed','delayed','on_hold']),
      remarks: text(form,'remarks',2000),
    });
    dbError(result.error);
    return 'Task added.';
  });
}

export async function updateTask(slug: string, id: string, _state: ActionState, form: FormData) {
  return save(slug, async ({ supabase, org }) => {
    const status = choice(form,'status',['pending','in_progress','completed','delayed','on_hold']);
    const result = await supabase.from('site_tasks').update({
      status, completed_date: status === 'completed' ? new Date().toISOString().slice(0,10) : null,
      remarks: text(form,'remarks',2000), updated_at: new Date().toISOString(),
    }).eq('id',uuid(id)).eq('organization_id',org.id).select('id').single();
    dbError(result.error);
    return 'Task updated.';
  });
}

export async function addBooking(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async ({ supabase, org }) => {
    const result = await supabase.from('site_bookings').insert({
      organization_id: org.id, project_id: uuid(text(form,'project_id',36,true)),
      customer_name: text(form,'customer_name',160,true), booking_date: date(form,'booking_date',true),
      booking_value: amount(form,'booking_value'), remarks: text(form,'remarks',2000),
    });
    dbError(result.error);
    return 'Booking recorded.';
  });
}

export async function addCollection(slug: string, _state: ActionState, form: FormData) {
  return save(slug, async ({ supabase, org }) => {
    const result = await supabase.from('site_collections').insert({
      organization_id: org.id, booking_id: uuid(text(form,'booking_id',36,true)),
      payment_date: date(form,'payment_date',true), amount: amount(form,'amount'),
      payment_mode: choice(form,'payment_mode',['cash','upi','bank','card','other']),
      reference: text(form,'reference',160),
    });
    dbError(result.error);
    return 'Collection recorded.';
  });
}
