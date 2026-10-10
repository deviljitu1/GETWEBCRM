import { loadSiteData, sitePageSize } from 'utils/crm/site-data';
import { pageNumber } from 'utils/crm/validation';
import WorkspaceNavigation from 'components/crm/WorkspaceNavigation';
import Link from 'next/link';
import { requireOrg } from 'utils/crm/access';
import { cardClass, Field, Select } from 'components/crm/Fields';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import ReadOnlyNotice from 'components/crm/ReadOnlyNotice';
import {
  addBooking, addCategory, addCollection, addContractor, addContractorFinance,
  addDailyReport, addExpense, addLabourEntry, addMaterial, addMaterialMovement,
  addProject, addTask, updateProject, updateTask,
} from './actions';

const views = [
  ['dashboard','Overview'], ['projects','Projects'], ['daily','Daily reports'],
  ['materials','Materials'], ['labour','Labour & contractors'], ['expenses','Expenses'],
  ['tasks','Tasks'], ['sales','Bookings & collections'], ['categories','Categories'],
  ['missing','Missing daily updates'], ['balances','Contractor balances'],
  ['costs','Site-wise expenses'], ['consumption','Material usage'],
] as const;
type View = (typeof views)[number][0];
type Row = Record<string, any>;

const label = (value: string) => value.replaceAll('_',' ').replace(/\b\w/g, char => char.toUpperCase());
const money = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function Form({ title, action, children, submit = 'Save record' }: {
  title: string; action: (state: { error?: string; message?: string }, form: FormData) => Promise<{ error?: string; message?: string }>;
  children: React.ReactNode; submit?: string;
}) {
  return <details className={cardClass}>
    <summary className="cursor-pointer text-lg font-bold">{title}</summary>
    <ActionForm action={action} reset className="mt-5">
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      <div><Submit>{submit}</Submit></div>
    </ActionForm>
  </details>;
}

function ProjectSelect({ projects, optional = false }: { projects: Row[]; optional?: boolean }) {
  return <Select label="Project / site" name="project_id">
    {optional && <option value="">General stock</option>}
    {projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}
  </Select>;
}

function Empty({ subject }: { subject: string }) {
  return <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500 dark:bg-navy-900">No {subject} yet. Add your first record when you are ready.</p>;
}

function MetricGroup({ title, items, currency = false }: { title: string; items: [string, unknown][]; currency?: boolean }) {
  return <section className={cardClass}>
    <h2 className="text-lg font-bold">{title}</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map(([name,value]) => <div className="rounded-xl bg-gray-50 p-4 dark:bg-navy-900" key={name}>
        <p className="text-xs font-medium text-gray-500">{name}</p>
        <p className="mt-1 text-2xl font-bold">{currency ? money(value) : Number(value || 0).toLocaleString('en-IN')}</p>
      </div>)}
    </div>
  </section>;
}

