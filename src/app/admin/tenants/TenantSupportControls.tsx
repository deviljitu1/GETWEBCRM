import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field } from 'components/crm/Fields';
import FormDialog from 'components/crm/FormDialog';
import { MdLockReset, MdSupportAgent } from 'react-icons/md';
import { resetTenantOwnerPassword, startTenantSupport, endTenantSupport } from '../actions';

export default function TenantSupportControls({ tenant }: { tenant: { id: string; name: string; status: string } }) {
  return <div className="flex shrink-0 gap-2">
    <FormDialog title={`Reset owner password — ${tenant.name}`} icon={<MdLockReset/>} iconOnly description="This changes the owner's password across all their workspaces. They must change the temporary password at next login. Platform administrator accounts are excluded.">
      <ActionForm action={resetTenantOwnerPassword.bind(null,tenant.id)} reset><Field label="New temporary password" name="password" type="password" required minLength={12} maxLength={100} autoComplete="new-password"/><Submit>Reset password</Submit></ActionForm>
    </FormDialog>
    <FormDialog title={`Administrator support access — ${tenant.name}`} icon={<MdSupportAgent/>} iconOnly description="Open this workspace as yourself with management access for one hour. Access is logged and does not activate the tenant's subscription.">
      {tenant.status !== 'active' && <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">Activate this workspace before opening support access.</p>}
      <div className="flex flex-col gap-4">
        <ActionForm action={startTenantSupport.bind(null,tenant.id)}><Submit disabled={tenant.status !== 'active'}>Open workspace for support</Submit></ActionForm>
        <ActionForm action={endTenantSupport.bind(null,tenant.id)}><Submit variant="secondary">End support access</Submit></ActionForm>
      </div>
    </FormDialog>
  </div>;
}
