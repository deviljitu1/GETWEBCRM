'use client';
import { useState } from 'react';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, inputClass, cardClass } from 'components/crm/Fields';
import { resetTenantOwnerPassword, startTenantSupport, endTenantSupport } from '../actions';

export default function TenantSupportControls({ tenants }: { tenants: { id: string; name: string; slug: string; status: string }[] }) {
  const [tenantId, setTenantId] = useState('');
  const [operation, setOperation] = useState('support');
  const tenant = tenants.find(item => item.id === tenantId);
  return <section className={cardClass}>
    <h2 className="text-xl font-bold">Tenant account & support</h2>
    <div className="my-4 grid gap-4 md:grid-cols-2">
      <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">Tenant
        <select className={inputClass} value={tenantId} onChange={event => setTenantId(event.target.value)}>
          <option value="">Select a tenant</option>
          {tenants.map(item => <option key={item.id} value={item.id}>{item.name} (/{item.slug})</option>)}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">Action
        <select className={inputClass} value={operation} onChange={event => setOperation(event.target.value)}>
          <option value="support">Administrator support access</option>
          <option value="password">Reset owner password</option>
        </select>
      </label>
    </div>
    {tenant && <div key={`${tenant.id}-${operation}`}>
      {operation === 'password' ? <>
        <p className="mb-4 text-sm text-gray-500">Reset the owner&apos;s account across all their workspaces. They must change the temporary password at next login. Platform administrator accounts are excluded.</p>
        <ActionForm action={resetTenantOwnerPassword.bind(null,tenant.id)} reset><Field label="New temporary password" name="password" type="password" required minLength={12} maxLength={100} autoComplete="new-password"/><Submit>Reset password</Submit></ActionForm>
      </> : <>
        <p className="mb-4 text-sm text-gray-500">Open {tenant.name} as yourself with management access for one hour. Access is logged and does not activate the tenant&apos;s subscription.</p>
        {tenant.status !== 'active' && <p className="mb-4 text-sm text-gray-500">Activate this workspace before opening support access.</p>}
        <div className="flex flex-col gap-4">
          <ActionForm action={startTenantSupport.bind(null,tenant.id)}><Submit disabled={tenant.status !== 'active'}>Open workspace for support</Submit></ActionForm>
          <ActionForm action={endTenantSupport.bind(null,tenant.id)}><Submit variant="secondary">End support access</Submit></ActionForm>
        </div>
      </>}
    </div>}
  </section>;
}
