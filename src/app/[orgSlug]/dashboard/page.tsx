import Link from 'next/link';
import Widget from 'components/widget/Widget';
import { MdGroup, MdHouse, MdEvent, MdAlarm } from 'react-icons/md';
import { requireOrg, checkQuery } from 'utils/crm/access';
import { cardClass } from 'components/crm/Fields';
export default async function Dashboard({params}: {params:Promise<{orgSlug:string}>}) {
  const {orgSlug} = await params;
  const {supabase,org,permissions} = await requireOrg(orgSlug);
  const [summary,followups,visits] = await Promise.all([
    supabase.rpc('workspace_summary',{org_id:org.id}),
    supabase.from('leads').select('id,full_name,next_followup_at').eq('organization_id',org.id).not('next_followup_at','is',null).order('next_followup_at').limit(10),
    supabase.from('site_visits').select('id,lead_id,scheduled_at,status,leads(full_name)').eq('organization_id',org.id).eq('status','scheduled').gte('scheduled_at',new Date().toISOString()).order('scheduled_at').limit(10),
  ]);
  [summary,followups,visits].forEach(r=>checkQuery(r.error));
  const data = summary.data;
  return <div className="flex flex-col gap-5 pb-8"><h1 className="text-2xl font-bold">{org.name} · Workspace overview</h1>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <Widget icon={<MdGroup className="h-7 w-7" />} title="Accessible leads" subtitle={String(data.leads)} />
      <Widget icon={<MdAlarm className="h-7 w-7" />} title="Overdue follow-ups" subtitle={String(data.overdue)} />
      <Widget icon={<MdEvent className="h-7 w-7" />} title="Visits in the next 7 days" subtitle={String(data.visits)} />
      {permissions.has('inventory.read') && <Widget icon={<MdHouse className="h-7 w-7" />} title="Available units" subtitle={String(data.units)} />}
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      <div className={cardClass}><h2 className="mb-4 text-xl font-bold">Lead pipeline</h2>{data.pipeline.map((stage:{name:string;total:number})=><div className="flex justify-between border-b py-3" key={stage.name}><span>{stage.name}</span><strong>{stage.total}</strong></div>)}</div>
      <div className={cardClass}><h2 className="mb-4 text-xl font-bold">Upcoming site visits</h2>{visits.data.map((visit:any)=><Link className="mb-3 block rounded-lg border p-3" key={visit.id} href={`/${orgSlug}/leads/${visit.lead_id}`}>{visit.leads?.full_name || 'Lead'}<p className="text-sm text-gray-500">{new Date(visit.scheduled_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p></Link>)}{!visits.data.length && <p className="text-gray-500">No upcoming visits.</p>}</div>
      <div className={cardClass}><h2 className="mb-4 text-xl font-bold">Follow-ups</h2>{followups.data.map(lead=><Link className="mb-3 block rounded-lg border p-3" key={lead.id} href={`/${orgSlug}/leads/${lead.id}`}>{lead.full_name}<p className="text-sm text-gray-500">{new Date(lead.next_followup_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p></Link>)}{!followups.data.length && <p className="text-gray-500">No scheduled follow-ups.</p>}</div>
    </div>
  </div>;
}
