import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from 'utils/supabase/server';
import { validSlug } from './validation';

const resolveOrg = cache(async (slug: string) => {
  if (!validSlug(slug)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${slug}/login`);
  if (user.app_metadata?.must_change_password === true) redirect('/auth/password');
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id,name,slug,email,phone,website,legal_name,status,currency_code,member_limit')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error('Unable to load workspace');
  if (!org || org.status !== 'active') notFound();
  const membership = await supabase
    .from('organization_members')
    .select('role_id')
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (membership.error) throw new Error('Unable to verify workspace access');
  if (!membership.data) {
    const admin = await supabase.rpc('is_platform_admin');
    if (admin.error) throw new Error('Unable to verify workspace access');
    if (admin.data !== true) notFound();
  }
  const support = !membership.data
    ? await supabase.rpc('has_support_access', { target_org_id: org.id })
    : null;
  if (support?.error) throw new Error('Unable to verify support access');
  if (!membership.data && support?.data !== true) notFound();
  const [grants, billing] = await Promise.all([
    membership.data
      ? supabase.from('role_permissions').select('permission_key').eq('role_id', membership.data.role_id)
      : Promise.resolve(null),
    supabase.rpc('billing_access', { org_id: org.id }),
  ]);
  if (grants?.error) throw new Error('Unable to verify permissions');
  const permissions = new Set<string>(membership.data
    ? (grants?.data || []).map((row) => row.permission_key)
    : ['leads.read.all', 'inventory.read', 'sites.read']);
  if (billing.error) throw new Error('Unable to verify subscription access');
  return { supabase, user, org, permissions, canWrite: Boolean(membership.data) && billing.data === true };
});

export async function requireOrg(slug: string, permission?: string) {
  const context = await resolveOrg(slug);
  if (permission && !context.permissions.has(permission)) notFound();
  return context;
}

export async function requireWriteOrg(slug: string, permission?: string) {
  const context = await requireOrg(slug, permission);
  if (!context.canWrite)
    throw new Error(
      'This workspace is read-only until its subscription is active.',
    );
  return context;
}
export const requirePlatformAdmin = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/admin/login');
  const admin = await supabase.rpc('is_platform_admin');
  if (admin.error) throw new Error('Unable to verify platform access');
  if (admin.data !== true) notFound();
  return { supabase, user };
});
export function checkQuery(error: { code?: string } | null) {
  if (error) throw new Error('Unable to load records. Please try again.');
}
