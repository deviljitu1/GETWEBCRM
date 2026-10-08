'use server';
import { revalidatePath } from 'next/cache';
import { requireWriteOrg } from 'utils/crm/access';
import { rateLimit } from 'utils/crm/rate-limit';
import {
  dateTime,
  email,
  money,
  parseCsv,
  phone,
  text,
  uuid,
} from 'utils/crm/validation';
import type { ActionState } from 'components/crm/ActionForm';

function dbError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === '23505')
    throw new Error(
      'A matching record already exists. Review duplicates before saving.',
    );
  if (error.code === '42501')
    throw new Error('You do not have permission to make this change.');
  throw new Error('Unable to save. Check the fields and try again.');
}
async function save(
  context: Awaited<ReturnType<typeof requireWriteOrg>>,
  work: () => Promise<string>,
): Promise<ActionState> {
  try {
    await rateLimit(`write:${context.user.id}`);
    const message = await work();
    revalidatePath(`/${context.org.slug}`, 'layout');
    return { message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to save' };
  }
}
function leadFields(form: FormData) {
  const phoneValue = text(form, 'phone', 40);
  return {
    full_name: text(form, 'full_name', 160, true),
    phone: phoneValue || null,
    phone_normalized: phone(phoneValue),
    email: email(text(form, 'email', 254)) || null,
    property_interest: text(form, 'property_interest', 160) || null,
    city: text(form, 'city', 100) || null,
  };
}
async function leadDefaults(
  context: Awaited<ReturnType<typeof requireWriteOrg>>,
) {
  const result = await context.supabase
    .from('lead_stages')
    .select('id')
    .eq('organization_id', context.org.id)
    .order('sort_order')
    .limit(1)
    .single();
  dbError(result.error);
  return {
    organization_id: context.org.id,
    assigned_to: context.user.id,
    created_by: context.user.id,
    stage_id: result.data.id,
  };
}
export async function addLead(
  slug: string,
  _state: ActionState,
  form: FormData,
) {
  const context = await requireWriteOrg(slug, 'leads.create');
  return save(context, async () => {
    const defaults = await leadDefaults(context);
    const result = await context.supabase
      .from('leads')
      .insert({ ...defaults, ...leadFields(form) });
    dbError(result.error);
    return 'Lead added';
  });
}
export async function importLeads(
  slug: string,
  _state: ActionState,
  form: FormData,
) {
  const context = await requireWriteOrg(slug, 'leads.create');
  return save(context, async () => {
    const file = form.get('file');
    if (
      !(file instanceof File) ||
      !file.name.toLowerCase().endsWith('.csv') ||
      file.size > 1024 * 1024
    )
      throw new Error('Choose a CSV file up to 1 MB');
    const rows = parseCsv(await file.text());
    const defaults = await leadDefaults(context);
    const leads = rows.map((row) => {
      const data = new FormData();
      Object.entries(row).forEach(([key, value]) => data.set(key, value));
      return { ...defaults, ...leadFields(data) };
    });
    const result = await context.supabase.from('leads').insert(leads);
    dbError(result.error);
    return `${leads.length} leads imported`;
  });
}
export async function updateLead(
  slug: string,
  id: string,
  _state: ActionState,
  form: FormData,
) {
  const context = await requireWriteOrg(slug);
  return save(context, async () => {
    const stage_id = uuid(text(form, 'stage_id', 36, true));
    const assigned_to = text(form, 'assigned_to', 36);
    const changes = {
      ...leadFields(form),
      stage_id,
      next_followup_at: dateTime(text(form, 'next_followup_at', 40)),
      ...(context.permissions.has('leads.assign')
        ? { assigned_to: assigned_to ? uuid(assigned_to) : null }
        : {}),
    };
    const result = await context.supabase
      .from('leads')
      .update(changes)
      .eq('organization_id', context.org.id)
      .eq('id', uuid(id))
      .select('id')
      .maybeSingle();
    dbError(result.error);
    if (!result.data) throw new Error('Lead unavailable or update forbidden');
    return 'Lead updated';
  });
}
export async function addNote(
  slug: string,
  id: string,
  _state: ActionState,
  form: FormData,
) {
  const context = await requireWriteOrg(slug);
  return save(context, async () => {
    const result = await context.supabase
      .from('lead_activities')
      .insert({
        organization_id: context.org.id,
        lead_id: uuid(id),
        performed_by: context.user.id,
        body: text(form, 'body', 4000, true),
      });
    dbError(result.error);
    return 'Note added';
  });
}
export async function scheduleVisit(
  slug: string,
  id: string,
  _state: ActionState,
  form: FormData,
) {
  const context = await requireWriteOrg(slug);
  return save(context, async () => {
    const scheduled_at = dateTime(text(form, 'scheduled_at', 40, true));
    if (new Date(scheduled_at).getTime() <= Date.now())
      throw new Error('Choose a future visit time');
    const result = await context.supabase
      .from('site_visits')
      .insert({
        organization_id: context.org.id,
        lead_id: uuid(id),
        created_by: context.user.id,
        scheduled_at,
        notes: text(form, 'notes', 4000),
      });
    dbError(result.error);
    return 'Site visit scheduled';
  });
}
export async function updateVisit(
  slug: string,
  id: string,
  _state: ActionState,
  form: FormData,
) {
  const context = await requireWriteOrg(slug);
  return save(context, async () => {
    const status = text(form, 'status', 20, true);
    if (!['completed', 'cancelled'].includes(status))
      throw new Error('Invalid visit status');
    const result = await context.supabase
      .from('site_visits')
      .update({ status })
      .eq('organization_id', context.org.id)
      .eq('id', uuid(id))
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle();
    dbError(result.error);
    if (!result.data) throw new Error('Visit unavailable or already updated');
    return 'Visit updated';
  });
}
export async function addProperty(
  slug: string,
  _state: ActionState,
  form: FormData,
) {
  const context = await requireWriteOrg(slug, 'inventory.manage');
  return save(context, async () => {
    const result = await context.supabase
      .from('property_units')
      .insert({
        organization_id: context.org.id,
        project_name: text(form, 'project_name', 160, true),
        unit_number: text(form, 'unit_number', 80, true),
        configuration: text(form, 'configuration', 80),
        price: money(text(form, 'price', 16, true)),
      });
    dbError(result.error);
    return 'Property added';
  });
}
export async function updateProperty(
  slug: string,
  id: string,
  _state: ActionState,
  form: FormData,
) {
  const context = await requireWriteOrg(slug, 'inventory.manage');
  return save(context, async () => {
    const status = text(form, 'status', 20, true),
      previous = text(form, 'previous', 20, true);
    if (
      !['available', 'blocked', 'sold'].includes(status) ||
      !['available', 'blocked', 'sold'].includes(previous)
    )
      throw new Error('Invalid status');
    const result = await context.supabase
      .from('property_units')
      .update({ status })
      .eq('organization_id', context.org.id)
      .eq('id', uuid(id))
      .eq('status', previous)
      .select('id')
      .maybeSingle();
    dbError(result.error);
    if (!result.data)
      throw new Error('Property changed. Refresh before trying again.');
    return 'Property status updated';
  });
}
export async function saveSettings(
  slug: string,
  _state: ActionState,
  form: FormData,
) {
  const context = await requireWriteOrg(slug, 'settings.manage');
  return save(context, async () => {
    const result = await context.supabase
      .from('organizations')
      .update({
        name: text(form, 'name', 160, true),
        email: email(text(form, 'email', 254)) || null,
        phone: text(form, 'phone', 40) || null,
        legal_name: text(form, 'legal_name', 160) || null,
      })
      .eq('id', context.org.id)
      .select('id')
      .single();
    dbError(result.error);
    return 'Workspace profile saved';
  });
}
export async function inviteMember(
  slug: string,
  _state: ActionState,
  form: FormData,
) {
  const context = await requireWriteOrg(slug, 'settings.manage');
  return save(context, async () => {
    const result = await context.supabase
      .from('organization_invitations')
      .upsert(
        {
          organization_id: context.org.id,
          email: email(text(form, 'email', 254, true), true),
          role_id: uuid(text(form, 'role_id', 36, true)),
          invited_by: context.user.id,
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          accepted_at: null,
        },
        { onConflict: 'organization_id,email' },
      );
    dbError(result.error);
    return `Invitation saved for 7 days. Share /${slug}/login with this person. They must verify the invited email before access is granted.`;
  });
}
export async function manageMember(
  slug: string,
  id: string,
  _state: ActionState,
  form: FormData,
) {
  const context = await requireWriteOrg(slug, 'settings.manage');
  return save(context, async () => {
    const status = text(form, 'status', 20, true);
    if (!['active', 'disabled'].includes(status))
      throw new Error('Invalid member status');
    const result = await context.supabase.rpc('manage_member', {
      org_id: context.org.id,
      member_id: uuid(id),
      new_role: uuid(text(form, 'role_id', 36, true)),
      new_status: status,
    });
    dbError(result.error);
    return 'Team access updated';
  });
}
export async function revokeInvitation(
  slug: string,
  id: string,
  _state: ActionState,
) {
  const context = await requireWriteOrg(slug, 'settings.manage');
  return save(context, async () => {
    const result = await context.supabase.rpc('revoke_invitation', {
      org_id: context.org.id,
      invitation_id: uuid(id),
    });
    dbError(result.error);
    return 'Invitation revoked';
  });
}
