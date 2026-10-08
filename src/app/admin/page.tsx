import Widget from 'components/widget/Widget';
import { MdBusiness, MdGroup, MdCheckCircle, MdPayment } from 'react-icons/md';
import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import { cardClass } from 'components/crm/Fields';
import Link from 'next/link';
import { subscriptionSummary } from 'utils/billing/presentation';
export default async function Dashboard() {
  const {supabase} = await requirePlatformAdmin();
  const [summary,recent,subscriptions] = await Promise.all([supabase.rpc('platform_summary'),supabase.from('organizations').select('id,name,slug,status').order('created_at',{ascending:false}).limit(10),supabase.from('billing_contracts').select('status,mode,paid_count,paid_until')]);
  checkQuery(summary.error); checkQuery(recent.error); checkQuery(subscriptions.error);
  const data = summary.data;
  return <div className="flex flex-col gap-5">
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <Widget icon={<MdBusiness />} title="Organizations" subtitle={String(data.organizations)} />
      <Widget icon={<MdCheckCircle />} title="Active organizations" subtitle={String(data.active)} />
      <Widget icon={<MdGroup />} title="Workspace users" subtitle={String(data.members)} />
      <Widget icon={<MdPayment />} title="Active paid subscriptions" subtitle={String(subscriptions.data.filter(record => subscriptionSummary(record).label === 'Active').length)} />
    </div><div className={cardClass}><h2 className="mb-4 text-xl font-bold">Recent organizations</h2>{recent.data.map(org=><div className="flex flex-wrap justify-between gap-2 border-b p-3" key={org.id}><span>{org.name}</span><span>{org.status}</span></div>)}{!recent.data.length && <p>No organizations yet.</p>}<Link className="mt-4 block text-brand-500" href="/admin/tenants">Manage organizations</Link></div>
  </div>;
}
