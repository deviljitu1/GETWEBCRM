'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from 'utils/supabase/server';
import { rateLimit } from 'utils/crm/rate-limit';
import { email, text, validSlug } from 'utils/crm/validation';
import type { ActionState } from 'components/crm/ActionForm';

export async function authenticate(scope: string, signup: boolean, _state: ActionState, form: FormData): Promise<ActionState> {
  if (scope !== 'admin' && scope !== 'login' && !validSlug(scope)) return { error: 'Invalid workspace' };
  if (scope === 'admin' && signup) return { error: 'Platform registration is restricted' };
  const supabase = await createClient();
  let destination = scope === 'admin' ? '/admin' : scope === 'login' ? '/workspaces' : `/${scope}/dashboard`;
  try {
    const address = email(text(form, 'email', 254, true), true);
    const password = form.get('password');
    if (typeof password !== 'string' || !password || password.length > 128) return { error: 'Invalid password' };
    if (signup && password.length < 12) return { error: 'Use a password of at least 12 characters' };
    const requestHeaders = await headers();
    await rateLimit(`auth:email:${address}`, 10, 900);
    await rateLimit(`auth:ip:${requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}`, 50, 900);
    if (signup) {
      const origin = process.env.NEXT_PUBLIC_SITE_URL || requestHeaders.get('origin');
      const next = scope === 'login' ? '/workspaces' : `/${scope}/dashboard`;
      const callback = origin ? new URL(`/auth/callback?next=${encodeURIComponent(next)}`, origin).toString() : undefined;
      const result = await supabase.auth.signUp({ email: address, password, options: { emailRedirectTo: callback } });
      if (result.error) return { error: 'Unable to register. Please try again later.' };
      if (!result.data.session) return { message: 'Check your email to confirm your account, then sign in.' };
    } else {
      const result = await supabase.auth.signInWithPassword({ email: address, password });
      if (result.error) return { error: 'Invalid email or password' };
      if (result.data.user.app_metadata?.must_change_password === true) destination = '/auth/password';
    }
    const accepted = await supabase.rpc('accept_pending_invitations');
    if (accepted.error) return { error: 'Unable to complete sign-in. Please try again.' };
    if (destination !== '/auth/password' && (scope === 'admin' || scope === 'login')) {
      const admin = await supabase.rpc('is_platform_admin');
      if (admin.error) return { error: 'Unable to verify account access. Please try again.' };
      if (scope === 'admin' && admin.data !== true) return { error: 'This account does not have platform access' };
      if (admin.data === true) destination = '/admin';
    } else if (destination !== '/auth/password' && scope !== 'login') {
      const organization = await supabase.from('organizations').select('id').eq('slug', scope).maybeSingle();
      if (organization.error || !organization.data) return { error: 'This account does not have access to this workspace. Contact its administrator.' };
      const member = await supabase.rpc('is_org_member', { target_org_id: organization.data.id });
      if (member.error || member.data !== true) return { error: 'This account does not have access to this workspace' };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to sign in' };
  }
  redirect(destination);
}

export async function signOut(form: FormData) {
  const scope = text(form, 'scope', 80);
  const supabase = await createClient();
  const result = await supabase.auth.signOut();
  if (result.error) throw new Error('Unable to sign out. Please try again.');
  redirect(scope === 'admin' ? '/admin/login' : validSlug(scope) ? `/${scope}/login` : '/login');
}

export async function requestPasswordReset(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const address = email(text(form,'email',254,true),true);
    const requestHeaders = await headers();
    await rateLimit(`reset:email:${address}`,3,3600);
    await rateLimit(`reset:ip:${requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}`,10,3600);
    const origin = process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) throw new Error('Password recovery is unavailable. Contact support.');
    const supabase = await createClient();
    const result = await supabase.auth.resetPasswordForEmail(address,{redirectTo:new URL('/auth/recovery',origin).toString()});
    if (result.error) return { error:'Unable to send recovery email. Try again later or sign in with Google.' };
    return { message:'If this email has an account, a recovery link will arrive shortly. Check your spam folder.' };
  } catch (error) { return { error:error instanceof Error ? error.message : 'Unable to request recovery' }; }
}
export async function changePassword(_state: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {data:{user},error:authError} = await supabase.auth.getUser();
  if (authError || !user) return { error:'Sign in or open a valid recovery link before changing your password.' };
  try {
    await rateLimit(`password:${user.id}`,5,3600);
    const password = form.get('password'), confirmation = form.get('confirmation');
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) return {error:'Use a password between 12 and 128 characters'};
    if (password !== confirmation) return {error:'Passwords do not match'};
    const result = await supabase.auth.updateUser({password});
    if (result.error) return {error:'Unable to change your password. Sign in again or request a fresh recovery link.'};
    if (user.app_metadata?.must_change_password === true) {
      const { createAdminClient } = await import('utils/supabase/admin');
      const admin = createAdminClient();
      const updated = await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { ...user.app_metadata, must_change_password: false },
      });
      if (updated.error) return {error:'Password changed, but account setup could not finish. Contact support.'};
    }
    return {message:'Your CRM password has been updated.'};
  } catch (error) { return {error:error instanceof Error ? error.message : 'Unable to change password'}; }
}
