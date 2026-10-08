import 'server-only';
import { createAdminClient } from 'utils/supabase/admin';
import { billingMode, razorpay, subscriptionData } from './razorpay';
import type { ProviderSubscription } from './razorpay';

// Call only after authorizing the administrator for this workspace.
export async function createWorkspaceCheckout(
  org: string,
  planId: string,
  cycles: number,
) {
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 120)
    throw new Error('Billing cycles must be between 1 and 120');
  const admin = createAdminClient();
  const [organization, existing, plan] = await Promise.all([
    admin.from('organizations').select('id').eq('id', org).single(),
    admin
      .from('billing_contracts')
      .select('provider_id,status,paid_until')
      .eq('organization_id', org)
      .maybeSingle(),
    admin
      .from('plans')
      .select('razorpay_plan_id,is_active,price_monthly,currency_code')
      .eq('id', planId)
      .single(),
  ]);
  if (organization.error || !organization.data)
    throw new Error('Choose an existing workspace');
  if (existing.error)
    throw new Error('Unable to check the workspace subscription');
  if (
    existing.data &&
    (!['cancelled', 'completed', 'expired'].includes(existing.data.status) ||
      (existing.data.paid_until &&
        Date.parse(existing.data.paid_until) > Date.now()))
  )
    throw new Error(
      'This workspace already has a subscription. Manage its existing subscription.',
    );
  if (plan.error || !plan.data?.is_active || !plan.data.razorpay_plan_id)
    throw new Error('This subscription plan is not available yet');
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
    remotePlan.item.amount !== Math.round(Number(plan.data.price_monthly) * 100)
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
  const result = await admin.rpc('attach_billing_contract', {
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
      `Checkout created but could not be linked. Contact support with ${remote.id}; do not create another checkout.`,
    );
  return remote.short_url;
}
