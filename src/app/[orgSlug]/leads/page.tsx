import WorkspaceNavigation from 'components/crm/WorkspaceNavigation';
import FormDialog from 'components/crm/FormDialog';
import Form from 'next/form';
import Link from 'next/link';
import { requireOrg, checkQuery } from 'utils/crm/access';
import { pageNumber } from 'utils/crm/validation';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { addLead, importLeads } from '../actions';
import ReadOnlyNotice from 'components/crm/ReadOnlyNotice';
export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    q?: string;
    stage?: string;
    owner?: string;
    page?: string;
  }>;
}) {
  const { orgSlug } = await params;
  const { supabase, org, permissions, canWrite } = await requireOrg(orgSlug);
  if (
    !permissions.has('leads.read.all') &&
    !permissions.has('leads.read.assigned')
  ) {
    return <><WorkspaceNavigation orgSlug={orgSlug} /><p className="p-8">Your role does not include lead access.</p></>;
  }
  const filters = await searchParams;
  const q =
    typeof filters.q === 'string'
      ? filters.q.slice(0, 100).replace(/[^\p{L}\p{N} @.+-]/gu, '')
      : '';
  const page = pageNumber(filters.page),
    size = 25;
  const stages = await supabase
    .from('lead_stages')
    .select('id,name')
    .eq('organization_id', org.id)
    .order('sort_order');
  checkQuery(stages.error);
  const stage = stages.data.find((s) => s.id === filters.stage)?.id || '';
  const owner = ['mine', 'unassigned'].includes(filters.owner)
    ? filters.owner
    : '';
  let query = supabase
    .from('leads')
    .select(
      'id,full_name,phone_normalized,property_interest,assigned_to,next_followup_at,lead_stages!leads_stage_same_org(name),lead_sources!leads_source_same_org(name)',
      { count: 'exact' },
    )
    .eq('organization_id', org.id);
  if (q)
    query = query.or(
      `full_name.ilike.%${q}%,phone_normalized.ilike.%${q}%,property_interest.ilike.%${q}%`,
    );
  if (stage) query = query.eq('stage_id', stage);
  if (owner === 'mine')
    query = query.eq('assigned_to', (await requireOrg(orgSlug)).user.id);
  if (owner === 'unassigned') query = query.is('assigned_to', null);
  const result = await query
    .order('created_at', { ascending: false })
    .order('id')
    .range((page - 1) * size, page * size - 1);
  checkQuery(result.error);
  const total = result.count || 0;
  function pageUrl(n: number) {
    return `/${orgSlug}/leads?${new URLSearchParams({
      q,
      stage,
      owner,
      page: String(n),
    })}`;
  }
  return (
    <div className="flex flex-col gap-5 pb-8">
      <WorkspaceNavigation orgSlug={orgSlug} />
      <h1 className="text-2xl font-bold">Leads</h1>
      {!canWrite && <ReadOnlyNotice orgSlug={orgSlug} />}
      {canWrite && permissions.has('leads.create') && (
        <div className="grid gap-5 md:grid-cols-2">
          <FormDialog title="Add lead" description="Capture contact details and property interest. Fields marked * are required.">
            <ActionForm
              action={addLead.bind(null, orgSlug)}
              reset
              className="mt-4"
            >
              <div className="grid gap-4 sm:grid-cols-2"><Field
                label="Full name"
                name="full_name"
                required
                maxLength={160}
              />
              <Field label="Phone" name="phone" type="tel" maxLength={40} />
              <Field label="Email" name="email" type="email" maxLength={254} />
              <Field
                label="Project interest"
                name="property_interest"
                maxLength={160}
              />
              <Field label="City" name="city" maxLength={100} />
              </div><Submit>Save lead</Submit>
            </ActionForm>
          </FormDialog>
          <FormDialog title="Import CSV" description="Upload multiple leads in one step.">
            <p className="my-4 text-sm text-gray-500">
              Headers: full_name, phone, email, property_interest, city. Only
              full_name is required. Maximum 500 leads / 1 MB. Duplicate records
              reject the entire import.
            </p>
            <ActionForm action={importLeads.bind(null, orgSlug)} reset>
              <Field
                label="CSV file"
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
              />
              <Submit>Import CSV</Submit>
            </ActionForm>
          </FormDialog>
        </div>
      )}
      <div className={cardClass}>
        <Form key={`${q}:${stage}:${owner}`} action={`/${orgSlug}/leads`} className="mb-5 grid gap-3 md:grid-cols-4">
          <Field
            label="Search"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="Name, phone, or project"
          />
          <Select label="Stage" name="stage" defaultValue={stage}>
            <option value="">All stages</option>
            {stages.data.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select label="Owner" name="owner" defaultValue={owner}>
            <option value="">All accessible leads</option>
            <option value="mine">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </Select>
          <button className="self-end rounded-lg bg-brand-500 p-3 text-white">
            Apply filters
          </button>
        </Form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr>
                {[
                  'Lead',
                  'Source',
                  'Interest',
                  'Owner',
                  'Stage',
                  'Next follow-up',
                ].map((h) => (
                  <th className="border-b p-3" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.map((lead: any) => (
                <tr key={lead.id} className="border-b border-gray-100">
                  <td className="p-3">
                    <Link
                      href={`/${orgSlug}/leads/${lead.id}`}
                      className="font-semibold text-brand-500"
                    >
                      {lead.full_name}
                    </Link>
                    <p className="text-gray-500">{lead.phone_normalized}</p>
                  </td>
                  <td className="p-3">{lead.lead_sources?.name || 'Manual'}</td>
                  <td className="p-3">{lead.property_interest || '—'}</td>
                  <td className="p-3">
                    {lead.assigned_to ? 'Assigned' : 'Unassigned'}
                  </td>
                  <td className="p-3">{lead.lead_stages?.name || 'Unknown'}</td>
                  <td className="p-3">
                    {lead.next_followup_at
                      ? new Date(lead.next_followup_at).toLocaleString(
                          'en-IN',
                          { timeZone: 'Asia/Kolkata' },
                        )
                      : 'No follow-up'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!result.data.length && (
            <p className="p-8 text-center text-gray-500">No matching leads.</p>
          )}
        </div>
        <div className="mt-4 flex justify-between text-sm">
          <span>
            {total} matching leads · Page {page}
          </span>
          <div className="flex gap-4">
            {page > 1 && (
              <Link className="text-brand-500" href={pageUrl(page - 1)}>
                Previous
              </Link>
            )}
            {page * size < total && (
              <Link className="text-brand-500" href={pageUrl(page + 1)}>
                Next
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
