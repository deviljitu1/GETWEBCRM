import Link from 'next/link';
import EmptyState from 'components/crm/EmptyState';
export default function NotFound() {
  return <div className="p-8"><EmptyState title="Page unavailable" kind="search" description="This record does not exist or your account does not have access."><Link className="inline-flex min-h-11 items-center rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white" href="/">Return home</Link></EmptyState></div>;
}
