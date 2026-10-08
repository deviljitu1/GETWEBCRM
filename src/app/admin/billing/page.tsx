import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import SubscriptionPlan, {
  SubscriptionBadge,
} from 'components/crm/SubscriptionPlan';
import { monthlyPrice, subscriptionSummary } from 'utils/billing/presentation';
import { savePlan } from '../actions';
import {
  attachSubscription,
  checkRazorpayConnection,
  createCheckoutSubscription,
  createRazorpayPlan,
  refreshSubscription,
} from './actions';
import { billingConfiguration } from 'utils/billing/razorpay';

export default async function Billing() {
  const { supabase } = await requirePlatformAdmin();
  const [plans, orgs, contracts] = await Promise.all([
    supabase.from('plans').select('*').order('name'),
    supabase
      .from('organizations')
      .select('id,name,slug')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('billing_contracts')
      .select(
        'organization_id,plan_id,provider_id,status,mode,paid_until,paid_count,checkout_url',
      ),
  ]);
  [plans, orgs, contracts].forEach((r) => checkQuery(r.error));
  const plan = plans.data.find((p) => p.is_active && p.currency_code === 'INR');
  const config = billingConfiguration();
  const availableOrgs = orgs.data.filter(
    (o) => !contracts.data.some((c) => c.organization_id === o.id),
  );
  const active = contracts.data.filter(
    (c) => subscriptionSummary(c).label === 'Active',
  );
  const revenue = active.reduce(
    (total, c) =>
      total +
      Number(
        plans.data.find((p) => p.id === c.plan_id && p.currency_code === 'INR')
          ?.price_monthly || 0,
      ),
    0,
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-700 dark:text-white sm:text-3xl">
          Subscriptions
        </h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
          Your monthly plan, subscribers and renewal dates in one place.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Monthly recurring revenue', monthlyPrice(revenue, 'INR')],
          ['Active subscriptions', active.length],
          ['Workspaces', orgs.data.length],
        ].map(([label, value]) => (
          <section key={label} className={cardClass}>
            <p className="text-sm text-gray-700 dark:text-gray-200">{label}</p>
            <p className="mt-2 text-2xl font-bold text-navy-700 dark:text-white">
              {value}
            </p>
          </section>
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        {plan ? (
          <SubscriptionPlan
            name={plan.name}
            price={plan.price_monthly}
            currency={plan.currency_code}
          >
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Billed monthly through Razorpay. Customers subscribe from their
              workspace billing page.
            </p>
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold text-brand-500">
                Edit monthly plan
              </summary>
              <ActionForm
                action={savePlan.bind(null, plan.id)}
                className="mt-4"
              >
                <Field
                  label="Plan name"
                  name="name"
                  defaultValue={plan.name}
                  required
                  maxLength={100}
                />
                <Field
                  label="Monthly price (₹)"
                  name="price_monthly"
                  type="number"
                  min="1"
                  step="0.01"
                  max="9999999999.99"
                  defaultValue={plan.price_monthly}
                  readOnly={!!plan.razorpay_plan_id}
                  required
                />
                <input type="hidden" name="currency_code" value="INR" />
                <input type="hidden" name="is_active" value="on" />
                <Field
                  label="Razorpay monthly plan ID"
                  name="razorpay_plan_id"
                  defaultValue={plan.razorpay_plan_id || ''}
                  pattern="plan_[A-Za-z0-9]+"
                  maxLength={80}
                />
                <p className="text-xs text-gray-700 dark:text-gray-200">
                  Once connected, the subscription price is fixed. Contact
                  support to configure a new price for future subscriptions.
                </p>
                <Submit>Save plan</Submit>
              </ActionForm>
            </details>
          </SubscriptionPlan>
        ) : (
          <section className={cardClass}>
            <h2 className="text-xl font-bold">Set your monthly plan</h2>
            <p className="mb-5 mt-2 text-sm text-gray-700 dark:text-gray-200">
              One subscription for every workspace.
            </p>
            <ActionForm action={savePlan.bind(null, null)}>
              <Field
                label="Plan name"
                name="name"
                defaultValue="Starter"
                required
                maxLength={100}
              />
              <Field
                label="Monthly price (₹)"
                name="price_monthly"
                type="number"
                min="1"
                step="0.01"
                defaultValue="2500"
                required
              />
              <input type="hidden" name="currency_code" value="INR" />
              <input type="hidden" name="is_active" value="on" />
              <Submit>Save monthly plan</Submit>
            </ActionForm>
          </section>
        )}
        <section className={cardClass}>
          <h2 className="text-xl font-bold text-navy-700 dark:text-white">
            Workspace subscriptions
          </h2>
          <p className="mb-5 mt-2 text-sm text-gray-700 dark:text-gray-200">
            Status updates automatically after verified payments.
          </p>
          <div className="flex flex-col gap-4">
            {orgs.data.map((org) => {
              const record =
                contracts.data.find((c) => c.organization_id === org.id) ||
                null;
              const summary = subscriptionSummary(record);
              const subscribedPlan = record
                ? plans.data.find((p) => p.id === record.plan_id)
                : null;
              const displayPlan = subscribedPlan || plan;
              return (
                <article
                  key={org.id}
                  className="min-w-0 rounded-2xl border border-gray-200 p-4 dark:border-navy-600"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold">{org.name}</h3>
                    <SubscriptionBadge
                      label={summary.label}
                      tone={summary.tone}
                    />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-700 dark:text-gray-200">
                        {record ? 'Monthly subscription' : 'Available plan'}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {displayPlan?.name || 'Coming soon'}
                        {displayPlan &&
                          ` · ${monthlyPrice(
                            displayPlan.price_monthly,
                            displayPlan.currency_code,
                          )} / month`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-700 dark:text-gray-200">
                        {summary.dateLabel}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {summary.date}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {record && (
                      <>
                        <ActionForm
                          action={refreshSubscription.bind(
                            null,
                            record.provider_id,
                          )}
                        >
                          <Submit>Refresh status</Submit>
                        </ActionForm>
                        {['created', 'authenticated'].includes(record.status) &&
                          record.checkout_url && (
                            <a
                              href={record.checkout_url}
                              rel="noreferrer"
                              className="text-sm font-semibold text-brand-500"
                            >
                              Payment link ↗
                            </a>
                          )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
            {!orgs.data.length && (
              <p className="py-6 text-sm text-gray-700 dark:text-gray-200">
                Subscriptions will appear here when you create your first
                workspace.
              </p>
            )}
          </div>
        </section>
      </div>
      <details className={cardClass}>
        <summary className="cursor-pointer font-semibold text-navy-700 dark:text-white">
          Payment settings
        </summary>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="font-bold">Razorpay connection</h2>
            <p className="mb-4 mt-2 text-sm text-gray-700 dark:text-gray-200">
              {config.configured
                ? `${
                    config.mode === 'live' ? 'Live' : 'Test'
                  } credentials saved. Verify the connection before accepting subscriptions.`
                : config.problem ||
                  'Add the Razorpay API keys and webhook secret in your hosting settings.'}
            </p>
            <ActionForm action={checkRazorpayConnection}>
              <Submit disabled={!config.configured}>Verify connection</Submit>
            </ActionForm>
            {plan && !plan.razorpay_plan_id && (
              <div className="mt-5">
                <p className="mb-3 text-sm text-gray-700 dark:text-gray-200">
                  Connect your monthly plan to enable customer checkout.
                </p>
                <ActionForm action={createRazorpayPlan.bind(null, plan.id)}>
                  <Submit disabled={!config.configured}>
                    Enable subscription checkout
                  </Submit>
                </ActionForm>
              </div>
            )}
          </div>
          <div>
            <h2 className="font-bold">Send a subscription link</h2>
            <p className="mb-4 mt-2 text-sm text-gray-700 dark:text-gray-200">
              Customers can subscribe themselves. You can also create a payment
              link for a workspace; billing starts when they complete checkout.
            </p>
            {availableOrgs.length && plan ? (
              <ActionForm action={createCheckoutSubscription}>
                <Select
                  label="Workspace"
                  name="organization_id"
                  defaultValue={availableOrgs[0].id}
                >
                  {availableOrgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
                <input type="hidden" name="plan_id" value={plan.id} />
                <input type="hidden" name="billing_cycles" value="12" />
                <Submit disabled={!config.configured || !plan.razorpay_plan_id}>
                  Create subscription link
                </Submit>
              </ActionForm>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {plan
                  ? 'Every workspace already has a subscription.'
                  : 'Set up your monthly plan first.'}
              </p>
            )}
          </div>
        </div>
        {plan && (
          <details className="mt-6 border-t border-gray-200 pt-5 dark:border-navy-600">
            <summary className="cursor-pointer text-sm text-gray-700 dark:text-gray-200">
              Recover an existing Razorpay subscription
            </summary>
            <ActionForm action={attachSubscription} className="mt-4 max-w-xl">
              <Select label="Workspace" name="organization_id">
                {orgs.data.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
              <input type="hidden" name="plan_id" value={plan.id} />
              <Field
                label="Razorpay subscription ID"
                name="subscription_id"
                pattern="sub_[A-Za-z0-9]+"
                required
                maxLength={80}
              />
              <Submit disabled={!config.configured || !plan.razorpay_plan_id}>
                Recover subscription
              </Submit>
            </ActionForm>
          </details>
        )}
      </details>
    </div>
  );
}
