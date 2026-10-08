import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { savePlan, saveSubscription } from '../actions';
import { attachSubscription, enforcePayment, refreshSubscription } from './actions';
import { billingConfigured } from 'utils/billing/razorpay';
function PlanFields({plan}:{plan?:{name:string;price_monthly:number;currency_code:string;is_active:boolean;razorpay_plan_id?:string}}) {
  return <><Field label="Plan name" name="name" required maxLength={100} defaultValue={plan?.name || ''}/><Field label="Monthly price" name="price_monthly" type="number" min="0" max="9999999999.99" step="0.01" required defaultValue={plan?.price_monthly || 0}/><Select label="Currency" name="currency_code" defaultValue={plan?.currency_code || 'INR'}>{['INR','USD','EUR','GBP'].map(c=><option key={c} value={c}>{c}</option>)}</Select><Field label="Razorpay monthly plan ID (optional)" name="razorpay_plan_id" maxLength={80} pattern="plan_[A-Za-z0-9]+" defaultValue={plan?.razorpay_plan_id || ''}/><label><input name="is_active" type="checkbox" defaultChecked={plan?.is_active ?? true}/> Active plan</label><Submit>Save plan</Submit></>;
}
export default async function Billing() {
  const {supabase} = await requirePlatformAdmin();
  const [plans,orgs,subscriptions,contracts,billingSettings] = await Promise.all([
    supabase.from('plans').select('*').order('name'),
    supabase.from('organizations').select('id,name').order('name'),
    supabase.from('organization_subscriptions').select('organization_id,plan_id,status'),
    supabase.from('billing_contracts').select('organization_id,provider_id,status,mode,paid_until'),
    supabase.from('billing_settings').select('organization_id,payment_required'),
  ]);
  [plans,orgs,subscriptions,contracts,billingSettings].forEach(r=>checkQuery(r.error));
  return <div className="flex flex-col gap-5"><p className="text-sm text-gray-500">These records track agreed plans. Payments are collected externally.</p>
    <details className={cardClass}><summary className="cursor-pointer font-bold">Add plan</summary><ActionForm action={savePlan.bind(null,null)} reset className="mt-4"><PlanFields/></ActionForm></details>
    <div className="grid gap-5 md:grid-cols-2">{plans.data.map(plan=><div key={plan.id} className={cardClass}><ActionForm action={savePlan.bind(null,plan.id)}><PlanFields plan={plan}/></ActionForm></div>)}</div>
    {orgs.data.length > 0 && plans.data.length > 0 && <div className={cardClass}><h2 className="mb-4 text-xl font-bold">Set subscription</h2><ActionForm action={saveSubscription}>
      <Select label="Organization" name="organization_id" defaultValue={orgs.data[0].id}>{orgs.data.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</Select>
      <Select label="Plan" name="plan_id" defaultValue={plans.data[0].id}>{plans.data.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select>
      <Select label="Status" name="status" defaultValue="trial">{['trial','active','cancelled'].map(s=><option key={s} value={s}>{s}</option>)}</Select><Submit>Save subscription</Submit>
    </ActionForm></div>}
    <div className={cardClass}><h2 className="mb-4 text-xl font-bold">Subscriptions</h2>{subscriptions.data.map(s=><p className="border-b py-3" key={s.organization_id}>{orgs.data.find(o=>o.id===s.organization_id)?.name} · {plans.data.find(p=>p.id===s.plan_id)?.name} · {s.status}</p>)}{!subscriptions.data.length && <p>No subscription records yet.</p>}</div>
    <div className={cardClass}><h2 className="mb-4 text-xl font-bold">Razorpay subscriptions</h2>
      <p className="mb-4 text-sm">{billingConfigured() ? 'Razorpay credentials configured. Verify test checkout and webhooks before enabling live payments.' : 'Payment setup required: configure Razorpay server keys and the webhook secret in Vercel.'}</p>
      <p className="mb-4 text-sm text-gray-500">Create a monthly INR plan and subscription link in Razorpay. Link the plan above, then attach its subscription to the intended organization. Manual subscription records do not grant paid access.</p>
      {orgs.data.length > 0 && plans.data.length > 0 && <ActionForm action={attachSubscription}>
        <Select label="Checkout organization" name="organization_id" defaultValue={orgs.data[0].id}>{orgs.data.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</Select>
        <Select label="Checkout plan" name="plan_id" defaultValue={plans.data[0].id}>{plans.data.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Field label="Razorpay subscription ID" name="subscription_id" required pattern="sub_[A-Za-z0-9]+" maxLength={80}/><Submit>Link Razorpay subscription</Submit>
      </ActionForm>}
      {contracts.data.map(c=><div key={c.provider_id} className="mt-5 border-t pt-4"><p>{orgs.data.find(o=>o.id===c.organization_id)?.name} · {c.mode} · {c.status}</p><p className="my-2 text-sm">Paid until: {c.paid_until ? new Date(c.paid_until).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}) : 'Awaiting payment'}</p><ActionForm action={refreshSubscription.bind(null,c.provider_id)}><Submit>Refresh Razorpay status</Submit></ActionForm></div>)}
    </div>
    <div className={cardClass}><h2 className="mb-4 text-xl font-bold">Require paid workspace access</h2><p className="mb-4 text-sm text-gray-500">Enable only after live checkout and webhooks are verified. An unpaid or expired workspace loses CRM access; its administrator can still manage billing. Test payments never unlock paid access.</p>
      {orgs.data.map(o=><ActionForm key={o.id} action={enforcePayment} className="mb-5 border-t pt-4"><input type="hidden" name="organization_id" value={o.id}/><label className="flex gap-3"><input type="checkbox" name="payment_required" defaultChecked={billingSettings.data.find(s=>s.organization_id===o.id)?.payment_required || false}/>{o.name}: require a paid subscription</label><Submit>Save payment requirement</Submit></ActionForm>)}
    </div>
  </div>;
}
