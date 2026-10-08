import { redirect } from 'next/navigation';
import { requireOrg } from 'utils/crm/access';
export default async function Home({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrg(orgSlug);
  redirect(`/${orgSlug}/dashboard`);
}
