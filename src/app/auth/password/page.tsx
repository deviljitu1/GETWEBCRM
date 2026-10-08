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
  return <Default maincard={<div className="my-16 w-full max-w-[420px] px-2"><h1 className="mb-4 text-3xl font-bold">Change your CRM password</h1><p className="mb-6 text-sm">Use at least 12 characters. This changes your CRM password; your Google password stays the same.</p><ActionForm action={changePassword}><Field label="New password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/><Field label="Confirm new password" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/><Submit>Save password</Submit></ActionForm><Link href="/workspaces" className="mt-5 block text-brand-500">Return to CRM</Link></div>}/>;
}