export default async function Sites({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ view?: string; page?: string; secondaryPage?: string; contractorPage?: string }>;
}) {
  const { orgSlug } = await params;
  const filters = await searchParams;
  const requested = filters.view;
  const page = pageNumber(filters.page), secondaryPage = pageNumber(filters.secondaryPage), contractorPage = pageNumber(filters.contractorPage);
  const view: View = views.some(([key]) => key === requested) ? requested as View : 'dashboard';
  const { supabase, org, canWrite: paidAccess, permissions } = await requireOrg(orgSlug,'sites.read');
  const canWrite = paidAccess && permissions.has('sites.manage');
  const { primary, secondary: extra, categories, projects, contractors, materials, bookings, summary } =
    await loadSiteData(supabase, org.id, view, canWrite, page, secondaryPage);
  const rows = primary.rows, secondary = extra.rows;
  const projectName = (id: string) => projects.find(project => project.id === id)?.name || 'Project';
  const contractorName = (id: string) => contractors.find(contractor => contractor.id === id)?.name || 'Contractor';
  const materialName = (id: string) => materials.find(material => material.id === id)?.name || 'Material';
  const categoryName = (id: string) => categories.find(category => category.id === id)?.name || 'Other';
  const pageLink = (key: string, value: number) => '/'+orgSlug+'/sites?'+new URLSearchParams({ view, page: String(page), secondaryPage: String(secondaryPage), contractorPage: String(contractorPage), [key]: String(value) });
  const pagination = (name: string, key: string, current: number, hasMore: boolean) => <nav aria-label={name + ' pagination'} className="flex items-center justify-between gap-4 text-sm">
    <span>{name} · Page {current}</span><div className="flex gap-4">
      {current > 1 && <Link className="font-semibold text-brand-500" href={pageLink(key,current-1)}>Previous</Link>}
      {hasMore && <Link className="font-semibold text-brand-500" href={pageLink(key,current+1)}>Next</Link>}
    </div>
  </nav>;
  const paths = [...new Set([...rows,...secondary].flatMap(row => [row.receipt_path,...(row.photo_paths || [])].filter(Boolean)))];
  const signed = paths.length ? await supabase.storage.from('site-files').createSignedUrls(paths,3600) : { data: [], error: null };
  const urls = new Map((signed.data || []).filter(item => item.signedUrl).map(item => [item.path,item.signedUrl]));
  const attachment = (path: string | null, name = 'View file') => path && urls.has(path)
    ? <a href={urls.get(path)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-500">{name} ↗</a> : null;

  return <div className="flex min-w-0 flex-col gap-5 pb-8">
      <WorkspaceNavigation orgSlug={orgSlug} />
    <header className="rounded-[24px] bg-gradient-to-br from-navy-700 to-brand-700 p-6 text-white sm:p-8">
      <p className="text-sm font-medium text-white/75">{org.name} · Site operations</p>
      <h1 className="mt-2 text-3xl font-bold">Projects, work and costs in one place</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/80">Create each site once, then record daily work, materials, labour, expenses, tasks and collections against it.</p>
    </header>
    <nav aria-label="Site operations" className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm dark:bg-navy-800">
      {views.map(([key,name]) => <Link key={key} href={`/${orgSlug}/sites?view=${key}`} className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold ${view === key ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-navy-700'}`}>{name}</Link>)}
    </nav>
    {!paidAccess && <ReadOnlyNotice orgSlug={orgSlug} />}

    {view === 'dashboard' && <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      <MetricGroup title="Projects" items={[["Total projects",summary.projects],["Active sites",summary.active_sites],["Completed sites",summary.completed_sites],["Delayed sites",summary.delayed_sites]]} />
      <MetricGroup title="Site work" items={[["Today's reports",summary.today_reports],["Completed tasks",summary.completed_tasks],["Pending tasks",summary.pending_tasks],["Delayed tasks",summary.delayed_tasks]]} />
      <MetricGroup title="Materials" items={[["Materials in stock",summary.stock_available],["Low-stock items",summary.low_stock]]} />
      <MetricGroup title="Labour" items={[["Today's labour",summary.today_labour],["Contractors present",summary.contractor_attendance]]} />
      <MetricGroup title="Site finance" currency items={[["Today's expenses",summary.today_expenses],["Total site expenses",summary.site_expenses],["Contractor payments",summary.contractor_payments],["Material purchase value",summary.material_payments]]} />
      <MetricGroup title="Sales" items={[["Leads",summary.leads],["Follow-ups today",summary.followups],["Site visits",summary.visits],["Bookings",summary.bookings]]} />
      <MetricGroup title="Collections" currency items={[["Collected",summary.collection],["Outstanding",summary.outstanding]]} />
    </div>}

    {view === 'dashboard' && <section className={cardClass}>
      <h2 className="text-lg font-bold">Daily checks and detailed reports</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {views.filter(([key]) => ['missing','balances','costs','consumption'].includes(key)).map(([key,name]) =>
          <Link key={key} href={`/${orgSlug}/sites?view=${key}`} className="rounded-xl bg-gray-50 p-4 font-semibold text-brand-500 dark:bg-navy-900">{name} →</Link>)}
      </div>
      <p className="mt-3 text-sm text-gray-500">Open Material usage for quantities by material and unit. Contractor balances show outstanding dues and advances separately.</p>
    </section>}

    {view === 'missing' && <section className={cardClass}>
      <h2 className="text-lg font-bold">Sites awaiting today&apos;s daily report</h2>
      <p className="mt-2 text-sm text-gray-500">India time · Active and delayed sites that have started. This list updates when a daily report is submitted; it does not send messages.</p>
      <div className="mt-4 space-y-3">{rows.length ? rows.map(site => <article key={site.id} className="rounded-xl border border-amber-200 p-4 dark:border-navy-600">
        <h3 className="font-semibold">{site.name}</h3>
        <p className="mt-1 text-sm text-gray-500">{site.report_date} · Supervisor: {site.site_supervisor || 'Unassigned'} · In-charge: {site.site_incharge || 'Unassigned'}</p>
        {canWrite && <Link href={`/${orgSlug}/sites?view=daily`} className="mt-2 inline-block text-sm font-semibold text-brand-500">Submit daily report →</Link>}
      </article>) : <p className="text-sm text-gray-500">No missing updates on this page. All eligible sites have reported, or there are no eligible sites.</p>}</div>
    </section>}

    {view === 'balances' && <section className={cardClass}>
      <h2 className="text-lg font-bold">Contractor balances and today&apos;s labour</h2>
      <p className="mt-2 text-sm text-gray-500">Outstanding = bills minus advances and payments. Credit shows payments ahead of recorded bills. Labour is reported by contractor/group.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">{rows.length ? rows.map(contractor => <article key={contractor.id} className="rounded-xl border border-gray-200 p-4 dark:border-navy-600">
        <h3 className="font-semibold">{contractor.name}</h3>
        <p className="mt-1 text-sm text-gray-500">{contractor.work_type || 'General'} · Today&apos;s labour: {contractor.today_labour}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">{[['Bills',contractor.billed],['Advances',contractor.advance],['Payments',contractor.paid],['Outstanding',contractor.outstanding],['Credit',contractor.credit]].map(([name,value]) =>
          <div key={String(name)}><dt className="text-gray-500">{name}</dt><dd className="font-semibold">{money(value)}</dd></div>)}</dl>
      </article>) : <Empty subject="contractors"/>}</div>
    </section>}

    {view === 'costs' && <section className={cardClass}>
      <h2 className="text-lg font-bold">Site-wise expenses</h2>
      <p className="mt-2 text-sm text-gray-500">Recorded site expenses only. Material purchases and contractor payments remain separate to avoid double counting.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{rows.length ? rows.map(site => <article key={site.id} className="rounded-xl border border-gray-200 p-4 dark:border-navy-600">
        <h3 className="font-semibold">{site.name}</h3><p className="mt-2 text-sm">Today: <b>{money(site.today_total)}</b></p><p className="mt-1 text-sm">All time: <b>{money(site.total)}</b></p>
      </article>) : <Empty subject="sites"/>}</div>
    </section>}

    {view === 'consumption' && <section className={cardClass}>
      <h2 className="text-lg font-bold">Material receipts, consumption and balance</h2>
      <p className="mt-2 text-sm text-gray-500">All-time totals per material. Different units are never added together. These balances cover workspace stock.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.length ? rows.map(material => <article key={material.id} className="rounded-xl border border-gray-200 p-4 dark:border-navy-600">
        <h3 className="font-semibold">{material.name}</h3>
        <dl className="mt-3 space-y-2 text-sm">{[['Received',material.received],['Used',material.used],['Balance',material.balance]].map(([name,value]) =>
          <div key={String(name)} className="flex justify-between gap-3"><dt>{name}</dt><dd className="font-semibold">{Number(value).toLocaleString('en-IN')} {material.unit}</dd></div>)}</dl>
        {Number(material.balance)<=Number(material.low_stock_level) && <p className="mt-3 text-sm font-semibold text-amber-600">Low stock · threshold {material.low_stock_level} {material.unit}</p>}
      </article>) : <Empty subject="materials"/>}</div>
    </section>}

    {view === 'projects' && <>
      {canWrite && <Form title="Add project / site" action={addProject.bind(null,orgSlug)} submit="Create project">
        <Field label="Project name" name="name" required maxLength={160}/><Field label="Site location" name="site_location" maxLength={250}/>
        <Field label="Site in-charge" name="site_incharge" maxLength={160}/><Field label="Site supervisor" name="site_supervisor" maxLength={160}/>
        <Field label="Start date" name="start_date" type="date"/><Field label="Target completion" name="target_completion_date" type="date"/>
        <Select label="Current stage" name="current_stage">{categories.filter(c=>c.kind==='stage').map(c=><option key={c.id}>{c.name}</option>)}</Select>
        <Field label="Total units / floors" name="total_units" type="number" min="0" defaultValue="0" required/>
        <Field label="Pending work" name="pending_work" maxLength={4000}/><Field label="Remarks" name="remarks" maxLength={4000}/>
      </Form>}
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Project master</h2>
        {rows.length ? <div className="grid gap-4 lg:grid-cols-2">{rows.map(project=><article key={project.id} className="rounded-2xl border border-gray-200 p-4 dark:border-navy-600">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{project.name}</h3><p className="text-sm text-gray-500">{project.site_location || 'No location'} · {label(project.status)}</p></div><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">{project.completed_percent}%</span></div>
          <p className="mt-3 text-sm">Stage: {project.current_stage} · Units/floors: {project.total_units}</p>
          <p className="mt-1 text-sm text-gray-500">In-charge: {project.site_incharge || '—'} · Supervisor: {project.site_supervisor || '—'}</p>
          <p className="mt-1 text-sm text-gray-500">Start: {project.start_date || '—'} · Target: {project.target_completion_date || '—'}</p>
          {project.pending_work && <p className="mt-2 text-sm">Pending: {project.pending_work}</p>}
          {canWrite && <details className="mt-4 border-t pt-3 dark:border-navy-600"><summary className="cursor-pointer text-sm font-semibold text-brand-500">Update progress</summary>
            <ActionForm action={updateProject.bind(null,orgSlug,project.id)} className="mt-3">
              <Select label="Current stage" name="current_stage" defaultValue={project.current_stage}>{[project.current_stage,...categories.filter(c=>c.kind==='stage').map(c=>c.name)].filter((v,i,a)=>a.indexOf(v)===i).map(name=><option key={name}>{name}</option>)}</Select>
              <Field label="Completed %" name="completed_percent" type="number" step="0.01" min="0" max="100" defaultValue={project.completed_percent} required/>
              <Select label="Status" name="status" defaultValue={project.status}>{['active','completed','delayed','on_hold'].map(status=><option key={status} value={status}>{label(status)}</option>)}</Select>
              <Field label="Pending work" name="pending_work" defaultValue={project.pending_work} maxLength={4000}/>
              <Field label="Remarks" name="remarks" defaultValue={project.remarks} maxLength={4000}/><Submit>Save progress</Submit>
            </ActionForm>
          </details>}
        </article>)}</div> : <Empty subject="projects"/>}
      </section>
    </>}

    {view === 'expenses' && <>
      {canWrite && projects.length > 0 && <Form title="Record site expense" action={addExpense.bind(null,orgSlug)}>
        <Field label="Date" name="expense_date" type="date" defaultValue={today()} required/><ProjectSelect projects={projects}/>
        <Select label="Expense category" name="category_id"><option value="">Other</option>{categories.filter(c=>c.kind==='expense').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Field label="Particular" name="particular" maxLength={500} required/>
        <Field label="Amount (₹)" name="amount" type="number" min="0.01" step="0.01" required/>
        <Field label="Paid by" name="paid_by" maxLength={160}/>
        <Select label="Payment mode" name="payment_mode">{['cash','upi','bank','card','other'].map(mode=><option key={mode} value={mode}>{label(mode)}</option>)}</Select>
        <Field label="Approved by" name="approved_by" maxLength={160}/>
        <Field label="Bill / receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/>
        <Field label="Remarks" name="remarks" maxLength={2000}/>
      </Form>}
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Site expenses</h2>
        {rows.length ? <div className="space-y-2">{rows.map(entry=><article key={entry.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 p-4 dark:border-navy-600">
          <div><h3 className="font-semibold">{entry.particular}</h3><p className="mt-1 text-sm text-gray-500">{projectName(entry.project_id)} · {categoryName(entry.category_id)} · {entry.expense_date}</p><p className="mt-1 text-sm text-gray-500">Paid by {entry.paid_by || '—'} · {label(entry.payment_mode)} · Approved by {entry.approved_by || '—'}</p>{attachment(entry.receipt_path,'View receipt')}</div>
          <p className="text-lg font-bold">{money(entry.amount)}</p>
        </article>)}</div> : <Empty subject="expenses"/>}
      </section>
    </>}

    {view === 'tasks' && <>
      {canWrite && projects.length > 0 && <Form title="Add site task" action={addTask.bind(null,orgSlug)}>
        <ProjectSelect projects={projects}/><Field label="Task" name="title" maxLength={200} required/>
        <Field label="Assigned person" name="assigned_person" maxLength={160}/><Field label="Start date" name="start_date" type="date"/>
        <Field label="Target date" name="target_date" type="date"/>
        <Select label="Status" name="status">{['pending','in_progress','completed','delayed','on_hold'].map(status=><option key={status} value={status}>{label(status)}</option>)}</Select>
        <Field label="Remarks" name="remarks" maxLength={2000}/>
      </Form>}
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Work tracking</h2>
        {rows.length ? <div className="grid gap-3 lg:grid-cols-2">{rows.map(task=><article key={task.id} className="rounded-xl border border-gray-200 p-4 dark:border-navy-600">
          <div className="flex justify-between gap-2"><h3 className="font-semibold">{task.title}</h3><span className="text-sm font-semibold text-brand-500">{label(task.status)}</span></div>
          <p className="mt-1 text-sm text-gray-500">{projectName(task.project_id)} · Assigned: {task.assigned_person || '—'}</p>
          <p className="mt-1 text-sm text-gray-500">Start: {task.start_date || '—'} · Target: {task.target_date || '—'} · Completed: {task.completed_date || '—'}</p>
          {task.remarks && <p className="mt-2 text-sm">{task.remarks}</p>}
          {canWrite && <details className="mt-3 border-t pt-3 dark:border-navy-600"><summary className="cursor-pointer text-sm font-semibold text-brand-500">Update task</summary>
            <ActionForm action={updateTask.bind(null,orgSlug,task.id)} className="mt-3">
              <Select label="Status" name="status" defaultValue={task.status}>{['pending','in_progress','completed','delayed','on_hold'].map(status=><option key={status} value={status}>{label(status)}</option>)}</Select>
              <Field label="Remarks" name="remarks" defaultValue={task.remarks} maxLength={2000}/><Submit>Save task</Submit>
            </ActionForm>
          </details>}
        </article>)}</div> : <Empty subject="tasks"/>}
      </section>
    </>}

    {view === 'sales' && <>
      {canWrite && projects.length > 0 && <div className="grid gap-5 lg:grid-cols-2">
        <Form title="Record booking" action={addBooking.bind(null,orgSlug)}>
          <ProjectSelect projects={projects}/><Field label="Customer name" name="customer_name" maxLength={160} required/>
          <Field label="Booking date" name="booking_date" type="date" defaultValue={today()} required/>
          <Field label="Booking value (₹)" name="booking_value" type="number" min="0.01" step="0.01" required/>
          <Field label="Remarks" name="remarks" maxLength={2000}/>
        </Form>
        {bookings.length > 0 && <Form title="Record collection" action={addCollection.bind(null,orgSlug)}>
          <Select label="Booking" name="booking_id">{bookings.map(booking=><option key={booking.id} value={booking.id}>{booking.customer_name} · {money(booking.booking_value)}</option>)}</Select>
          <Field label="Payment date" name="payment_date" type="date" defaultValue={today()} required/>
          <Field label="Amount (₹)" name="amount" type="number" min="0.01" step="0.01" required/>
          <Select label="Payment mode" name="payment_mode">{['bank','upi','cash','card','other'].map(mode=><option key={mode} value={mode}>{label(mode)}</option>)}</Select>
          <Field label="Reference" name="reference" maxLength={160}/>
        </Form>}
      </div>}
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Bookings</h2>
        {rows.length ? <div className="space-y-2">{rows.map(booking=><p key={booking.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-gray-200 p-3 text-sm dark:border-navy-600"><span><b>{booking.customer_name}</b> · {projectName(booking.project_id)} · {booking.booking_date}</span><b>{money(booking.booking_value)}</b></p>)}</div> : <Empty subject="bookings"/>}
      </section>
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Collections</h2>
        {secondary.length ? <div className="space-y-2">{secondary.map(entry=><p key={entry.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-gray-200 p-3 text-sm dark:border-navy-600"><span>{entry.payment_date} · {bookings.find(b=>b.id===entry.booking_id)?.customer_name || 'Booking'} · {label(entry.payment_mode)} {entry.reference && `· ${entry.reference}`}</span><b>{money(entry.amount)}</b></p>)}</div> : <Empty subject="collections"/>}
      </section>
    </>}

    {view === 'categories' && <>
      {canWrite && <Form title="Add workspace category" action={addCategory.bind(null,orgSlug)} submit="Add category">
        <Select label="Category type" name="kind">{['material','expense','work','contractor','stage'].map(kind=><option key={kind} value={kind}>{label(kind)}</option>)}</Select>
        <Field label="Category name" name="name" maxLength={100} required/>
      </Form>}
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Workspace categories</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{['material','expense','work','contractor','stage'].map(kind=><div key={kind} className="rounded-xl border border-gray-200 p-4 dark:border-navy-600"><h3 className="font-bold">{label(kind)}</h3><p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{rows.filter(row=>row.kind===kind).map(row=>row.name).join(' · ') || 'No categories yet'}</p></div>)}</div>
      </section>
    </>}
    {view === 'daily' && <>
      {canWrite && projects.length > 0 && <Form title="Submit daily site work / DPR" action={addDailyReport.bind(null,orgSlug)} submit="Submit daily report">
        <Field label="Date" name="work_date" type="date" defaultValue={today()} required/><ProjectSelect projects={projects}/>
        <Field label="Work description" name="work_description" maxLength={4000} required/><Field label="Location / floor" name="location_floor" maxLength={160}/>
        <Field label="Labour count" name="labour_count" type="number" min="0" defaultValue="0" required/>
        <Select label="Contractor" name="contractor_id"><option value="">None</option>{contractors.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</Select>
        <Field label="Material used" name="material_used" maxLength={1000}/><Field label="Work completed" name="work_completed" maxLength={2000}/>
        <Field label="Pending work" name="pending_work" maxLength={2000}/><Field label="Supervisor" name="supervisor" maxLength={160} required/>
          <Field label="Site photo (JPG/PNG/WebP, under 3 MB)" name="photos" type="file" accept="image/jpeg,image/png,image/webp" required/>
        <Field label="Remarks" name="remarks" maxLength={2000}/>
      </Form>}
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Daily reports</h2>
        {rows.length ? <div className="space-y-3">{rows.map(report=><article key={report.id} className="rounded-xl border border-gray-200 p-4 dark:border-navy-600">
          <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{projectName(report.project_id)}</h3><span className="text-sm text-gray-500">{report.work_date}</span></div>
          <p className="mt-2 text-sm">{report.work_description}</p>
          <p className="mt-2 text-sm text-gray-500">{report.location_floor || 'Site'} · {report.labour_count} labour · {report.supervisor}</p>
          {report.work_completed && <p className="mt-2 text-sm">Completed: {report.work_completed}</p>}
          {report.pending_work && <p className="mt-1 text-sm">Pending: {report.pending_work}</p>}
          {report.material_used && <p className="mt-1 text-sm">Material: {report.material_used}</p>}
          <div className="mt-3 flex flex-wrap gap-3">{(report.photo_paths || []).map((path:string,index:number)=><span key={path}>{attachment(path,`Photo ${index+1}`)}</span>)}</div>
        </article>)}</div> : <Empty subject="daily reports"/>}
      </section>
    </>}

    {view === 'materials' && <>
      {canWrite && <div className="grid gap-5 lg:grid-cols-2">
        <Form title="Add material" action={addMaterial.bind(null,orgSlug)}>
          <Field label="Material name" name="name" maxLength={160} required/>
          <Select label="Category" name="category_id"><option value="">Other</option>{categories.filter(c=>c.kind==='material').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Field label="Unit (bags, kg, pcs…)" name="unit" maxLength={30} required/>
          <Field label="Low-stock alert at" name="low_stock_level" type="number" min="0" step="0.01" defaultValue="0" required/>
        </Form>
        {materials.length > 0 && <Form title="Receive or use material" action={addMaterialMovement.bind(null,orgSlug)}>
          <Select label="Material" name="material_id">{materials.map(m=><option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</Select>
          <ProjectSelect projects={projects} optional/>
          <Select label="Movement" name="movement_type"><option value="received">Received</option><option value="used">Used</option></Select>
          <Field label="Date / purchase date" name="movement_date" type="date" defaultValue={today()} required/>
          <Field label="Quantity" name="quantity" type="number" min="0.01" step="0.01" required/>
          <Field label="Unit rate (optional)" name="unit_rate" type="number" min="0" step="0.01"/>
          <Field label="Supplier" name="supplier" maxLength={160}/><Field label="Bill number" name="bill_number" maxLength={100}/>
          <Field label="Bill / receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/>
        </Form>}
      </div>}
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Stock balance</h2>
        {rows.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(material=><article key={material.id} className="rounded-xl border border-gray-200 p-4 dark:border-navy-600">
          <h3 className="font-semibold">{material.name}</h3><p className="mt-2 text-2xl font-bold">{material.balance} <span className="text-sm font-normal text-gray-500">{material.unit}</span></p>
          {Number(material.balance)<=Number(material.low_stock_level) && <p className="mt-2 text-sm font-semibold text-amber-600">Low stock · alert at {material.low_stock_level}</p>}
        </article>)}</div> : <Empty subject="materials"/>}
      </section>
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Recent material movements</h2>
        {secondary.length ? <div className="space-y-2">{secondary.map(entry=><div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 p-3 text-sm dark:border-navy-600">
          <span><b>{materialName(entry.material_id)}</b> · {label(entry.movement_type)} · {entry.quantity} · {entry.movement_date}</span>
          <span>{entry.supplier && `${entry.supplier} · `}{entry.bill_number && `Bill ${entry.bill_number} · `}{entry.amount !== null && money(entry.amount)} {attachment(entry.receipt_path,'Receipt')}</span>
        </div>)}</div> : <Empty subject="material movements"/>}
      </section>
    </>}

    {view === 'labour' && <>
      {canWrite && <div className="grid gap-5 lg:grid-cols-2">
        <Form title="Add contractor / labour group" action={addContractor.bind(null,orgSlug)}>
          <Field label="Name" name="name" maxLength={160} required/>
          <Select label="Work type" name="work_type"><option value="">Other</option>{categories.filter(c=>c.kind==='contractor').map(c=><option key={c.id}>{c.name}</option>)}</Select>
          <Field label="Daily rate (₹)" name="daily_rate" type="number" min="0" step="0.01" defaultValue="0" required/>
        </Form>
        {projects.length > 0 && contractors.length > 0 && <Form title="Record attendance" action={addLabourEntry.bind(null,orgSlug)}>
          <Field label="Date" name="work_date" type="date" defaultValue={today()} required/><ProjectSelect projects={projects}/>
          <Select label="Contractor" name="contractor_id">{contractors.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</Select>
          <Select label="Attendance" name="attendance"><option value="present">Present</option><option value="absent">Absent</option></Select>
          <Field label="Labour count" name="labour_count" type="number" min="0" defaultValue="0" required/>
          <Select label="Work status" name="work_status">{['pending','in_progress','completed','on_hold'].map(s=><option key={s} value={s}>{label(s)}</option>)}</Select>
          <Field label="Remarks" name="remarks" maxLength={2000}/>
        </Form>}
        {projects.length > 0 && contractors.length > 0 && <Form title="Contractor bill, advance or payment" action={addContractorFinance.bind(null,orgSlug)}>
          <Field label="Date" name="entry_date" type="date" defaultValue={today()} required/><ProjectSelect projects={projects}/>
          <Select label="Contractor" name="contractor_id">{contractors.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</Select>
          <Select label="Entry type" name="kind"><option value="bill">Bill</option><option value="advance">Advance</option><option value="payment">Payment</option></Select>
          <Field label="Amount (₹)" name="amount" type="number" min="0.01" step="0.01" required/>
          <Field label="Bill / receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/>
          <Field label="Remarks" name="remarks" maxLength={2000}/>
        </Form>}
      </div>}
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Contractors</h2>
        {contractors.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{contractors.slice((contractorPage-1)*sitePageSize,contractorPage*sitePageSize).map(c=><div key={c.id} className="rounded-xl border border-gray-200 p-4 dark:border-navy-600"><b>{c.name}</b><p className="mt-1 text-sm text-gray-500">{c.work_type || 'General'} · {money(c.daily_rate)} / day</p></div>)}</div> : <Empty subject="contractors"/>}
      </section>
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Attendance</h2>
        {rows.length ? <div className="space-y-2">{rows.map(entry=><p key={entry.id} className="rounded-xl border border-gray-200 p-3 text-sm dark:border-navy-600">{entry.work_date} · {projectName(entry.project_id)} · <b>{contractorName(entry.contractor_id)}</b> · {entry.labour_count} labour · {label(entry.attendance)} · {label(entry.work_status)}</p>)}</div> : <Empty subject="attendance records"/>}
      </section>
      <section className={cardClass}><h2 className="mb-4 text-lg font-bold">Contractor bills & payments</h2>
        {secondary.length ? <div className="space-y-2">{secondary.map(entry=><p key={entry.id} className="rounded-xl border border-gray-200 p-3 text-sm dark:border-navy-600">{entry.entry_date} · {contractorName(entry.contractor_id)} · {label(entry.kind)} · <b>{money(entry.amount)}</b> {attachment(entry.receipt_path,'Bill / receipt')}</p>)}</div> : <Empty subject="contractor amounts"/>}
      </section>
    </>}
    {view !== 'dashboard' && pagination({projects:'Projects',daily:'Daily reports',materials:'Stock balance',labour:'Attendance',expenses:'Expenses',tasks:'Tasks',sales:'Bookings',categories:'Categories',missing:'Missing updates',balances:'Contractor balances',costs:'Site expenses',consumption:'Material usage'}[view], 'page', page, primary.hasMore)}
    {['materials','labour','sales'].includes(view) && pagination(view === 'materials' ? 'Material movements' : view === 'labour' ? 'Contractor bills & payments' : 'Collections', 'secondaryPage', secondaryPage, extra.hasMore)}
    {view === 'labour' && pagination('Contractors', 'contractorPage', contractorPage, contractorPage * sitePageSize < contractors.length)}
  </div>;
}
