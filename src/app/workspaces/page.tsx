import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from 'utils/supabase/server';
import { checkQuery } from 'utils/crm/access';
import { signOut } from 'app/auth/actions';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  const admin = await supabase.rpc('is_platform_admin');
  checkQuery(admin.error);
  if (admin.data === true) redirect('/admin');
  const memberships = await supabase.from('organization_members').select('organization_id')
    .eq('user_id', user.id).eq('status', 'active');
  checkQuery(memberships.error);
  const ids = (memberships.data || []).map(member => member.organization_id);
  const organizations = ids.length ? await supabase.from('organizations').select('id,name,slug')
    .in('id', ids).eq('status', 'active').order('name') : { data: [], error: null };
  checkQuery(organizations.error);
  return <main className="min-h-screen bg-background-100 px-5 py-16 text-navy-700 dark:bg-navy-900 dark:text-white">
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Your workspaces</h1>
      <p className="mt-3 text-gray-500">Choose the client workspace you want to open.</p>
      <div className="mt-8 space-y-3">
        {(organizations.data || []).map(org => <Link key={org.id} href={`/${org.slug}/dashboard`} className="block rounded-xl bg-white p-5 font-medium shadow-sm dark:bg-navy-800">{org.name}</Link>)}
        {!organizations.data?.length && <p role="status" className="rounded-xl bg-white p-5 dark:bg-navy-800">You do not have access to a workspace yet. Ask your workspace administrator to invite the email address you used to sign in.</p>}
      </div>
      <form action={signOut} className="mt-8"><input type="hidden" name="scope" value="login" /><button className="text-sm font-medium text-brand-500">Sign out</button></form>
    </div>
  </main>;
}
