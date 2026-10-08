'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOrg } from 'utils/crm/access';
import { rateLimit } from 'utils/crm/rate-limit';
import {
  billingMode,
  razorpay,
  syncSubscription,
} from 'utils/billing/razorpay';
import type { ActionState } from 'components/crm/ActionForm';
import { createWorkspaceCheckout } from 'utils/billing/checkout';
import { getMonthlyPlan } from 'utils/billing/catalog';

export async function startSubscription(
  slug: string,
  _state: ActionState,
): Promise<ActionState> {
  const { user, org } = await requireOrg(slug, 'settings.manage', true);
  let checkout: string;
  try {
    await rateLimit(`billing:subscribe:${user.id}`, 3, 60);
    const plan = await getMonthlyPlan();
    if (!plan)
      throw new Error('Subscriptions are not available yet. Contact support.');
    checkout = await createWorkspaceCheckout(org.id, plan.id, 12);
    revalidatePath(`/${slug}/billing`);
    revalidatePath('/admin/billing');
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Unable to start subscription',
    };
  }
  redirect(checkout);
}
export async function cancelSubscription(
  slug: string,
  _state: ActionState,
): Promise<ActionState> {
  const { supabase, user, org } = await requireOrg(slug, 'settings.manage');
  try {
    await rateLimit(`billing:cancel:${user.id}`, 3, 60);
    const contract = await supabase
      .from('billing_contracts')
      .select('provider_id,mode,status')
      .eq('organization_id', org.id)
      .single();
    if (contract.error || contract.data.mode !== billingMode())
      throw new Error('Subscription unavailable');
    if (
      !['active', 'authenticated', 'pending', 'halted', 'paused'].includes(
        contract.data.status,
      )
    )
      throw new Error(
        'This subscription cannot be cancelled here. Contact support.',
      );
    await razorpay(`subscriptions/${contract.data.provider_id}/cancel`, {
      cancel_at_cycle_end: contract.data.status === 'active' ? 1 : 0,
    });
    await syncSubscription(contract.data.provider_id);
    revalidatePath(`/${slug}/billing`);
    return {
      message:
        'Cancellation requested. Active subscriptions stop renewing after the current billing cycle.',
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unable to cancel subscription',
    };
  }
}
