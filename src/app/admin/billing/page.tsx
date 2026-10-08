import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { savePlan, saveSubscription } from '../actions';
function PlanFields({plan}:{plan?:{name:string;price_monthly:number;currency_code:string;is_active:boolean}}) {
  return <><Field label="Plan name" name="name" required maxLength={100} defaultValue={plan?.name || ''}/><Field label="Monthly price" name="price_monthly" type="number" min="0" max="9999999999.99" step="0.01" required defaultValue={plan?.price_monthly || 0}/><Select label="Currency" name="currency_code" defaultValue={plan?.currency_code || 'INR'}>{['INR','USD','EUR','GBP'].map(c=><option key={c} value={c}>{c}</option>)}</Select><label><input name="is_active" type="checkbox" defaultChecked={plan?.is_active ?? true}/> Active plan</label><Submit>Save plan</Submit></>;
}
export default async function Billing() {
  const {supabase} = await requirePlatformAdmin();
  const [plans,orgs,subscriptions] = await Promise.all([
    supabase.from('plans').select('*').order('name'),
    supabase.from('organizations').select('id,name').order('name'),
    supabase.from('organization_subscriptions').select('organization_id,plan_id,status'),
  ]);
  [plans,orgs,subscriptions].forEach(r=>checkQuery(r.error));
  return <div className="flex flex-col gap-5"><h1 className="text-2xl font-bold">Plans and subscription records</h1><p className="text-sm text-gray-500">These records track agreed plans. Payments are collected externally.</p>
    <details className={cardClass}><summary className="cursor-pointer font-bold">Add plan</summary><ActionForm action={savePlan.bind(null,null)} reset className="mt-4"><PlanFields/></ActionForm></details>
    <div className="grid gap-5 md:grid-cols-2">{plans.data.map(plan=><div key={plan.id} className={cardClass}><ActionForm action={savePlan.bind(null,plan.id)}><PlanFields plan={plan}/></ActionForm></div>)}</div>
    {orgs.data.length > 0 && plans.data.length > 0 && <div className={cardClass}><h2 className="mb-4 text-xl font-bold">Set subscription</h2><ActionForm action={saveSubscription}>
      <Select label="Organization" name="organization_id" defaultValue={orgs.data[0].id}>{orgs.data.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</Select>
      <Select label="Plan" name="plan_id" defaultValue={plans.data[0].id}>{plans.data.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select>
      <Select label="Status" name="status" defaultValue="trial">{['trial','active','cancelled'].map(s=><option key={s} value={s}>{s}</option>)}</Select><Submit>Save subscription</Submit>
    </ActionForm></div>}
    <div className={cardClass}><h2 className="mb-4 text-xl font-bold">Subscriptions</h2>{subscriptions.data.map(s=><p className="border-b py-3" key={s.organization_id}>{orgs.data.find(o=>o.id===s.organization_id)?.name} · {plans.data.find(p=>p.id===s.plan_id)?.name} · {s.status}</p>)}{!subscriptions.data.length && <p>No subscription records yet.</p>}</div>
  </div>;
}
