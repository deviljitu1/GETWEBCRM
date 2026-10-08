import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { createOrganization, setOrganizationStatus } from '../actions';
import Link from 'next/link';
import { pageNumber } from 'utils/crm/validation';
export default async function Tenants({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const {supabase} = await requirePlatformAdmin(), page=pageNumber((await searchParams).page);
  const result = await supabase.from('organizations').select('id,name,slug,status',{count:'exact'}).order('created_at',{ascending:false}).order('id').range((page-1)*25,page*25-1);
  checkQuery(result.error);
  return <div className="flex flex-col gap-5"><h1 className="text-2xl font-bold">Organizations</h1>
    <details className={cardClass}><summary className="cursor-pointer font-bold">Create organization</summary><p className="my-4 text-sm text-gray-500">The owner must first create an account and verify their email using a workspace login page.</p>
      <ActionForm action={createOrganization} reset><Field label="Organization name" name="name" required maxLength={160}/><Field label="Workspace slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80}/><Field label="Verified owner email" name="owner_email" type="email" required maxLength={254}/><Submit>Create workspace</Submit></ActionForm>
    </details>
    {result.data.map(org=><div key={org.id} className={cardClass}><h2 className="text-xl font-bold">{org.name}</h2><p className="my-3 text-sm text-gray-500">/{org.slug} · {org.status}</p><ActionForm action={setOrganizationStatus.bind(null,org.id)}><Select label="Workspace status" name="status" defaultValue={org.status}>{['active','suspended','archived'].map(s=><option key={s} value={s}>{s}</option>)}</Select><Submit>Update status</Submit></ActionForm></div>)}
    {!result.data.length && <p>No organizations found.</p>}
    <div className="flex gap-4 text-brand-500">{page>1 && <Link href={`/admin/tenants?page=${page-1}`}>Previous</Link>}{page*25<(result.count||0) && <Link href={`/admin/tenants?page=${page+1}`}>Next</Link>}</div>
  </div>;
}
