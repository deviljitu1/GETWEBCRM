import WorkspaceNavigation from 'components/crm/WorkspaceNavigation';
import FormDialog from 'components/crm/FormDialog';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrg, checkQuery } from 'utils/crm/access';
import { uuid } from 'utils/crm/validation';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import DateTimeField from 'components/crm/DateTimeField';
import { Field, Select, cardClass, inputClass } from 'components/crm/Fields';
import { addNote, scheduleVisit, updateLead, updateVisit } from '../../actions';
import ReadOnlyNotice from 'components/crm/ReadOnlyNotice';
export default async function LeadDetail({
  params,
}: {
  params: Promise<{ id: string; orgSlug: string }>;
}) {
  const { id, orgSlug } = await params;
  try {
    uuid(id);
  } catch {
    notFound();
  }
  const { supabase, org, user, permissions, canWrite } = await requireOrg(
    orgSlug,
  );
  const result = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', org.id)
    .eq('id', id)
    .maybeSingle();
  checkQuery(result.error);
  if (!result.data) notFound();
  const lead = result.data;
  const [stages, members, activities, visits] = await Promise.all([
    supabase
      .from('lead_stages')
      .select('id,name')
      .eq('organization_id', org.id)
      .order('sort_order'),
    supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', org.id)
      .eq('status', 'active'),
    supabase
      .from('lead_activities')
      .select('id,body,occurred_at')
      .eq('organization_id', org.id)
      .eq('lead_id', id)
      .order('occurred_at', { ascending: false })
      .limit(100),
    supabase
      .from('site_visits')
      .select('id,scheduled_at,status,notes')
      .eq('organization_id', org.id)
      .eq('lead_id', id)
      .order('scheduled_at', { ascending: false })
      .limit(100),
  ]);
  [stages, members, activities, visits].forEach((r) => checkQuery(r.error));
  const people = members.data.length
    ? await supabase
        .from('profiles')
        .select('id,full_name')
        .in(
          'id',
          members.data.map((m) => m.user_id),
        )
    : { data: [], error: null };
  checkQuery(people.error);
  const editable =
    canWrite &&
    (permissions.has('leads.update.all') ||
      (permissions.has('leads.update.assigned') &&
        lead.assigned_to === user.id));
  const displayDate = (value: string) =>
    new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return (
    <div className="flex flex-col gap-5 pb-8">
      <WorkspaceNavigation orgSlug={orgSlug} />
      <Link href={`/${orgSlug}/leads`} className="text-brand-500">
        ← Back to leads
      </Link>
      {!canWrite && <ReadOnlyNotice orgSlug={orgSlug} />}
      <h1 className="text-2xl font-bold">{lead.full_name}</h1>
      <p>
        {lead.phone || 'No phone'} · {lead.email || 'No email'} ·{' '}
        {lead.property_interest || 'No project interest'}
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-4 text-xl font-bold">Lead information</h2>
          {editable ? (
            <ActionForm action={updateLead.bind(null, orgSlug, id)}>
              <Field
                label="Full name"
                name="full_name"
                required
                maxLength={160}
                defaultValue={lead.full_name}
              />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                maxLength={40}
                defaultValue={lead.phone || lead.phone_normalized || ''}
              />
              <Field
                label="Email"
                name="email"
                type="email"
                maxLength={254}
                defaultValue={lead.email || ''}
              />
              <Field
                label="Project interest"
                name="property_interest"
                maxLength={160}
                defaultValue={lead.property_interest || ''}
              />
              <Field
                label="City"
                name="city"
                maxLength={100}
                defaultValue={lead.city || ''}
              />
              <Select
                label="Stage"
                name="stage_id"
                defaultValue={lead.stage_id || stages.data[0]?.id}
              >
                {stages.data.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              {permissions.has('leads.assign') && (
                <Select
                  label="Assigned to"
                  name="assigned_to"
                  defaultValue={lead.assigned_to || ''}
                >
                  <option value="">Unassigned</option>
                  {people.data.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </Select>
              )}
              <DateTimeField
                label="Next follow-up"
                name="next_followup_at"
                defaultValue={lead.next_followup_at}
              />
              <Submit>Save lead</Submit>
            </ActionForm>
          ) : (
            <p>
              Stage:{' '}
              {stages.data.find((s) => s.id === lead.stage_id)?.name ||
                'Unknown'}
              <br />
              Next follow-up:{' '}
              {lead.next_followup_at
                ? displayDate(lead.next_followup_at)
                : 'None'}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-5">
          <div className={cardClass}>
            <h2 className="mb-4 text-xl font-bold">Notes</h2>
            <div className="mb-5 flex max-h-80 flex-col gap-3 overflow-y-auto">
              {lead.notes && (
                <p className="whitespace-pre-wrap">{lead.notes}</p>
              )}
              {activities.data.map((note) => (
                <div key={note.id} className="rounded-lg border p-3">
                  <p className="whitespace-pre-wrap">{note.body}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {displayDate(note.occurred_at)}
                  </p>
                </div>
              ))}
              {!lead.notes && !activities.data.length && (
                <p className="text-gray-500">No notes yet.</p>
              )}
            </div>
            {editable && (
              <FormDialog title="Add note"><ActionForm action={addNote.bind(null, orgSlug, id)} reset>
                <label className="text-sm">
                  New note
                  <textarea
                    name="body"
                    required
                    maxLength={4000}
                    className={inputClass}
                  />
                </label>
                <Submit>Add note</Submit>
              </ActionForm></FormDialog>
            )}
          </div>
          <div className={cardClass}>
            <h2 className="mb-4 text-xl font-bold">Site visits</h2>
            {visits.data.map((visit) => (
              <div key={visit.id} className="mb-4 rounded-lg border p-3">
                <p>
                  {displayDate(visit.scheduled_at)} · {visit.status}
                </p>
                <p className="whitespace-pre-wrap text-sm text-gray-500">
                  {visit.notes}
                </p>
                {editable && visit.status === 'scheduled' && (
                  <ActionForm
                    action={updateVisit.bind(null, orgSlug, visit.id)}
                    className="mt-3"
                  >
                    <Select
                      label="Outcome"
                      name="status"
                      defaultValue="completed"
                    >
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </Select>
                    <Submit>Update visit</Submit>
                  </ActionForm>
                )}
              </div>
            ))}
            {!visits.data.length && (
              <p className="mb-4 text-gray-500">No visits scheduled.</p>
            )}
            {editable && (
              <FormDialog title="Schedule site visit"><ActionForm action={scheduleVisit.bind(null, orgSlug, id)} reset>
                <DateTimeField
                  label="Visit time"
                  name="scheduled_at"
                  required
                />
                <Field label="Notes" name="notes" maxLength={4000} />
                <Submit>Schedule site visit</Submit>
              </ActionForm></FormDialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
