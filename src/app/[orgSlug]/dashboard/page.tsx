import WorkspaceNavigation from 'components/crm/WorkspaceNavigation';
import Link from 'next/link';
import { canReadLeads } from 'utils/crm/navigation-access';
import {
  MdArrowForward,
  MdEvent,
  MdHouse,
  MdPersonAdd,
  MdTrendingUp,
} from 'react-icons/md';
import { requireOrg, checkQuery } from 'utils/crm/access';
import { cardClass } from 'components/crm/Fields';
import ReadOnlyNotice from 'components/crm/ReadOnlyNotice';

export default async function Dashboard({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { supabase, org, permissions, canWrite, user } = await requireOrg(orgSlug);
  const showLeads = canReadLeads(permissions);
  const [summary, followups, visits, profile] = await Promise.all([
    supabase.rpc('workspace_summary', { org_id: org.id }),
    showLeads ? supabase
      .from('leads')
      .select('id,full_name,next_followup_at')
      .eq('organization_id', org.id)
      .not('next_followup_at', 'is', null)
      .order('next_followup_at')
      .limit(10) : Promise.resolve({ data: [], error: null }),
    showLeads ? supabase
      .from('site_visits')
      .select('id,lead_id,scheduled_at,status,leads(full_name)')
      .eq('organization_id', org.id)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(10) : Promise.resolve({ data: [], error: null }),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ]);
  [summary, followups, visits].forEach((r) => checkQuery(r.error));
  const userName = profile.data?.full_name || user.email?.split('@')[0] || 'User';
  const data = summary.data;

  const metrics = [
    ...(showLeads ? [{
      label: 'Accessible leads',
      value: data.leads,
      detail: 'Across your pipeline',
      icon: MdPersonAdd,
      accent: 'bg-brand-500',
    },
    {
      label: 'Overdue follow-ups',
      value: data.overdue,
      detail: data.overdue ? 'Needs attention today' : 'Everything is on track',
      icon: MdTrendingUp,
      accent: 'bg-orange-500',
    },
    {
      label: 'Upcoming visits',
      value: data.visits,
      detail: 'Scheduled for the next 7 days',
      icon: MdEvent,
      accent: 'bg-cyan-500',
    },
    ] : []),
    ...(permissions.has('inventory.read')
      ? [
          {
            label: 'Available units',
            value: data.units,
            detail: 'Ready to offer',
            icon: MdHouse,
            accent: 'bg-green-500',
          },
        ]
      : []),
  ];
  const date = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
  return (
    <div className="flex flex-col gap-6 pb-8">
      <WorkspaceNavigation orgSlug={orgSlug} />
      <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-navy-700 via-navy-800 to-brand-700 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold text-white/70">{date}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Good to see you, {userName}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/75">
              Keep your leads moving, plan site visits, and see the full sales
              picture from one workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {showLeads && <Link href={`/${orgSlug}/leads`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-navy-700 shadow-lg transition-transform hover:-translate-y-0.5">Open leads <MdArrowForward /></Link>}
            {permissions.has('sites.read') && <Link href={`/${orgSlug}/sites`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/50 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">Site operations <MdArrowForward /></Link>}
          </div>
        </div>
      </section>
      {!canWrite && <ReadOnlyNotice orgSlug={orgSlug} />}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-navy-700 dark:bg-navy-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">
                    {metric.value}
                  </p>
                </div>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg ${metric.accent}`}
                >
                  <Icon className="text-xl" />
                </span>
              </div>
              <p className="mt-4 text-xs text-gray-500">{metric.detail}</p>
            </article>
          );
        })}
      </section>
      {showLeads && <><section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className={cardClass}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-500">
                Pipeline
              </p>
              <h2 className="mt-1 text-xl font-bold">Lead pipeline</h2>
            </div>
            <Link
              href={`/${orgSlug}/leads`}
              className="text-sm font-semibold text-brand-500"
            >
              View leads
            </Link>
          </div>
          <div className="space-y-3">
            {data.pipeline.map((stage: { name: string; total: number }) => (
              <div key={stage.name} className="flex items-center gap-4">
                <span className="w-28 truncate text-sm font-medium">
                  {stage.name}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-navy-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                    style={{
                      width: `${Math.min(
                        100,
                        data.leads ? (stage.total / data.leads) * 100 : 0,
                      )}%`,
                    }}
                  />
                </div>
                <strong className="w-7 text-right text-sm">
                  {stage.total}
                </strong>
              </div>
            ))}
          </div>
        </article>
        <article className={cardClass}>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-500">
              Schedule
            </p>
            <h2 className="mt-1 text-xl font-bold">Upcoming site visits</h2>
          </div>
          <div className="space-y-3">
            {visits.data.map((visit: any) => (
              <Link
                className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 transition-colors hover:bg-brand-50 dark:bg-navy-900 dark:hover:bg-navy-700"
                key={visit.id}
                href={`/${orgSlug}/leads/${visit.lead_id}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {visit.leads?.full_name || 'Lead'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(visit.scheduled_at).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <MdArrowForward className="shrink-0 text-brand-500" />
              </Link>
            ))}
            {!visits.data.length && (
              <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500 dark:bg-navy-900">
                No upcoming visits. New visits will appear here.
              </p>
            )}
          </div>
        </article>
      </section>
      <article className={cardClass}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-500">
              Follow-up queue
            </p>
            <h2 className="mt-1 text-xl font-bold">What needs attention</h2>
          </div>
          <Link
            href={`/${orgSlug}/leads`}
            className="text-sm font-semibold text-brand-500"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {followups.data.map((lead) => (
            <Link
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50 dark:border-navy-700 dark:hover:bg-navy-700"
              key={lead.id}
              href={`/${orgSlug}/leads/${lead.id}`}
            >
              <div>
                <p className="font-semibold">{lead.full_name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Follow-up{' '}
                  {new Date(lead.next_followup_at).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              <MdArrowForward className="text-brand-500" />
            </Link>
          ))}
          {!followups.data.length && (
            <p className="text-sm text-gray-500">
              No follow-ups are scheduled.
            </p>
          )}
        </div>
      </article></>}
    </div>
  );
}
