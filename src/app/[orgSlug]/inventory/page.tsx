import WorkspaceNavigation from 'components/crm/WorkspaceNavigation';
import FormDialog from 'components/crm/FormDialog';
import RecordMenu from 'components/crm/RecordMenu';
import RecordDetails from 'components/crm/RecordDetails';
import EmptyState from 'components/crm/EmptyState';
import FilterPopover from 'components/crm/FilterPopover';
import BulkRecordActions from 'components/crm/BulkRecordActions';

import Link from 'next/link';
import { requireOrg, checkQuery } from 'utils/crm/access';
import { pageNumber } from 'utils/crm/validation';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, Select, cardClass } from 'components/crm/Fields';
import { addProperty, updateProperty, editProperty, bulkPropertyStatus } from '../actions';
import ReadOnlyNotice from 'components/crm/ReadOnlyNotice';
import { MdApartment, MdCheckCircleOutline, MdSchedule, MdLocalOffer, MdSearch, MdEdit } from 'react-icons/md';
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
            repeatable
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
        <FilterPopover key={`${q}:${status}`} action={`/${orgSlug}/inventory`} activeCount={Number(Boolean(q)) + Number(Boolean(status))}>
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
        </FilterPopover>
        {canWrite && permissions.has('inventory.manage') && result.data.length > 0 && <BulkRecordActions action={bulkPropertyStatus.bind(null,orgSlug)} field="status" subject="properties" options={['available','blocked','sold'].map(status=>({id:status,name:status.charAt(0).toUpperCase()+status.slice(1)}))} records={result.data.map(unit=>({id:unit.id,name:`${unit.project_name} · ${unit.unit_number}`,previous:unit.status}))}/>}
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
                  <td className="p-3"><RecordDetails title={`Property details — ${unit.unit_number}`} label={unit.unit_number} fields={[["Unit",unit.unit_number],["Project",unit.project_name],["Configuration",unit.configuration],["Status",unit.status],["Listed price",new Intl.NumberFormat('en-IN',{style:'currency',currency:org.currency_code}).format(unit.price)]]}/></td>
                  <td className="p-3">{unit.project_name}</td>
                  <td className="p-3">{unit.configuration}</td>
                  <td className="p-3">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: org.currency_code,
                    }).format(unit.price)}
                  </td>
                  <td className="p-3">{canWrite && permissions.has('inventory.manage') ? <FormDialog title={`Update status — ${unit.unit_number}`} triggerLabel={unit.status} tone={unit.status === 'available' ? 'green' : unit.status === 'blocked' ? 'orange' : 'brand'} icon={<MdLocalOffer/>}><ActionForm action={updateProperty.bind(null,orgSlug,unit.id)}><input type="hidden" name="previous" value={unit.status}/><Select label="New status" name="status" defaultValue={unit.status}>{['available','blocked','sold'].map(value=><option key={value} value={value}>{value}</option>)}</Select><Submit>Save status</Submit></ActionForm></FormDialog> : <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColors[unit.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'}`}>{unit.status}</span>}</td>
                  <td className="p-3">
                    <RecordMenu label={unit.unit_number}>
                      <RecordDetails title={`Property details — ${unit.unit_number}`} label="View details" fields={[["Unit",unit.unit_number],["Project",unit.project_name],["Configuration",unit.configuration],["Status",unit.status],["Listed price",new Intl.NumberFormat('en-IN',{style:'currency',currency:org.currency_code}).format(unit.price)]]}/>
                      {canWrite && permissions.has('inventory.manage') && <FormDialog title={`Edit property — ${unit.unit_number}`} triggerLabel="Edit property" icon={<MdEdit/>}><ActionForm action={editProperty.bind(null,orgSlug,unit.id)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Project name" name="project_name" defaultValue={unit.project_name} required maxLength={160}/><Field label="Unit number" name="unit_number" defaultValue={unit.unit_number} required maxLength={80}/><Field label="Configuration" name="configuration" defaultValue={unit.configuration || ''} maxLength={80}/><Field label={`Listed price (${org.currency_code})`} name="price" type="number" min="0" max="999999999999.99" step="0.01" defaultValue={unit.price} required/></div><Submit>Save changes</Submit></ActionForm></FormDialog>}
                    </RecordMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!result.data.length && (
            <EmptyState title={q || status ? 'No properties match your filters' : 'No properties added yet'} kind={q || status ? 'search' : 'records'} description={q || status ? 'Try adjusting your search or status filter to see more units.' : 'Your property units will appear here once they are added.'}/>
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
