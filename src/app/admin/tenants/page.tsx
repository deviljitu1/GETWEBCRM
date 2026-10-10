import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { createOrganization, saveWorkspaceSettings, resetTenantOwnerPassword, startTenantSupport, endTenantSupport } from '../actions';
import Link from 'next/link';
import { pageNumber } from 'utils/crm/validation';
export default async function Tenants({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const {supabase} = await requirePlatformAdmin(), page=pageNumber((await searchParams).page);
  const result = await supabase.from('organizations').select('id,name,slug,status,member_limit',{count:'exact'}).order('created_at',{ascending:false}).order('id').range((page-1)*25,page*25-1);
  checkQuery(result.error);
  return <div className="flex flex-col gap-5">
    <details className={cardClass}><summary className="cursor-pointer font-bold">Create organization</summary><p className="my-4 text-sm text-gray-500">Use the owner&apos;s email as their login ID. Set a temporary password to create a new owner account, or leave it blank to use an existing verified account.</p>
      <ActionForm action={createOrganization} reset><Field label="Organization name" name="name" required maxLength={160}/><Field label="Workspace slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80}/><Field label="Owner login email" name="owner_email" type="email" required maxLength={254}/><Field label="Temporary password (new accounts only)" name="password" type="password" minLength={12} maxLength={100} autoComplete="new-password"/><Submit>Create workspace</Submit></ActionForm>
    </details>
    {result.data.map(org=><div key={org.id} className={cardClass}><h2 className="text-xl font-bold">{org.name}</h2><p className="my-3 text-sm text-gray-500">/{org.slug} · {org.status}</p><ActionForm action={saveWorkspaceSettings.bind(null,org.id)}><div className="grid gap-5 md:grid-cols-2"><Select label="Workspace status" name="status" defaultValue={org.status}>{['active','suspended','archived'].map(s=><option key={s} value={s}>{s}</option>)}</Select><Field label="Member limit" name="member_limit" type="number" min="1" max="1000" defaultValue={org.member_limit} required/></div><Submit>Save changes</Submit></ActionForm>
      <details className="mt-5 border-t pt-4 dark:border-navy-600"><summary className="cursor-pointer font-semibold">Reset owner password</summary>
        <p className="my-3 text-sm text-gray-500">This resets the owner&apos;s account across all their workspaces. They must change the temporary password at next login. Platform administrator accounts are excluded.</p>
        <ActionForm action={resetTenantOwnerPassword.bind(null,org.id)} reset><Field label="Current owner login email" name="owner_email" type="email" required maxLength={254}/><Field label="New temporary password" name="password" type="password" required minLength={12} maxLength={100} autoComplete="new-password"/><Submit>Reset password</Submit></ActionForm>
      </details>
      <details className="mt-5 border-t pt-4 dark:border-navy-600"><summary className="cursor-pointer font-semibold">Administrator support access</summary>
        <p className="my-3 text-sm text-gray-500">Open this active workspace as yourself with management access for one hour. Access is logged and does not activate the tenant&apos;s subscription.</p>
        <ActionForm action={startTenantSupport.bind(null,org.id)}><Submit>Open workspace for support</Submit></ActionForm>
        <ActionForm action={endTenantSupport.bind(null,org.id)}><Submit>End support access</Submit></ActionForm>
      </details>
    </div>)}
    {!result.data.length && <p>No organizations found.</p>}
    <div className="flex gap-4 text-brand-500">{page>1 && <Link href={`/admin/tenants?page=${page-1}`}>Previous</Link>}{page*25<(result.count||0) && <Link href={`/admin/tenants?page=${page+1}`}>Next</Link>}</div>
  </div>;
}
