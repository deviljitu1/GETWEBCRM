'use server';
import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin } from 'utils/crm/access';
import { rateLimit } from 'utils/crm/rate-limit';
import { email, money, text, uuid, validSlug } from 'utils/crm/validation';
import type { ActionState } from 'components/crm/ActionForm';

function check(error: { code?: string } | null) {
  if (error) throw new Error(error.code === '23505' ? 'A matching record already exists' : 'Unable to save. Check the fields and try again.');
}
async function save(userId: string, work: () => Promise<string>): Promise<ActionState> {
  try { await rateLimit(`admin:${userId}`); const message = await work(); revalidatePath('/admin','layout'); return {message}; }
  catch (error) { return {error:error instanceof Error ? error.message : 'Unable to save'}; }
}
export async function createOrganization(_state: ActionState, form: FormData) {
  const {supabase,user} = await requirePlatformAdmin();
  return save(user.id,async()=>{
    const slug = text(form,'slug',80,true); if (!validSlug(slug)) throw new Error('Use a lowercase workspace slug with letters, numbers, or hyphens');
    const result = await supabase.rpc('create_organization',{org_name:text(form,'name',160,true),org_slug:slug,owner_email:email(text(form,'owner_email',254,true),true)});
    check(result.error); return 'Workspace created. The verified owner can now sign in.';
  });
}
export async function setOrganizationStatus(id: string, _state: ActionState, form: FormData) {
  const {supabase,user} = await requirePlatformAdmin();
  return save(user.id,async()=>{
    const status = text(form,'status',20,true); if (!['active','suspended','archived'].includes(status)) throw new Error('Invalid status');
    const result = await supabase.rpc('set_organization_status',{org_id:uuid(id),new_status:status});
    check(result.error); revalidatePath('/','layout'); return 'Workspace status updated';
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
