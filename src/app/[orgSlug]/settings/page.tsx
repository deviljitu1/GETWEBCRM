import { requireOrg, checkQuery } from 'utils/crm/access';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { inviteMember, saveSettings } from '../actions';
export default async function Settings({ params }: { params: Promise<{ orgSlug: string }> }) {
  const {orgSlug} = await params;
  const {supabase,org} = await requireOrg(orgSlug,'settings.manage');
  const [members,roles,invitations,audit] = await Promise.all([
    supabase.from('organization_members').select('id,user_id,role_id,status').eq('organization_id',org.id),
    supabase.from('roles').select('id,name,key').eq('organization_id',org.id),
    supabase.from('organization_invitations').select('id,email,role_id,expires_at,accepted_at').eq('organization_id',org.id).is('accepted_at',null).gt('expires_at',new Date().toISOString()),
    supabase.from('audit_logs').select('id,entity_type,action,changed_fields,created_at').eq('organization_id',org.id).order('created_at',{ascending:false}).limit(25),
  ]);
  [members,roles,invitations,audit].forEach(r=>checkQuery(r.error));
  const profiles = members.data.length ? await supabase.from('profiles').select('id,full_name').in('id',members.data.map(m=>m.user_id)) : {data:[],error:null};
  checkQuery(profiles.error);
  return <div className="flex flex-col gap-5 pb-8"><h1 className="text-2xl font-bold">Workspace settings</h1><div className="grid gap-5 md:grid-cols-2">
    <div className={cardClass}><h2 className="mb-4 text-xl font-bold">Organization profile</h2><ActionForm action={saveSettings.bind(null,orgSlug)}>
      <Field label="Workspace name" name="name" required maxLength={160} defaultValue={org.name} />
      <Field label="Legal name" name="legal_name" maxLength={160} defaultValue={org.legal_name || ''} />
      <Field label="Email" name="email" type="email" maxLength={254} defaultValue={org.email || ''} />
      <Field label="Phone" name="phone" maxLength={40} defaultValue={org.phone || ''} />
      <Field label="Workspace URL" disabled value={org.slug} /><Submit>Save profile</Submit>
    </ActionForm></div>
    <div className={cardClass}><h2 className="mb-4 text-xl font-bold">Team members</h2>
      {members.data.map(m=><div key={m.id} className="mb-3 border-b py-3"><p className="font-semibold">{profiles.data.find(p=>p.id===m.user_id)?.full_name || 'Member'}</p><p className="text-sm text-gray-500">{roles.data.find(r=>r.id===m.role_id)?.name} · {m.status}</p></div>)}
      <h3 className="my-4 font-bold">Invite user</h3><p className="mb-4 text-sm text-gray-500">Save an invitation, then share this workspace’s login URL. Access requires verification of the invited email.</p>
      <ActionForm action={inviteMember.bind(null,orgSlug)} reset><Field label="Invited email" name="email" type="email" required maxLength={254} />
        <Select label="Role" name="role_id" defaultValue={roles.data.find(r=>r.key==='viewer')?.id}>{roles.data.filter(r=>r.key!=='owner').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</Select><Submit>Save invitation</Submit>
      </ActionForm>
      <h3 className="my-4 font-bold">Pending invitations</h3>{invitations.data.map(i=><p key={i.id} className="my-2 text-sm">{i.email} · expires {new Date(i.expires_at).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})}</p>)}
      {!invitations.data.length && <p className="text-gray-500">No pending invitations.</p>}
    </div>
  </div><div className={cardClass}><h2 className="mb-4 text-xl font-bold">Recent audit history</h2>{audit.data.map(a=><p key={a.id} className="border-b py-2 text-sm">{a.entity_type}: {a.action} · {a.changed_fields.join(', ')} · {new Date(a.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p>)}{!audit.data.length && <p className="text-gray-500">No recorded changes.</p>}</div></div>;
}
