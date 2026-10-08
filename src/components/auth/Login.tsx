'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';
import Default from 'components/auth/variants/DefaultAuthLayout';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { authenticate } from 'app/auth/actions';
import { createClient } from 'utils/supabase/client';

export default function Login({ scope, error }: { scope: string; error?: string }) {
  const [signup, setSignup] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const [pending, setPending] = useState(false);
  const admin = scope === 'admin';
  const common = scope === 'login';
  async function googleLogin() {
    setPending(true); setOauthError('');
    const next = admin ? '/admin' : common ? '/workspaces' : `/${scope}/dashboard`;
    const { error } = await createClient().auth.signInWithOAuth({ provider: 'google', options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    } });
    if (error) { setOauthError('Unable to sign in with Google. Please try again.'); setPending(false); }
  }
  return <Default maincard={<div className="my-16 flex w-full items-center px-2"><div className="w-full max-w-[420px]">
    <h1 className="mb-3 text-3xl font-bold text-navy-700 dark:text-white">{admin ? 'Super Admin Login' : common ? 'GETWEBCRM' : scope.toUpperCase()}</h1>
    <p className="mb-6 text-gray-500">{signup ? 'Create your account. Workspace access requires an invitation.' : 'Sign in to your workspace.'}</p>
    {(error || oauthError) && <p role="alert" className="mb-4 text-red-600">{oauthError || 'Sign-in could not be completed. Please try again.'}</p>}
    <button onClick={googleLogin} disabled={pending} className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl bg-lightPrimary p-4 disabled:opacity-50"><FcGoogle />{pending ? 'Opening Google…' : 'Sign in with Google'}</button>
    <ActionForm action={authenticate.bind(null, scope, signup)}>
      <label className="text-sm font-medium">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-2 w-full rounded-xl border border-gray-200 bg-transparent p-3" /></label>
      <label className="text-sm font-medium">Password<input name="password" type="password" required minLength={signup ? 12 : undefined} maxLength={128} autoComplete={signup ? 'new-password' : 'current-password'} className="mt-2 w-full rounded-xl border border-gray-200 bg-transparent p-3" /></label>
      <Submit>{signup ? 'Create account' : 'Sign in'}</Submit>
    </ActionForm>
    {!signup && <Link href="/auth/forgot-password" className="mt-5 block text-sm font-medium text-brand-500">Forgot password?</Link>}
    {!admin && <button onClick={() => setSignup(!signup)} className="mt-5 text-sm font-medium text-brand-500">{signup ? 'Already registered? Sign in' : 'Create an account'}</button>}
    {!common && <p className="mt-5 text-sm"><Link href="/login" className="text-brand-500">Sign in to another workspace</Link></p>}
  </div></div>} />;
}
