import type { ReactNode } from 'react';
import { MdCheckCircle, MdError, MdOutlinePayments } from 'react-icons/md';
import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { savePlan, saveSubscription } from '../actions';
import {
  attachSubscription,
  checkRazorpayConnection,
  createCheckoutSubscription,
  createRazorpayPlan,
  enforcePayment,
  refreshSubscription,
} from './actions';
import { billingConfiguration } from 'utils/billing/razorpay';

type Plan = {
  id: string;
  name: string;
  price_monthly: number;
  currency_code: string;
  is_active: boolean;
  razorpay_plan_id?: string | null;
};
type Organization = { id: string; name: string };

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}
function Pill({ good, children }: { good: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
        good
          ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
      }`}
    >
      {good ? <MdCheckCircle /> : <MdError />}
      {children}
    </span>
  );
}
function Heading({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
        {step}
      </span>
      <div>
        <h2 className="text-lg font-bold text-navy-700 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
function PlanFields({ plan }: { plan?: Plan }) {
  return (
    <>
      <Field
        label="Plan name"
        name="name"
        required
        maxLength={100}
        defaultValue={plan?.name || ''}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Monthly price"
          name="price_monthly"
          type="number"
          min="0"
          max="9999999999.99"
          step="0.01"
          required
          defaultValue={plan?.price_monthly || 0}
        />
        <Select
          label="Currency"
          name="currency_code"
          defaultValue={plan?.currency_code || 'INR'}
        >
          {['INR', 'USD', 'EUR', 'GBP'].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <details className="rounded-xl border border-gray-200 p-3 dark:border-navy-600"><summary className="cursor-pointer text-sm">Advanced: use an existing Razorpay plan</summary><div className="mt-3"><Field
        label="Razorpay plan ID"
        name="razorpay_plan_id"
        maxLength={80}
        pattern="plan_[A-Za-z0-9]+"
        placeholder="Added automatically when connected"
        defaultValue={plan?.razorpay_plan_id || ''}
      /></div></details>
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 px-4 text-sm dark:border-navy-600">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={plan?.is_active ?? true}
        />
        Available for new subscriptions
      </label>
      <Submit>{plan ? 'Save changes' : 'Create plan'}</Submit>
    </>
  );
}

export default async function Billing() {
  const { supabase } = await requirePlatformAdmin();
  const [plans, orgs, subscriptions, contracts, settings] = await Promise.all([
    supabase.from('plans').select('*').order('name'),
    supabase.from('organizations').select('id,name').order('name'),
    supabase
      .from('organization_subscriptions')
      .select('organization_id,plan_id,status'),
    supabase
      .from('billing_contracts')
      .select(
        'organization_id,provider_id,status,mode,paid_until,checkout_url',
      ),
    supabase
      .from('billing_settings')
      .select('organization_id,payment_required'),
  ]);
  [plans, orgs, subscriptions, contracts, settings].forEach((r) =>
    checkQuery(r.error),
  );
  const planRows = plans.data as Plan[],
    orgRows = orgs.data as Organization[],
    config = billingConfiguration();
  const connected = planRows.filter((p) => p.razorpay_plan_id && p.is_active && p.currency_code === 'INR');
  const checkoutOrgs = orgRows.filter(o => !contracts.data.some(c => c.organization_id === o.id));
  const orgName = (id: string) =>
    orgRows.find((o) => o.id === id)?.name || 'Unknown workspace';
  const planName = (id: string) =>
    planRows.find((p) => p.id === id)?.name || 'Unknown plan';

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              Subscription setup
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Plans and payments, in one place
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Create a monthly plan, assign it to a workspace, and generate its
              secure Razorpay checkout.
            </p>
          </div>
          <Pill good={config.configured}>
            {config.configured
              ? `${config.mode === 'live' ? 'Live' : 'Test'} credentials saved`
              : 'Razorpay needs attention'}
          </Pill>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [planRows.length, 'Plans'],
            [connected.length, 'Connected'],
            [contracts.data.length, 'Checkouts'],
            [subscriptions.data.length, 'Assignments'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-white/70">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {config.configured && <section className={cardClass}><h2 className="font-bold">Check your payment connection</h2><p className="mb-4 mt-1 text-sm text-gray-500">Verify that Razorpay accepts your saved API credentials. This does not charge anyone.</p><ActionForm action={checkRazorpayConnection}><Submit>Verify Razorpay connection</Submit></ActionForm></section>}

      {!config.configured && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex gap-3">
            <MdError className="mt-0.5 shrink-0 text-xl" />
            <div>
              <h2 className="font-bold">Finish Razorpay setup</h2>
              <p className="mt-1 text-sm">
                {config.problem || `Missing: ${config.missing.join(', ')}.`}
              </p>
              <p className="mt-2 text-xs opacity-80">
                Checkout creation remains disabled until the deployment has
                valid credentials and a webhook secret.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className={cardClass}>
        <Heading
          step={1}
          title="Create and connect plans"
          description="Define the monthly price, then connect each INR plan to Razorpay once."
        />
        <details
          className="rounded-2xl border border-dashed border-brand-300 p-4"
          open={!planRows.length}
        >
          <summary className="cursor-pointer font-semibold text-brand-500">
            + Add a new plan
          </summary>
          <ActionForm action={savePlan.bind(null, null)} reset className="mt-5">
            <PlanFields />
          </ActionForm>
        </details>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {planRows.map((plan) => (
            <article
              key={plan.id}
              className="rounded-2xl border border-gray-200 p-4 dark:border-navy-600"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="mt-1 text-2xl font-bold text-brand-500">
                    {money(plan.price_monthly, plan.currency_code)}
                    <span className="text-sm font-normal text-gray-500">
                      {' '}
                      / month
                    </span>
                  </p>
                </div>
                <Pill good={Boolean(plan.razorpay_plan_id)}>
                  {plan.razorpay_plan_id
                    ? 'Razorpay connected'
                    : 'Connection required'}
                </Pill>
              </div>
              {!plan.razorpay_plan_id && (
                <ActionForm
                  action={createRazorpayPlan.bind(null, plan.id)}
                  className="mt-4"
                >
                  <Submit disabled={!config.configured || !plan.is_active || plan.currency_code !== 'INR'}>Connect plan to Razorpay</Submit>
                </ActionForm>
              )}
              <details className="mt-4 border-t border-gray-100 pt-4 dark:border-navy-600">
                <summary className="cursor-pointer text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Edit plan details
                </summary>
                <ActionForm
                  action={savePlan.bind(null, plan.id)}
                  className="mt-4"
                >
                  <PlanFields plan={plan} />
                </ActionForm>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className={cardClass}>
        <Heading
          step={2}
          title="Assign a plan to a workspace"
          description="This records the agreed plan. It does not charge the customer."
        />
        {orgRows.length && planRows.length ? (
          <ActionForm action={saveSubscription}>
            <div className="grid gap-4 md:grid-cols-3">
              <Select
                label="Workspace"
                name="organization_id"
                defaultValue={orgRows[0].id}
              >
                {orgRows.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
              <Select label="Plan" name="plan_id" defaultValue={planRows[0].id}>
                {planRows.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Select label="Account status" name="status" defaultValue="trial">
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <Submit>Save workspace plan</Submit>
          </ActionForm>
        ) : (
          <p className="text-sm text-gray-500">
            Create a workspace and a plan first.
          </p>
        )}
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 dark:border-navy-600">
          {subscriptions.data.map((s) => (
            <div
              className="flex flex-col gap-2 border-b p-4 last:border-0 dark:border-navy-600 sm:flex-row sm:items-center sm:justify-between"
              key={s.organization_id}
            >
              <div>
                <p className="font-semibold">{orgName(s.organization_id)}</p>
                <p className="text-sm text-gray-500">{planName(s.plan_id)}</p>
              </div>
              <Pill good={s.status === 'active'}>{s.status}</Pill>
            </div>
          ))}
          {!subscriptions.data.length && (
            <p className="p-4 text-sm text-gray-500">
              No workspace plans assigned yet.
            </p>
          )}
        </div>
      </section>

      <section className={cardClass}>
        <Heading
          step={3}
          title="Create the customer checkout"
          description="Generate and attach the Razorpay payment link automatically."
        />
        {config.configured && checkoutOrgs.length > 0 && connected.length > 0 ? (
          <ActionForm action={createCheckoutSubscription}>
            <div className="grid gap-4 md:grid-cols-3">
              <Select
                label="Workspace"
                name="organization_id"
                defaultValue={checkoutOrgs[0].id}
              >
                {checkoutOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Connected plan"
                name="plan_id"
                defaultValue={connected[0].id}
              >
                {connected.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.price_monthly, p.currency_code)}
                  </option>
                ))}
              </Select>
              <Field
                label="Monthly payments"
                name="billing_cycles"
                type="number"
                min="1"
                max="120"
                defaultValue="12"
                required
              />
            </div>
            <p className="text-xs text-gray-500">The customer authorizes recurring payments at checkout. Creating a link does not charge them.</p><Submit>Create Razorpay checkout</Submit>
          </ActionForm>
        ) : (
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-navy-700 dark:text-gray-300">
            Finish Razorpay setup and connect at least one INR plan to enable
            checkout creation.
          </div>
        )}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {contracts.data.map((c) => (
            <article
              key={c.provider_id}
              className="rounded-2xl border border-gray-200 p-4 dark:border-navy-600"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{orgName(c.organization_id)}</p>
                  <p className="text-sm text-gray-500">
                    {c.mode === 'live' ? 'Live payment' : 'Test payment'}
                  </p>
                </div>
                <Pill good={c.status === 'active'}>{c.status}</Pill>
              </div>
              <p className="mt-3 text-sm">
                Paid through:{' '}
                {c.paid_until
                  ? new Date(c.paid_until).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                    })
                  : 'Payment pending'}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {c.checkout_url && (
                  <a
                    className="rounded-xl border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-500"
                    href={c.checkout_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open checkout
                  </a>
                )}
                <ActionForm
                  action={refreshSubscription.bind(null, c.provider_id)}
                >
                  <Submit>Refresh payment status</Submit>
                </ActionForm>
              </div>
            </article>
          ))}
          {!contracts.data.length && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-navy-600">
              No Razorpay checkout created yet.
            </div>
          )}
        </div>
        <details className="mt-5 border-t border-gray-100 pt-4 dark:border-navy-600">
          <summary className="cursor-pointer text-sm font-semibold text-gray-600 dark:text-gray-300">
            Advanced: link an existing Razorpay subscription
          </summary>
          {orgRows.length > 0 && planRows.length > 0 && (
            <ActionForm action={attachSubscription} className="mt-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Select
                  label="Workspace"
                  name="organization_id"
                  defaultValue={orgRows[0].id}
                >
                  {orgRows.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Plan"
                  name="plan_id"
                  defaultValue={planRows[0].id}
                >
                  {planRows.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Field
                  label="Razorpay subscription ID"
                  name="subscription_id"
                  required
                  pattern="sub_[A-Za-z0-9]+"
                  maxLength={80}
                />
              </div>
              <Submit>Link existing subscription</Submit>
            </ActionForm>
          )}
        </details>
      </section>

      <section className={cardClass}>
        <div className="mb-5 flex items-start gap-3">
          <MdOutlinePayments className="mt-1 text-2xl text-brand-500" />
          <div>
            <h2 className="text-lg font-bold">Workspace payment access</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enable this only after a live payment succeeds. Unpaid customers
              keep billing access but lose CRM workspace access.
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {orgRows.map((o) => {
            const required =
              settings.data.find((s) => s.organization_id === o.id)
                ?.payment_required || false;
            return (
              <ActionForm
                key={o.id}
                action={enforcePayment}
                className="rounded-2xl border border-gray-200 p-4 dark:border-navy-600"
              >
                <input type="hidden" name="organization_id" value={o.id} />
                <div>
                  <p className="font-semibold">{o.name}</p>
                  <p className="text-xs text-gray-500">
                    {required
                      ? 'Paid access is required'
                      : 'CRM access is currently open'}
                  </p>
                </div>
                <label className="flex min-h-11 items-center gap-3 rounded-xl bg-gray-50 px-4 text-sm dark:bg-navy-700">
                  <input
                    type="checkbox"
                    name="payment_required"
                    defaultChecked={required}
                  />
                  Require an active paid subscription
                </label>
                <Submit>Save access rule</Submit>
              </ActionForm>
            );
          })}
        </div>
      </section>
    </div>
  );
}
