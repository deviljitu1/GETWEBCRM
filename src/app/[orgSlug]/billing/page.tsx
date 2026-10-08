import { requireOrg, checkQuery } from 'utils/crm/access';
import { cardClass } from 'components/crm/Fields';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { cancelSubscription } from './actions';
export default async function Billing({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { supabase, org, permissions } = await requireOrg(orgSlug, undefined, true);
  if (!permissions.has('settings.manage')) return <div className={cardClass}><h1 className="text-2xl font-bold">Workspace subscription</h1><p className="mt-4">Contact your workspace administrator to manage billing or restore subscription access.</p></div>;
  const contract = await supabase.from('billing_contracts').select('status,mode,paid_until,total_count,checkout_url').eq('organization_id',org.id).maybeSingle();
  checkQuery(contract.error);
  const record = contract.data;
  return <div className={cardClass}><h1 className="mb-4 text-2xl font-bold">Workspace subscription</h1>
    {!record ? <p>Contact platform support to choose a plan and receive a subscription checkout link.</p> : <>
      <p>Status: {record.status} · {record.mode === 'test' ? 'Test payment — does not grant paid access' : 'Live subscription'}</p>
      <p className="my-3">Paid access until: {record.paid_until ? new Date(record.paid_until).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}) : 'Awaiting payment'}</p>
      <p className="mb-4 text-sm text-gray-500">Monthly payments renew for {record.total_count} billing cycles. Your card and payment details are entered securely on Razorpay.</p>
      {['created','authenticated'].includes(record.status) && <a className="inline-block rounded-xl bg-brand-500 px-5 py-3 text-white" href={record.checkout_url} rel="noreferrer">Open Razorpay checkout</a>}
      {['active','authenticated','pending','halted','paused'].includes(record.status) && <details className="mt-6"><summary className="cursor-pointer font-medium text-red-600">Cancel subscription renewal</summary><p className="my-4 text-sm">Active subscriptions keep paid access until the paid period ends. Cancellation cannot be undone; a new subscription will be needed to restart.</p><ActionForm action={cancelSubscription.bind(null,orgSlug)}><Submit>Confirm cancellation</Submit></ActionForm></details>}
    </>}
  </div>;
}
