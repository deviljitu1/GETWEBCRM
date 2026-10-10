import WorkspaceNavigation from 'components/crm/WorkspaceNavigation';
import { requireOrg, checkQuery } from 'utils/crm/access';
import { createAdminClient } from 'utils/supabase/admin';
import { getMonthlyPlan } from 'utils/billing/catalog';
import { subscriptionSummary } from 'utils/billing/presentation';
import { billingConfiguration } from 'utils/billing/razorpay';
import SubscriptionPlan, {
  SubscriptionBadge,
} from 'components/crm/SubscriptionPlan';
import { cardClass } from 'components/crm/Fields';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { cancelSubscription, startSubscription } from './actions';

export default async function Billing({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { supabase, org, permissions } = await requireOrg(orgSlug);
  if (!permissions.has('settings.manage'))
    return (
      <div className={cardClass}><WorkspaceNavigation orgSlug={orgSlug} />
        <h1 className="text-2xl font-bold">Subscription & billing</h1>
        <p className="mt-4">
          Contact your workspace administrator to manage your subscription.
        </p>
      </div>
    );
  const [contract, monthlyPlan] = await Promise.all([
    supabase
      .from('billing_contracts')
      .select(
        'plan_id,status,mode,paid_until,paid_count,total_count,checkout_url',
      )
      .eq('organization_id', org.id)
      .maybeSingle(),
    getMonthlyPlan(),
  ]);
  checkQuery(contract.error);
  const record = contract.data;
  const summary = subscriptionSummary(record);
  const ended = summary.canRestart;
  let plan = monthlyPlan;
  if (record && !ended && record.plan_id !== monthlyPlan?.id) {
    const subscribed = await createAdminClient()
      .from('plans')
      .select('id,name,price_monthly,currency_code,is_active,razorpay_plan_id')
      .eq('id', record.plan_id)
      .single();
    checkQuery(subscribed.error);
    plan = subscribed.data;
  }
  const canSubscribe =
    billingConfiguration().configured && !!monthlyPlan?.razorpay_plan_id;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <WorkspaceNavigation orgSlug={orgSlug} />
      <div>
        <h1 className="text-2xl font-bold text-navy-700 dark:text-white sm:text-3xl">
          Subscription & billing
        </h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
          Manage the monthly subscription for {org.name}.
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {plan ? (
          <SubscriptionPlan
            name={plan.name}
            price={plan.price_monthly}
            currency={plan.currency_code}
          >
            {!record || ended ? (
              <>
                <ActionForm action={startSubscription.bind(null, orgSlug)}>
                  <Submit disabled={!canSubscribe}>
                    {ended ? 'Resubscribe' : 'Subscribe monthly'}
                  </Submit>
                </ActionForm>
                <p className="mt-3 text-xs text-gray-700 dark:text-gray-200">
                  {canSubscribe
                    ? 'Complete secure checkout with Razorpay. Billing starts after your first payment.'
                    : 'Checkout is temporarily unavailable. Contact support to subscribe.'}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-200">
                Your selected monthly plan. See your payment and renewal status
                under Your subscription.
              </p>
            )}
            <p className="mt-4 text-xs text-gray-700 dark:text-gray-200">
              Monthly billing. New subscriptions run for up to 12 monthly
              payments. Cancel renewal from this page.
            </p>
          </SubscriptionPlan>
        ) : (
          <section className={cardClass}>
            <h2 className="text-xl font-bold">Monthly subscription</h2>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">
              Our subscription plan is being prepared. Contact support for
              availability.
            </p>
          </section>
        )}
        <section className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Your subscription</h2>
            <SubscriptionBadge label={summary.label} tone={summary.tone} />
          </div>
          <dl className="mt-6 grid gap-5 rounded-2xl bg-gray-50 p-5 dark:bg-navy-900">
            <div>
              <dt className="text-xs text-gray-700 dark:text-gray-200">
                Billing frequency
              </dt>
              <dd className="mt-1 font-semibold">Monthly</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-700 dark:text-gray-200">
                {summary.dateLabel}
              </dt>
              <dd className="mt-1 font-semibold">{summary.date}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-700 dark:text-gray-200">
                Payment method
              </dt>
              <dd className="mt-1 font-semibold">
                Secure payment through Razorpay
              </dd>
            </div>
          </dl>
          {!record && (
            <p className="mt-5 text-sm text-gray-700 dark:text-gray-200">
              Choose Subscribe monthly to start your subscription. Your billing
              dates will appear here after payment.
            </p>
          )}
          {record?.mode === 'test' && (
            <p className="mt-5 rounded-xl bg-amber-100 p-4 text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
              This is a test subscription. Test payments do not activate paid
              workspace access.
            </p>
          )}
          {record && ['created', 'authenticated'].includes(record.status) && (
            <div className="mt-5">
              <p className="mb-4 text-sm text-gray-700 dark:text-gray-200">
                {record.status === 'created'
                  ? 'Complete checkout to activate your monthly subscription.'
                  : 'Payment authorization received. Waiting for Razorpay to confirm your first payment.'}
              </p>
              {record.checkout_url && (
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
                  href={record.checkout_url}
                  rel="noreferrer"
                >
                  Continue to payment
                </a>
              )}
            </div>
          )}
          {record &&
            ['pending', 'halted', 'paused'].includes(record.status) && (
              <p className="mt-5 rounded-xl bg-amber-100 p-4 text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                {record.status === 'paused'
                  ? 'Renewal is paused.'
                  : 'Your latest renewal has not been paid.'}{' '}
                Contact support to update your payment method and resume
                billing.
              </p>
            )}
          {record?.status === 'cancelled' && !ended && (
            <p className="mt-5 text-sm text-gray-700 dark:text-gray-200">
              Renewal is cancelled. Your paid access continues until{' '}
              {summary.date}.
            </p>
          )}
          {record &&
            ['active', 'authenticated', 'pending', 'halted', 'paused'].includes(
              record.status,
            ) && (
              <details className="mt-6 border-t border-gray-200 pt-5 dark:border-navy-600">
                <summary className="cursor-pointer text-sm font-semibold text-red-600 dark:text-red-300">
                  Cancel renewal
                </summary>
                <div className="mt-4 rounded-xl border border-red-200 p-4 dark:border-red-900">
                  <p className="mb-4 text-sm text-gray-700 dark:text-gray-200">
                    Future monthly payments will stop. Paid access remains
                    available until the current paid period ends. You can
                    resubscribe after that period.
                  </p>
                  <ActionForm action={cancelSubscription.bind(null, orgSlug)}>
                    <Submit>Confirm cancellation</Submit>
                  </ActionForm>
                </div>
              </details>
            )}
        </section>
      </div>
    </div>
  );
}
