import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { createOrganization, saveWorkspaceSettings } from '../actions';
import TenantSupportControls from './TenantSupportControls';
import FormDialog from 'components/crm/FormDialog';
import Link from 'next/link';
import { pageNumber } from 'utils/crm/validation';
export default async function Tenants({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const {supabase} = await requirePlatformAdmin(), page=pageNumber((await searchParams).page);
  const result = await supabase.from('organizations').select('id,name,slug,status,member_limit',{count:'exact'}).order('created_at',{ascending:false}).order('id').range((page-1)*25,page*25-1);
  checkQuery(result.error);
  const tenants: { id: string; name: string; slug: string; status: string }[] = [];
  for (let offset = 0; ; offset += 500) {
    const options = await supabase.from('organizations').select('id,name,slug,status').order('name').order('id').range(offset,offset+499);
    checkQuery(options.error);
    tenants.push(...options.data);
    if (options.data.length < 500) break;
  }
  return <div className="flex flex-col gap-5">
    <FormDialog title="Create organization" description="Use the owner’s email as their login ID. Set a temporary password for a new account, or leave it blank for an existing verified account.">
      <ActionForm action={createOrganization} reset><Field label="Organization name" name="name" required maxLength={160}/><Field label="Workspace slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80}/><Field label="Owner login email" name="owner_email" type="email" required maxLength={254}/><Field label="Temporary password (new accounts only)" name="password" type="password" minLength={12} maxLength={100} autoComplete="new-password"/><Submit>Create workspace</Submit></ActionForm>
    </FormDialog>
    <TenantSupportControls tenants={tenants}/>
    {result.data.map(org=><div key={org.id} className={cardClass}><h2 className="text-xl font-bold">{org.name}</h2><p className="my-3 text-sm text-gray-500">/{org.slug} · {org.status}</p><ActionForm action={saveWorkspaceSettings.bind(null,org.id)}><div className="grid gap-5 md:grid-cols-2"><Select label="Workspace status" name="status" defaultValue={org.status}>{['active','suspended','archived'].map(s=><option key={s} value={s}>{s}</option>)}</Select><Field label="Member limit" name="member_limit" type="number" min="1" max="1000" defaultValue={org.member_limit} required/></div><Submit>Save changes</Submit></ActionForm>
    </div>)}
    {!result.data.length && <p>No organizations found.</p>}
    <div className="flex gap-4 text-brand-500">{page>1 && <Link href={`/admin/tenants?page=${page-1}`}>Previous</Link>}{page*25<(result.count||0) && <Link href={`/admin/tenants?page=${page+1}`}>Next</Link>}</div>
  </div>;
}
