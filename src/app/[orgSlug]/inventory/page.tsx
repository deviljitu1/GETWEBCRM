import WorkspaceNavigation from 'components/crm/WorkspaceNavigation';
import Form from 'next/form';
import Link from 'next/link';
import { requireOrg, checkQuery } from 'utils/crm/access';
import { pageNumber } from 'utils/crm/validation';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { addProperty, updateProperty } from '../actions';
import ReadOnlyNotice from 'components/crm/ReadOnlyNotice';
export default async function Inventory({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { orgSlug } = await params;
  const { supabase, org, permissions, canWrite } = await requireOrg(
    orgSlug,
    'inventory.read',
  );
  const filters = await searchParams,
    page = pageNumber(filters.page),
    size = 25;
  const q =
    typeof filters.q === 'string'
      ? filters.q.slice(0, 100).replace(/[^\p{L}\p{N} .+-]/gu, '')
      : '';
  const status = ['available', 'blocked', 'sold'].includes(filters.status)
    ? filters.status
    : '';
  let query = supabase
    .from('property_units')
    .select('id,unit_number,project_name,configuration,price,status', { count: 'exact' })
    .eq('organization_id', org.id);
  if (q) query = query.or(`project_name.ilike.%${q}%,unit_number.ilike.%${q}%`);
  if (status) query = query.eq('status', status);
  const result = await query
    .order('created_at', { ascending: false })
    .order('id')
    .range((page - 1) * size, page * size - 1);
  checkQuery(result.error);
  const url = (n: number) =>
    `/${orgSlug}/inventory?${new URLSearchParams({
      q,
      status,
      page: String(n),
    })}`;
  return (
    <div className="flex flex-col gap-5 pb-8">
      <WorkspaceNavigation orgSlug={orgSlug} />
      <h1 className="text-2xl font-bold">Property inventory</h1>
      {!canWrite && <ReadOnlyNotice orgSlug={orgSlug} />}
      {canWrite && permissions.has('inventory.manage') && (
        <details className={cardClass}>
          <summary className="cursor-pointer font-bold">Add property</summary>
          <ActionForm
            action={addProperty.bind(null, orgSlug)}
            reset
            className="mt-4"
          >
            <Field
              label="Project name"
              name="project_name"
              required
              maxLength={160}
            />
            <Field
              label="Unit number"
              name="unit_number"
              required
              maxLength={80}
            />
            <Field label="Configuration" name="configuration" maxLength={80} />
            <Field
              label={`Listed price (${org.currency_code})`}
              name="price"
              type="number"
              required
              min="0"
              max="999999999999.99"
              step="0.01"
            />
            <Submit>Add property</Submit>
          </ActionForm>
        </details>
      )}
      <div className={cardClass}>
        <Form key={`${q}:${status}`} action={`/${orgSlug}/inventory`} className="mb-5 grid gap-3 md:grid-cols-3">
          <Field
            label="Project or unit"
            name="q"
            defaultValue={q}
            maxLength={100}
          />
          <Select label="Status" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {['available', 'blocked', 'sold'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
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
                  'Unit',
                  'Project',
                  'Configuration',
                  'Listed price',
                  'Status',
                  'Action',
                ].map((h) => (
                  <th key={h} className="border-b p-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.map((unit) => (
                <tr key={unit.id} className="border-b">
                  <td className="p-3">{unit.unit_number}</td>
                  <td className="p-3">{unit.project_name}</td>
                  <td className="p-3">{unit.configuration}</td>
                  <td className="p-3">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: org.currency_code,
                    }).format(unit.price)}
                  </td>
                  <td className="p-3">{unit.status}</td>
                  <td className="p-3">
                    {canWrite && permissions.has('inventory.manage') && (
                      <ActionForm
                        action={updateProperty.bind(null, orgSlug, unit.id)}
                      >
                        <input
                          type="hidden"
                          name="previous"
                          value={unit.status}
                        />
                        <Select
                          label="New status"
                          name="status"
                          defaultValue={unit.status}
                        >
                          {['available', 'blocked', 'sold'].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>
                        <Submit>Update</Submit>
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!result.data.length && (
            <p className="p-8 text-center text-gray-500">
              No matching properties.
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-between text-sm">
          <span>
            {result.count || 0} matching units · Page {page}
          </span>
          <div className="flex gap-4">
            {page > 1 && <Link href={url(page - 1)}>Previous</Link>}
            {page * size < (result.count || 0) && (
              <Link href={url(page + 1)}>Next</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
