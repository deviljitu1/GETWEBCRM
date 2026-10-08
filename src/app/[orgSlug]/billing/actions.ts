'use server';
import { revalidatePath } from 'next/cache';
import { requireOrg } from 'utils/crm/access';
import { rateLimit } from 'utils/crm/rate-limit';
import { billingMode, razorpay, syncSubscription } from 'utils/billing/razorpay';
import type { ActionState } from 'components/crm/ActionForm';
export async function cancelSubscription(slug: string, _state: ActionState): Promise<ActionState> {
  const { supabase, user, org } = await requireOrg(slug, 'settings.manage');
  try {
    await rateLimit(`billing:cancel:${user.id}`, 3, 60);
    const contract = await supabase.from('billing_contracts').select('provider_id,mode,status').eq('organization_id',org.id).single();
    if (contract.error || contract.data.mode !== billingMode()) throw new Error('Subscription unavailable');
    if (!['active','authenticated','pending','halted','paused'].includes(contract.data.status)) throw new Error('This subscription cannot be cancelled here. Contact support.');
    await razorpay(`subscriptions/${contract.data.provider_id}/cancel`, { cancel_at_cycle_end: contract.data.status === 'active' ? 1 : 0 });
    await syncSubscription(contract.data.provider_id);
    revalidatePath(`/${slug}/billing`); return { message: 'Cancellation requested. Active subscriptions stop renewing after the current billing cycle.' };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Unable to cancel subscription' }; }
}
