import { redirect } from 'next/navigation';
import Link from 'next/link';
import Default from 'components/auth/variants/DefaultAuthLayout';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field } from 'components/crm/Fields';
import { createClient } from 'utils/supabase/server';
import { changePassword } from '../actions';
export default async function Password() {
  const supabase = await createClient();
  const {data:{user},error} = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  return <Default maincard={<div className="my-16 w-full max-w-[420px] rounded-2xl bg-white px-8 py-10 shadow-xl shadow-gray-200/50 dark:bg-navy-800 dark:shadow-none"><h1 className="mb-3 text-3xl font-bold text-navy-700 dark:text-white">Change Password</h1><p className="mb-8 text-sm text-gray-500 dark:text-gray-400">Use at least 12 characters. This changes your CRM password; your Google login stays the same.</p><ActionForm action={changePassword}><div className="flex flex-col gap-5"><Field label="New password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/><Field label="Confirm new password" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></div><div className="mt-8"><Submit>Save password</Submit></div></ActionForm><Link href="/workspaces" className="mt-6 flex justify-center text-sm font-medium text-brand-500 transition-colors hover:text-brand-600">← Return to CRM</Link></div>}/>;
}
