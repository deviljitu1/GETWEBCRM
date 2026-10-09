import { requireOrg, checkQuery } from 'utils/crm/access';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import {
  inviteMember,
  saveSettings,
  manageMember,
  revokeInvitation,
} from '../actions';
import ReadOnlyNotice from 'components/crm/ReadOnlyNotice';
export default async function Settings({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { supabase, org, user, canWrite } = await requireOrg(
    orgSlug,
    'settings.manage',
  );
  const [members, roles, invitations, audit] = await Promise.all([
    supabase
      .from('organization_members')
      .select('id,user_id,role_id,status')
      .eq('organization_id', org.id),
    supabase.from('roles').select('id,name,key').eq('organization_id', org.id),
    supabase
      .from('organization_invitations')
      .select('id,email,role_id,expires_at,accepted_at')
      .eq('organization_id', org.id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()),
    supabase
      .from('audit_logs')
      .select('id,entity_type,action,changed_fields,created_at')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(25),
  ]);
  [members, roles, invitations, audit].forEach((r) => checkQuery(r.error));
  const profiles = members.data.length
    ? await supabase
        .from('profiles')
        .select('id,full_name')
        .in(
          'id',
          members.data.map((m) => m.user_id),
        )
    : { data: [], error: null };
  checkQuery(profiles.error);
  const activeMembers = members.data.filter((member) => member.status === 'active').length;
  const seatsAvailable = org.member_limit - activeMembers;
  return (
    <div className="flex flex-col gap-5 pb-8">
      <h1 className="text-2xl font-bold">Workspace settings</h1>
      {!canWrite && <ReadOnlyNotice orgSlug={orgSlug} />}
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-6 text-xl font-bold text-navy-700 dark:text-white">
            Organization profile
          </h2>
          {canWrite ? (
            <ActionForm action={saveSettings.bind(null, orgSlug)}>
              <div className="flex flex-col gap-4">
                <Field
                  label="Workspace name"
                  name="name"
                  required
                  maxLength={160}
                  defaultValue={org.name}
                />
                <Field
                  label="Legal name"
                  name="legal_name"
                  maxLength={160}
                  defaultValue={org.legal_name || ''}
                />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  maxLength={254}
                  defaultValue={org.email || ''}
                />
                <Field
                  label="Phone"
                  name="phone"
                  maxLength={40}
                  defaultValue={org.phone || ''}
                />
                <Field label="Workspace URL" disabled value={org.slug} />
              </div>
              <div className="mt-6">
                <Submit>Save profile</Submit>
              </div>
            </ActionForm>
          ) : (
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Workspace name</dt>
                <dd className="mt-1 font-semibold">{org.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Legal name</dt>
                <dd className="mt-1 font-semibold">{org.legal_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="mt-1 font-semibold">{org.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="mt-1 font-semibold">{org.phone || '—'}</dd>
              </div>
            </dl>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-6 text-xl font-bold text-navy-700 dark:text-white">
            Team members
          </h2>
          {members.data.map((m) => (
            <div
              key={m.id}
              className="mb-4 border-b border-gray-100 pb-4 last:border-0 dark:border-navy-700"
            >
              <p className="font-semibold text-navy-700 dark:text-white">
                {profiles.data.find((p) => p.id === m.user_id)?.full_name ||
                  'Member'}
              </p>
              <p className="mb-3 text-sm text-gray-500">
                {roles.data.find((r) => r.id === m.role_id)?.name} · {m.status}
              </p>
              {canWrite &&
                m.user_id !== user.id &&
                roles.data.find((r) => r.id === m.role_id)?.key !== 'owner' && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-brand-500 transition-colors hover:text-brand-600">
                      Manage access
                    </summary>
                    <div className="mt-4">
                      <p className="mb-4 text-sm text-gray-500">
                        Disabling access blocks this member’s workspace data
                        immediately. Assigned leads remain in the workspace.
                      </p>
                      <ActionForm
                        action={manageMember.bind(null, orgSlug, m.id)}
                      >
                        <div className="flex flex-col gap-4">
                          <Select
                            label="Member role"
                            name="role_id"
                            defaultValue={m.role_id}
                          >
                            {roles.data
                              .filter((r) => r.key !== 'owner')
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                          </Select>
                          <Select
                            label="Member status"
                            name="status"
                            defaultValue={
                              m.status === 'active' ? 'active' : 'disabled'
                            }
                          >
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                          </Select>
                        </div>
                        <div className="mt-4">
                          <Submit>Update access</Submit>
                        </div>
                      </ActionForm>
                    </div>
                  </details>
                )}
            </div>
          ))}
          <h3 className="mb-2 mt-6 font-bold text-navy-700 dark:text-white">
            Invite user
          </h3>
          <p className="mb-6 text-sm text-gray-500">
            {activeMembers} of {org.member_limit} seats used. Save an invitation, then share this workspace’s login URL. Access requires verification of the invited email.
          </p>
          {canWrite && seatsAvailable > 0 && (
            <ActionForm action={inviteMember.bind(null, orgSlug)} reset>
              <div className="flex flex-col gap-4">
                <Field
                  label="Invited email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                />
                <Select
                  label="Role"
                  name="role_id"
                  defaultValue={roles.data.find((r) => r.key === 'viewer')?.id}
                >
                  {roles.data
                    .filter((r) => r.key !== 'owner')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </Select>
              </div>
              <div className="mt-6">
                <Submit>Save invitation</Submit>
              </div>
            </ActionForm>
          )}
          {canWrite && seatsAvailable <= 0 && (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              All {org.member_limit} seats are in use. Contact your CRM administrator to add more users.
            </p>
          )}
          <h3 className="mb-2 mt-8 font-bold text-navy-700 dark:text-white">
            Pending invitations
          </h3>
          {invitations.data.map((i) => (
            <div
              key={i.id}
              className="my-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 dark:border-navy-700"
            >
              <p className="text-sm font-medium text-navy-700 dark:text-white">
                {i.email}{' '}
                <span className="block font-normal text-gray-500">
                  expires{' '}
                  {new Date(i.expires_at).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                  })}
                </span>
              </p>
              {canWrite && (
                <ActionForm action={revokeInvitation.bind(null, orgSlug, i.id)}>
                  <Submit>Revoke</Submit>
                </ActionForm>
              )}
            </div>
          ))}
          {!invitations.data.length && (
            <p className="mt-2 text-sm text-gray-500">
              No pending invitations.
            </p>
          )}
        </div>
      </div>
      <div className={cardClass}>
        <h2 className="mb-6 text-xl font-bold text-navy-700 dark:text-white">
          Recent audit history
        </h2>
        {audit.data.map((a) => (
          <p
            key={a.id}
            className="border-b border-gray-100 py-3 text-sm last:border-0 dark:border-navy-700"
          >
            <span className="font-semibold text-navy-700 dark:text-white">
              {a.entity_type}
            </span>
            : {a.action}{' '}
            <span className="text-gray-500">
              · {a.changed_fields.join(', ')} ·{' '}
              {new Date(a.created_at).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
              })}
            </span>
          </p>
        ))}
        {!audit.data.length && (
          <p className="text-gray-500">No recorded changes.</p>
        )}
      </div>
    </div>
  );
}
