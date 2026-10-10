'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from 'utils/crm/access';
import { createAdminClient } from 'utils/supabase/admin';
import { rateLimit } from 'utils/crm/rate-limit';
import { email, money, text, uuid, validSlug } from 'utils/crm/validation';
import type { ActionState } from 'components/crm/ActionForm';

function check(error: { code?: string } | null) {
  if (error) throw new Error(error.code === '23505' ? 'A matching record already exists' : 'Unable to save. Check the fields and try again.');
}
export async function startTenantSupport(id: string, _state: ActionState, _form: FormData) {
  const {supabase,user} = await requirePlatformAdmin();
  let slug = '';
  const result = await save(user.id,async()=>{
    const orgId = uuid(id);
    const org = await supabase.from('organizations').select('slug,status').eq('id',orgId).single();
    if (org.error || org.data?.status !== 'active') throw new Error('Activate this workspace before opening support access.');
    const grant = await supabase.rpc('grant_support_management',{target_org_id:orgId});
    check(grant.error); slug=org.data.slug; return 'Support access opened';
  });
  if (result.error) return result;
  redirect(`/${slug}/dashboard`);
}
export async function endTenantSupport(id: string, _state: ActionState, _form: FormData) {
  const {supabase,user} = await requirePlatformAdmin();
  return save(user.id,async()=>{
    const result = await supabase.rpc('revoke_support_access',{target_org_id:uuid(id)});
    check(result.error); revalidatePath('/','layout'); return 'Support access ended';
  });
}
async function save(userId: string, work: () => Promise<string>): Promise<ActionState> {
  try { await rateLimit(`admin:${userId}`); const message = await work(); revalidatePath('/admin','layout'); return {message}; }
  catch (error) { return {error:error instanceof Error ? error.message : 'Unable to save'}; }
}
export async function createOrganization(_state: ActionState, form: FormData) {
  const {supabase,user} = await requirePlatformAdmin();
  return save(user.id,async()=>{
    const slug = text(form,'slug',80,true); if (!validSlug(slug)) throw new Error('Use a lowercase workspace slug with letters, numbers, or hyphens');
    const name = text(form,'name',160,true), address = email(text(form,'owner_email',254,true),true);
    const password = text(form,'password',100);
    let createdUserId: string | undefined;
    const admin = password ? createAdminClient() : null;
    if (password) {
      if (password.length < 12) throw new Error('Use a temporary password with at least 12 characters.');
      const account = await admin!.auth.admin.createUser({ email: address, password, email_confirm: true, app_metadata: { must_change_password: true } });
      if (account.error || !account.data.user) throw new Error('Unable to create the owner account. If this email already has an account, leave the temporary password blank.');
      createdUserId = account.data.user.id;
    }
    try {
      const result = await supabase.rpc('create_organization',{org_name:name,org_slug:slug,owner_email:address});
      check(result.error);
    } catch {
      if (createdUserId) {
        const cleanup = await admin!.auth.admin.deleteUser(createdUserId);
        if (cleanup.error) throw new Error('Owner account created, but workspace setup failed. Contact support before retrying.');
      }
      throw new Error('Unable to create workspace. Check the slug and verified owner email, then try again.');
    }
    return password ? 'Workspace and owner account created. Share the temporary password securely; the owner must change it at first login.' : 'Workspace created. The verified owner can now sign in.';
  });
}
export async function resetTenantOwnerPassword(id: string, _state: ActionState, form: FormData) {
  const {supabase,user} = await requirePlatformAdmin();
  return save(user.id,async()=>{
    const orgId = uuid(id);
    const password = text(form,'password',100,true);
    if (password.length < 12) throw new Error('Use a temporary password with at least 12 characters.');
    const owner = await supabase.from('organization_members').select('user_id,roles!inner(key)')
      .eq('organization_id',orgId).eq('status','active').eq('roles.key','owner').single();
    if (owner.error || !owner.data) throw new Error('Unable to verify this workspace owner.');
    if (owner.data.user_id === user.id) throw new Error('Change your own password from your account settings.');
    const admin = createAdminClient();
    const platform = await admin.from('platform_admins').select('user_id').eq('user_id',owner.data.user_id).maybeSingle();
    if (platform.error || platform.data) throw new Error('Platform administrator passwords cannot be reset here.');
    const account = await admin.auth.admin.getUserById(owner.data.user_id);
    if (account.error || !account.data.user || account.data.user.id !== owner.data.user_id) throw new Error('Unable to verify this workspace owner account.');
    const updated = await admin.auth.admin.updateUserById(owner.data.user_id, { password,
      app_metadata: { ...account.data.user.app_metadata, must_change_password: true } });
    if (updated.error) throw new Error('Unable to reset the password. Please try again.');
    return 'Temporary password set. Share it securely; the owner must change it at next login. This changes the account password for all of their workspaces.';
  });
}
export async function saveWorkspaceSettings(id: string, _state: ActionState, form: FormData) {
  const {supabase,user} = await requirePlatformAdmin();
  return save(user.id,async()=>{
    const status = text(form,'status',20,true); if (!['active','suspended','archived'].includes(status)) throw new Error('Invalid status');
    const seats = Number(text(form,'member_limit',4,true));
    if (!Number.isInteger(seats) || seats < 1 || seats > 1000) throw new Error('Set a member limit between 1 and 1000');
    const result = await supabase.rpc('save_workspace_settings',{org_id:uuid(id),new_status:status,seats});
    check(result.error); revalidatePath('/','layout'); return 'Workspace settings saved';
  });
}
export async function savePlan(id: string | null, _state: ActionState, form: FormData) {
  const {supabase,user} = await requirePlatformAdmin();
  return save(user.id,async()=>{
    const currency_code = text(form,'currency_code',3,true).toUpperCase();
    if (!['INR','USD','EUR','GBP'].includes(currency_code)) throw new Error('Unsupported currency');
    const providerPlan = text(form,'razorpay_plan_id',80);
    if (providerPlan && !/^plan_[A-Za-z0-9]+$/.test(providerPlan)) throw new Error('Invalid Razorpay plan ID');
    const plan = {name:text(form,'name',100,true),price_monthly:money(text(form,'price_monthly',16,true)),currency_code,is_active:form.get('is_active') === 'on',razorpay_plan_id:providerPlan || null};
    if (id) {
      const current = await supabase.from('plans').select('price_monthly,currency_code,razorpay_plan_id').eq('id',uuid(id)).single();
      check(current.error);
      if (current.data.razorpay_plan_id && (Number(current.data.price_monthly) !== plan.price_monthly || current.data.currency_code !== currency_code)) throw new Error('A connected subscription price is fixed. Contact support to configure a new price for future subscriptions.');
    }
    const result = id ? await supabase.from('plans').update(plan).eq('id',uuid(id)).select('id').single() : await supabase.from('plans').insert(plan);
    check(result.error); return 'Plan saved';
  });
}
export async function saveSubscription(_state: ActionState, form: FormData) {
  const {supabase,user} = await requirePlatformAdmin();
  return save(user.id,async()=>{
    const status = text(form,'status',20,true); if (!['trial','active','cancelled'].includes(status)) throw new Error('Invalid status');
    const result = await supabase.from('organization_subscriptions').upsert({organization_id:uuid(text(form,'organization_id',36,true)),plan_id:uuid(text(form,'plan_id',36,true)),status,updated_at:new Date().toISOString()});
    check(result.error); return 'Subscription record saved';
  });
}
export async function savePlatformSettings(_state: ActionState, form: FormData) {
  const {supabase,user} = await requirePlatformAdmin();
  return save(user.id,async()=>{
    const result = await supabase.from('platform_settings').update({name:text(form,'name',160,true),support_email:email(text(form,'support_email',254))}).eq('id',true).select('id').single();
    check(result.error); return 'Platform settings saved';
  });
}
