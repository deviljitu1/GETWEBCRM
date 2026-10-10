import { requireOrg } from 'utils/crm/access';
import NavigationSnapshot from './NavigationSnapshot';
import Link from 'next/link';

export default async function WorkspaceNavigation({ orgSlug }: { orgSlug: string }) {
  const { user, permissions, supportManagement } = await requireOrg(orgSlug);
  return <><NavigationSnapshot scope={orgSlug} userId={user.id} permissions={[...permissions]} />
    {supportManagement && <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm dark:border-navy-600 dark:bg-navy-800">
      <p>You are managing this tenant as a platform administrator. Support access expires automatically.</p>
      <Link href="/admin/tenants" className="font-semibold text-brand-500">Return to tenants / end access →</Link>
    </section>}</>;
}
