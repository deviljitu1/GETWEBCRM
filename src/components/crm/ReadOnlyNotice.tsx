import Link from 'next/link';
import { requireOrg } from 'utils/crm/access';
import { MdLockOutline } from 'react-icons/md';

export default async function ReadOnlyNotice({ orgSlug }: { orgSlug: string }) {
  const { permissions } = await requireOrg(orgSlug);
  const managesBilling = permissions.has('settings.manage');
  return (
    <section className="text-amber-950 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <MdLockOutline className="mt-0.5 shrink-0 text-xl" />
        <div>
          <p className="font-semibold">Read-only workspace</p>
          <p className="mt-1 text-sm">
            You can view the areas permitted by your role. Changes require an active subscription and the appropriate role.
            {!managesBilling && ' Contact your workspace administrator for access or billing help.'}
          </p>
        </div>
      </div>
      {managesBilling && <Link
        href={`/${orgSlug}/billing`}
        className="dark:text-amber-950 inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-amber-900 px-4 text-sm font-semibold text-white hover:bg-amber-800 dark:bg-amber-200"
      >
        View subscription
      </Link>}
    </section>
  );
}
