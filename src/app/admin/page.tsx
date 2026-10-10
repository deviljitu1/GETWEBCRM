import Link from 'next/link';
import {
  MdArrowForward,
  MdBusiness,
  MdGroup,
  MdPayment,
  MdTrendingUp,
} from 'react-icons/md';
import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import { cardClass } from 'components/crm/Fields';
import { subscriptionSummary } from 'utils/billing/presentation';

export default async function Dashboard() {
  const { supabase } = await requirePlatformAdmin();
  const [summary, recent, subscriptions] = await Promise.all([
    supabase.rpc('platform_summary'),
    supabase
      .from('organizations')
      .select('id,name,slug,status,created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('billing_contracts')
      .select('status,mode,paid_count,paid_until'),
  ]);
  [summary, recent, subscriptions].forEach((r) => checkQuery(r.error));
  const data = summary.data;
  const activeSubscriptions = subscriptions.data.filter(
    (record) => subscriptionSummary(record).label === 'Active',
  ).length;
  const metrics = [
    {
      label: 'Organizations',
      value: data.organizations,
      detail: `${data.active} active`,
      icon: MdBusiness,
      accent: 'bg-brand-500',
    },
    {
      label: 'Workspace users',
      value: data.members,
      detail: 'Across all workspaces',
      icon: MdGroup,
      accent: 'bg-cyan-500',
    },
    {
      label: 'Paid subscriptions',
      value: activeSubscriptions,
      detail: 'Verified monthly subscribers',
      icon: MdPayment,
      accent: 'bg-green-500',
    },
    {
      label: 'Platform health',
      value: 'Live',
      detail: 'CRM services available',
      icon: MdTrendingUp,
      accent: 'bg-orange-500',
    },
  ];
  return (
    <div className="flex flex-col gap-6 pb-8">
      <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-brand-700 via-brand-600 to-blueSecondary p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-white/70">
              Platform overview
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Run every workspace with confidence.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/80">
              Track organizations, customer subscriptions, and workspace access
              from one clear control centre.
            </p>
          </div>
          <Link
            href="/admin/tenants"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-600 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Manage workspaces <MdArrowForward />
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-navy-700 dark:bg-navy-800"
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
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className={cardClass}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-500">
                Customer workspaces
              </p>
              <h2 className="mt-1 text-xl font-bold">Recent organizations</h2>
            </div>
            <Link
              className="text-sm font-semibold text-brand-500"
              href="/admin/tenants"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recent.data.map((org) => (
              <Link
                href="/admin/tenants"
                key={org.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50 dark:border-navy-700 dark:hover:bg-navy-700"
              >
                <div>
                  <p className="font-semibold text-navy-700 dark:text-white">
                    {org.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    /{org.slug} · Added{' '}
                    {new Date(org.created_at).toLocaleDateString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                    })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    org.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-navy-700 dark:text-gray-300'
                  }`}
                >
                  {org.status}
                </span>
              </Link>
            ))}
            {!recent.data.length && (
              <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500 dark:bg-navy-900">
                Create your first organization to begin.
              </p>
            )}
          </div>
        </article>
        <article className={cardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-500">
            Quick actions
          </p>
          <h2 className="mt-1 text-xl font-bold">Keep the platform moving</h2>
          <div className="mt-5 grid gap-3">
            <Link
              href="/admin/tenants"
              className="rounded-xl border border-gray-100 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50 dark:border-navy-700 dark:hover:bg-navy-700"
            >
              <p className="font-semibold">Create or manage workspaces</p>
              <p className="mt-1 text-sm text-gray-500">
                Set up client organizations and their access.
              </p>
            </Link>
            <Link
              href="/admin/billing"
              className="rounded-xl border border-gray-100 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50 dark:border-navy-700 dark:hover:bg-navy-700"
            >
              <p className="font-semibold">Review subscriptions</p>
              <p className="mt-1 text-sm text-gray-500">
                Monitor plans, payment links and paid periods.
              </p>
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-xl border border-gray-100 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50 dark:border-navy-700 dark:hover:bg-navy-700"
            >
              <p className="font-semibold">Platform settings</p>
              <p className="mt-1 text-sm text-gray-500">
                Update branding and support details.
              </p>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
