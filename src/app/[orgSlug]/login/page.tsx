import Login from 'components/auth/Login';
import { notFound } from 'next/navigation';
import { validSlug } from 'utils/crm/validation';
export default async function Page({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>; searchParams: Promise<{ error?: string }>;
}) {
  const { orgSlug } = await params;
  if (!validSlug(orgSlug)) notFound();
  return <Login scope={orgSlug} error={(await searchParams).error} />;
}
