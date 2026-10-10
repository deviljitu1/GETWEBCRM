'use client';
import EmptyState from 'components/crm/EmptyState';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="rounded-2xl bg-white p-5 dark:bg-navy-800"><EmptyState title="We could not load this workspace" kind="unavailable" description="Please try again. If the issue continues, contact your administrator."><button onClick={reset} className="min-h-11 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">Try again</button></EmptyState></div>;
}
