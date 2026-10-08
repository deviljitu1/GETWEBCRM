'use server';
import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin } from 'utils/crm/access';
import { createAdminClient } from 'utils/supabase/admin';
import { rateLimit } from 'utils/crm/rate-limit';
import { text, uuid } from 'utils/crm/validation';
import {
  billingMode,
  razorpay,
  subscriptionData,
  syncSubscription,
} from 'utils/billing/razorpay';
import type { ProviderSubscription } from 'utils/billing/razorpay';
import type { ActionState } from 'components/crm/ActionForm';

type ProviderPlan = {
  id: string;
  period: string;
  interval: number;
  item: { amount: number; currency: string };
};

export async function checkRazorpayConnection(
  _state: ActionState,
): Promise<ActionState> {
  const { user } = await requirePlatformAdmin();
  try {
    await rateLimit(`billing:admin:${user.id}`, 10, 60);
    await razorpay('plans?count=1');
    return {
      message:
        'Razorpay accepted the API credentials. A successful checkout and webhook delivery are still required to verify payments.',
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Unable to verify Razorpay',
    };
  }
}

export async function createRazorpayPlan(
  id: string,
  _state: ActionState,
): Promise<ActionState> {
  const { supabase, user } = await requirePlatformAdmin();
  try {
    await rateLimit(`billing:admin:${user.id}`, 10, 60);
    const planId = uuid(id);
    const local = await supabase
      .from('plans')
      .select('name,price_monthly,currency_code,is_active,razorpay_plan_id')
      .eq('id', planId)
      .single();
    if (local.error || !local.data.is_active)
      throw new Error('Choose an active plan');
    if (local.data.razorpay_plan_id)
      throw new Error('This plan is already connected to Razorpay');
    if (local.data.currency_code !== 'INR')
      throw new Error('Razorpay subscription plans must use INR');
    if (Number(local.data.price_monthly) <= 0)
      throw new Error('Set a price greater than zero for a paid Razorpay plan');
    const remote = await razorpay<ProviderPlan>('plans', {
      period: 'monthly',
      interval: 1,
      item: {
        name: local.data.name,
        amount: Math.round(Number(local.data.price_monthly) * 100),
        currency: 'INR',
      },
    });
    if (!/^plan_[A-Za-z0-9]+$/.test(remote.id))
      throw new Error('Razorpay returned an invalid plan');
    const saved = await supabase
      .from('plans')
      .update({ razorpay_plan_id: remote.id })
      .eq('id', planId);
    if (saved.error)
      throw new Error(
        'The Razorpay plan was created but could not be linked. Contact support.',
      );
    revalidatePath('/admin/billing');
    return { message: 'Monthly Razorpay plan created and connected.' };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unable to create Razorpay plan',
    };
  }
}

export async function createCheckoutSubscription(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requirePlatformAdmin();
  try {
    await rateLimit(`billing:admin:${user.id}`, 10, 60);
    const org = uuid(text(form, 'organization_id', 36, true));
    const planId = uuid(text(form, 'plan_id', 36, true));
    const cycles = Number(text(form, 'billing_cycles', 3, true));
    if (!Number.isInteger(cycles) || cycles < 1 || cycles > 120)
      throw new Error('Billing cycles must be between 1 and 120');
    const [organization, existing] = await Promise.all([
      supabase.from('organizations').select('id').eq('id', org).single(),
      supabase
        .from('billing_contracts')
        .select('provider_id')
        .eq('organization_id', org)
        .maybeSingle(),
    ]);
    if (organization.error || !organization.data)
      throw new Error('Choose an existing workspace');
    if (existing.error)
      throw new Error('Unable to check the workspace checkout');
    if (existing.data)
      throw new Error(
        'This workspace already has a checkout. Use its existing payment link.',
      );
    const plan = await supabase
      .from('plans')
      .select('razorpay_plan_id,is_active,price_monthly,currency_code')
      .eq('id', planId)
      .single();
    if (plan.error || !plan.data.is_active || !plan.data.razorpay_plan_id)
      throw new Error('Connect this active plan to Razorpay first');
    const remotePlan = await razorpay<ProviderPlan>(
      `plans/${plan.data.razorpay_plan_id}`,
    );
    if (
      remotePlan.period !== 'monthly' ||
      remotePlan.interval !== 1 ||
      remotePlan.item.currency !== 'INR' ||
      plan.data.currency_code !== 'INR' ||
      remotePlan.item.amount !==
        Math.round(Number(plan.data.price_monthly) * 100)
    )
      throw new Error(
        'The Razorpay plan must match the CRM monthly price in INR',
      );
    const remote = subscriptionData(
      await razorpay<ProviderSubscription>('subscriptions', {
        plan_id: plan.data.razorpay_plan_id,
        total_count: cycles,
        customer_notify: 1,
        notes: { organization_id: org },
      }),
    );
    if (remote.plan_id !== plan.data.razorpay_plan_id || !remote.short_url)
      throw new Error('Razorpay returned an invalid checkout');
    const result = await createAdminClient().rpc('attach_billing_contract', {
      org_id: org,
      local_plan: planId,
      provider_sub: remote.id,
      provider_mode: billingMode(),
      provider_status: remote.status,
      checkout: remote.short_url,
      paid: remote.paid_count,
      paid_end: null,
      cycles: remote.total_count,
    });
    if (result.error)
      throw new Error(
        `Checkout created but could not be linked. Use Advanced to link ${remote.id}; do not create another checkout.`,
      );
    revalidatePath('/admin/billing');
    revalidatePath('/', 'layout');
    return {
      message:
        'Checkout created. Open the checkout below to share its payment link with the customer.',
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Unable to create checkout',
    };
  }
}

