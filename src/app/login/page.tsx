import { redirect } from 'next/navigation';
import Login from 'components/auth/Login';
import { createClient } from 'utils/supabase/server';

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/workspaces');
  return <Login scope="login" error={(await searchParams).error} />;
}
