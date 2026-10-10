import WorkspaceNavigation from 'components/crm/WorkspaceNavigation';
import FormDialog from 'components/crm/FormDialog';
import Form from 'next/form';
import Link from 'next/link';
import { requireOrg, checkQuery } from 'utils/crm/access';
import { pageNumber } from 'utils/crm/validation';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { addProperty, updateProperty } from '../actions';
import ReadOnlyNotice from 'components/crm/ReadOnlyNotice';
import { MdApartment, MdCheckCircleOutline, MdSchedule, MdLocalOffer, MdFilterList, MdSearch } from 'react-icons/md';
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
  const [result, ...counts] = await Promise.all([query
    .order('created_at', { ascending: false })
    .order('id')
    .range((page - 1) * size, page * size - 1),
    ...['', 'available', 'blocked', 'sold'].map(value => {
      const count = supabase.from('property_units').select('id', { count: 'exact', head: true }).eq('organization_id', org.id);
      return value ? count.eq('status', value) : count;
    }),
  ]);
  [result, ...counts].forEach(item => checkQuery(item.error));
  const metrics = [
    { label: 'Total units', icon: MdApartment, color: 'bg-blue-50 text-blue-500' },
    { label: 'Available', icon: MdCheckCircleOutline, color: 'bg-green-50 text-green-600' },
    { label: 'Blocked', icon: MdSchedule, color: 'bg-orange-50 text-orange-600' },
    { label: 'Sold', icon: MdLocalOffer, color: 'bg-brand-50 text-brand-500' },
  ];
  const statusColors = { available: 'bg-green-50 text-green-700', blocked: 'bg-orange-50 text-orange-700', sold: 'bg-brand-50 text-brand-600' };
  const url = (n: number) =>
    `/${orgSlug}/inventory?${new URLSearchParams({
      q,
      status,
      page: String(n),
    })}`;
  return (
    <div className="flex flex-col gap-5 pb-8">
      <WorkspaceNavigation orgSlug={orgSlug} />
      <div><h1 className="text-3xl font-bold tracking-tight text-navy-700 dark:text-white sm:text-4xl">Property inventory</h1><p className="mt-2 text-gray-600 dark:text-gray-300">Track units, availability, and listed prices in one place.</p></div>
      <section aria-label="Inventory overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        {metrics.map((metric, index) => { const Icon = metric.icon; return <article key={metric.label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:gap-5 sm:p-5 dark:border-navy-600 dark:bg-navy-800"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14 ${metric.color}`}><Icon aria-hidden="true" className="text-3xl"/></span><div><p className="text-sm font-medium text-gray-600 dark:text-gray-300">{metric.label}</p><p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white sm:text-3xl">{counts[index].count ?? 0}</p></div></article>; })}
      </section>
      {!canWrite && <ReadOnlyNotice orgSlug={orgSlug} />}
      {canWrite && permissions.has('inventory.manage') && (
        <FormDialog title="Add property" description="Add a unit to your workspace inventory. New properties start as available.">
          <ActionForm
            action={addProperty.bind(null, orgSlug)}
            reset
            className="mt-4"
          >
            <fieldset className="min-w-0 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5 dark:border-navy-600 dark:bg-navy-900">
            <legend className="px-2 text-sm font-semibold text-navy-700 dark:text-white">Property details</legend>
            <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Project name"
              name="project_name"
              required
              maxLength={160}
              placeholder="e.g. Green Meadows"
            />
            <Field
              label="Unit number"
              name="unit_number"
              required
              maxLength={80}
              placeholder="e.g. A-101"
            />
            <Field label="Configuration (optional)" name="configuration" maxLength={80} placeholder="e.g. 2 BHK, 1,200 sq ft" />
            <Field
              label={`Listed price (${org.currency_code})`}
              name="price"
              type="number"
              required
              min="0"
              max="999999999999.99"
              step="0.01"
              placeholder="e.g. 4500000"
            />
            </div>
            </fieldset>
            <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-navy-600"><p className="text-xs text-gray-700 dark:text-gray-300">Fields marked * are required. Prices use {org.currency_code}.</p><Submit>Save property</Submit></div>
          </ActionForm>
        </FormDialog>
      )}
      <div className={cardClass}>
        <details key={`${q}:${status}`} className="mb-5">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-gray-200 bg-brand-50 px-5 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden"><MdFilterList aria-hidden="true" className="text-xl"/>Apply filters{(q || status) && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs text-white">{Number(Boolean(q)) + Number(Boolean(status))}</span>}</summary>
        <Form action={`/${orgSlug}/inventory`} className="mt-4 grid gap-4 rounded-xl border border-gray-200 p-4 dark:border-navy-600 md:grid-cols-[1.5fr_1fr_0.75fr]">
          <div className="relative"><Field
            label="Project or unit"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="Search by project or unit..."
          /><MdSearch aria-hidden="true" className="pointer-events-none absolute right-3 top-10 text-xl text-gray-500"/></div>
          <Select label="Status" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {['available', 'blocked', 'sold'].map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
            <MdFilterList aria-hidden="true" className="text-xl"/>Apply filters
          </button>
          {(q || status) && <Link href={`/${orgSlug}/inventory`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-brand-500 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-navy-600">Remove filters</Link>}
        </Form>
        </details>
        {(q || status) && <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-200">{q && <span>Search: {q}</span>}{status && <span className="capitalize">Status: {status}</span>}<Link href={`/${orgSlug}/inventory`} className="font-semibold text-brand-500 underline underline-offset-4">Clear filters</Link></div>}
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
                  <td className="p-3"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColors[unit.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'}`}>{unit.status}</span></td>
                  <td className="p-3">
                    {canWrite && permissions.has('inventory.manage') && (
                      <details><summary className="cursor-pointer font-semibold text-brand-500">Update status</summary><ActionForm
                        action={updateProperty.bind(null, orgSlug, unit.id)}
                        className="mt-3"
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
                      </ActionForm></details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!result.data.length && (
            <div className="flex flex-col items-center px-4 py-10 text-center sm:py-12"><span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-500"><MdApartment aria-hidden="true" className="text-5xl"/></span><h2 className="text-xl font-bold text-navy-700 dark:text-white">{q || status ? 'No properties match your filters' : 'No properties added yet'}</h2><p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-300">{q || status ? 'Try adjusting your search or status filter to see more units.' : 'Your property units will appear here once they are added.'}</p>{(q || status) && <Link href={`/${orgSlug}/inventory`} className="mt-5 rounded-xl bg-brand-50 px-5 py-3 text-sm font-semibold text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">Clear filters</Link>}</div>
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