export async function attachSubscription(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requirePlatformAdmin();
  try {
    await rateLimit(`billing:admin:${user.id}`, 10, 60);
    const org = uuid(text(form, 'organization_id', 36, true)),
      planId = uuid(text(form, 'plan_id', 36, true));
    const providerId = text(form, 'subscription_id', 80, true);
    if (!/^sub_[A-Za-z0-9]+$/.test(providerId))
      throw new Error('Use the Razorpay subscription ID');
    const plan = await supabase
      .from('plans')
      .select('razorpay_plan_id,price_monthly,currency_code,is_active')
      .eq('id', planId)
      .single();
    if (plan.error || !plan.data.is_active || !plan.data.razorpay_plan_id)
      throw new Error('Choose an active plan linked to Razorpay');
    const remotePlan = await razorpay<{
      period: string;
      interval: number;
      item: { amount: number; currency: string };
    }>(`plans/${plan.data.razorpay_plan_id}`);
    if (
      remotePlan.period !== 'monthly' ||
      remotePlan.interval !== 1 ||
      remotePlan.item.currency !== 'INR' ||
      plan.data.currency_code !== 'INR' ||
      remotePlan.item.amount !==
        Math.round(Number(plan.data.price_monthly) * 100)
    )
      throw new Error(
        'The Razorpay plan must match the CRM monthly price in INR',
      );
    const remote = subscriptionData(
      await razorpay<ProviderSubscription>(`subscriptions/${providerId}`),
    );
    if (
      remote.id !== providerId ||
      remote.plan_id !== plan.data.razorpay_plan_id ||
      !remote.short_url
    )
      throw new Error(
        'Subscription does not match this plan or has no checkout link',
      );
    const result = await createAdminClient().rpc('attach_billing_contract', {
      org_id: org,
      local_plan: planId,
      provider_sub: providerId,
      provider_mode: billingMode(),
      provider_status: remote.status,
      checkout: remote.short_url,
      paid: remote.paid_count,
      paid_end:
        remote.status === 'active' && remote.paid_count > 0
          ? remote.paid_end
          : null,
      cycles: remote.total_count,
    });
    if (result.error)
      throw new Error(
        'Unable to link this subscription. Check the organization and any existing subscription.',
      );
    revalidatePath('/admin/billing');
    revalidatePath('/', 'layout');
    return {
      message:
        'Subscription linked. The workspace administrator can open its Razorpay checkout.',
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Unable to link subscription',
    };
  }
}
export async function enforcePayment(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requirePlatformAdmin();
  try {
    await rateLimit(`billing:admin:${user.id}`, 10, 60);
    const result = await supabase
      .from('billing_settings')
      .upsert({
        organization_id: uuid(text(form, 'organization_id', 36, true)),
        payment_required: form.get('payment_required') === 'on',
      });
    if (result.error) throw new Error('Unable to update payment requirement');
    revalidatePath('/', 'layout');
    return { message: 'Payment requirement updated' };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Unable to update billing',
    };
  }
}
export async function refreshSubscription(
  id: string,
  _state: ActionState,
): Promise<ActionState> {
  const { user } = await requirePlatformAdmin();
  try {
    await rateLimit(`billing:admin:${user.id}`, 10, 60);
    await syncSubscription(id);
    revalidatePath('/', 'layout');
    return { message: 'Razorpay status refreshed' };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Unable to refresh billing',
    };
  }
}
