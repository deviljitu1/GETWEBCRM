import { requireOrg, checkQuery } from 'utils/crm/access';
import { cardClass } from 'components/crm/Fields';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { cancelSubscription } from './actions';
export default async function Billing({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { supabase, org, permissions } = await requireOrg(orgSlug, undefined, true);
  if (!permissions.has('settings.manage')) return <div className={cardClass}><h1 className="text-2xl font-bold">Workspace subscription</h1><p className="mt-4">Contact your workspace administrator to manage billing or restore subscription access.</p></div>;
  
  const [contract, sub, settings] = await Promise.all([
    supabase.from('billing_contracts').select('status,mode,paid_until,total_count,checkout_url').eq('organization_id',org.id).maybeSingle(),
    supabase.from('organization_subscriptions').select('status,plan_id').eq('organization_id',org.id).maybeSingle(),
    supabase.from('billing_settings').select('payment_required').eq('organization_id',org.id).maybeSingle(),
  ]);
  
  let plan = null;
  if (sub.data?.plan_id) {
    const p = await supabase.from('plans').select('name,price_monthly,currency_code').eq('id', sub.data.plan_id).maybeSingle();
    plan = p.data;
  }

  const record = contract.data;
  const paymentRequired = settings.data?.payment_required ?? false;
  const hasPaidContract = record?.mode === 'live' && record?.status === 'active' && record?.paid_until && new Date(record.paid_until) > new Date();
  
  const featuresActive = !paymentRequired || hasPaidContract;

  return <div className="flex flex-col gap-6">
    <div className={cardClass}>
      <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4 dark:border-navy-700">
        <h1 className="text-2xl font-bold text-navy-700 dark:text-white">Workspace subscription</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${featuresActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {featuresActive ? 'Features Active' : 'Features Blocked'}
        </span>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-100 p-4 dark:border-navy-700">
          <h2 className="mb-1 text-sm font-semibold text-gray-500">Current Plan</h2>
          {plan ? (
            <div>
              <p className="text-lg font-bold text-navy-700 dark:text-white">{plan.name}</p>
              <p className="text-sm text-gray-500">Assigned status: <span className="uppercase">{sub.data?.status}</span></p>
            </div>
          ) : (
            <p className="text-navy-700 dark:text-white">No plan assigned</p>
          )}
        </div>
        
        <div className="rounded-xl border border-gray-100 p-4 dark:border-navy-700">
          <h2 className="mb-1 text-sm font-semibold text-gray-500">Paid Access</h2>
          {record?.paid_until ? (
            <div>
              <p className="text-lg font-bold text-navy-700 dark:text-white">
                {new Date(record.paid_until).toLocaleString('en-IN',{timeZone:'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short'})}
              </p>
              <p className="text-sm text-gray-500">
                {record.mode === 'test' ? 'Test payment (does not grant access)' : 'Live subscription'}
              </p>
            </div>
          ) : (
            <p className="text-navy-700 dark:text-white">{paymentRequired ? 'Awaiting payment' : 'No payment required currently'}</p>
          )}
        </div>
      </div>

      {!featuresActive && <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
        <p className="font-medium">Your workspace features are currently locked.</p>
        <p className="mt-1 text-sm">A paid subscription is required to restore access to CRM features.</p>
      </div>}

      {!record ? <p className="text-gray-600 dark:text-gray-400">Contact platform support to choose a plan and receive a subscription checkout link.</p> : <>
        <p className="mb-4 text-sm text-gray-500">Monthly payments renew for {record.total_count} billing cycles. Your card and payment details are entered securely on Razorpay.</p>
        {['created','authenticated'].includes(record.status) && <a className="inline-block rounded-full bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600" href={record.checkout_url} rel="noreferrer">Open Razorpay checkout</a>}
        {['active','authenticated','pending','halted','paused'].includes(record.status) && <details className="mt-6 group"><summary className="cursor-pointer font-medium text-red-500 hover:text-red-600 transition-colors">Cancel subscription renewal</summary><div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10"><p className="mb-4 text-sm text-red-800 dark:text-red-400">Active subscriptions keep paid access until the paid period ends. Cancellation cannot be undone; a new subscription will be needed to restart.</p><ActionForm action={cancelSubscription.bind(null,orgSlug)}><Submit>Confirm cancellation</Submit></ActionForm></div></details>}
      </>}
    </div>
  </div>;
}
