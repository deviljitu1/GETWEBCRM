'use server';

import { redirect } from 'next/navigation';
import { createClient } from 'utils/supabase/server';
import { rateLimit } from 'utils/crm/rate-limit';
import { email, phone, text, validSlug } from 'utils/crm/validation';
import type { ActionState } from 'components/crm/ActionForm';

export async function createWorkspace(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Please sign in again to continue.' };
  try {
    const slug = text(form, 'slug', 80, true);
    if (!validSlug(slug))
      throw new Error('Use lowercase letters, numbers, and hyphens for the workspace URL.');
    await rateLimit(`workspace:create:${user.id}`, 3, 3600);
    const result = await supabase.rpc('create_self_service_organization', {
      org_name: text(form, 'name', 160, true),
      org_slug: slug,
      org_email: email(text(form, 'email', 254, true), true),
      org_phone: phone(text(form, 'phone', 40)),
      org_legal_name: text(form, 'legal_name', 160) || null,
    });
    if (result.error)
      throw new Error(
        result.error.code === '23505'
          ? 'That workspace URL is already in use.'
          : 'Unable to create your workspace. Please review the details and try again.',
      );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Unable to create workspace',
    };
  }
  redirect(`/${text(form, 'slug', 80, true)}/billing`);
}
