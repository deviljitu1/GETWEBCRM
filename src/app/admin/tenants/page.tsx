import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { createOrganization, saveWorkspaceSettings } from '../actions';
import TenantSupportControls from './TenantSupportControls';
import FormDialog from 'components/crm/FormDialog';
import EmptyState from 'components/crm/EmptyState';
import Link from 'next/link';
import { pageNumber } from 'utils/crm/validation';
export default async function Tenants({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const {supabase} = await requirePlatformAdmin(), page=pageNumber((await searchParams).page);
  const result = await supabase.from('organizations').select('id,name,slug,status,member_limit',{count:'exact'}).order('created_at',{ascending:false}).order('id').range((page-1)*25,page*25-1);
  checkQuery(result.error);
  return <div className="flex flex-col gap-5">
    <FormDialog title="Create organization" description="Use the owner’s email as their login ID. Set a temporary password for a new account, or leave it blank for an existing verified account.">
      <ActionForm action={createOrganization} reset><Field label="Organization name" name="name" required maxLength={160}/><Field label="Workspace slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80}/><Field label="Owner login email" name="owner_email" type="email" required maxLength={254}/><Field label="Temporary password (new accounts only)" name="password" type="password" minLength={12} maxLength={100} autoComplete="new-password"/><Submit>Create workspace</Submit></ActionForm>
    </FormDialog>
    {result.data.map(org=><div key={org.id} className={cardClass}><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-xl font-bold">{org.name}</h2><p className="mt-2 text-sm text-gray-700 dark:text-gray-300">/{org.slug} · {org.status}</p></div><TenantSupportControls tenant={org}/></div><ActionForm action={saveWorkspaceSettings.bind(null,org.id)} confirmWhen={{field:'status',value:'archived',message:`Archive ${org.name}? Members will lose workspace access until you reactivate it.`}}><div className="grid gap-5 md:grid-cols-2"><Select label="Workspace status" name="status" defaultValue={org.status}>{['active','suspended','archived'].map(s=><option key={s} value={s}>{s}</option>)}</Select><Field label="Member limit" name="member_limit" type="number" min="1" max="1000" defaultValue={org.member_limit} required/></div><Submit>Save changes</Submit></ActionForm>
    </div>)}
    {!result.data.length && <EmptyState title="No organizations found" description="Create an organization to set up a client workspace."/>}
    <div className="flex gap-4 text-brand-500">{page>1 && <Link href={`/admin/tenants?page=${page-1}`}>Previous</Link>}{page*25<(result.count||0) && <Link href={`/admin/tenants?page=${page+1}`}>Next</Link>}</div>
  </div>;
}
