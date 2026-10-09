'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from 'utils/supabase/server';
import { phone, text } from 'utils/crm/validation';
import { rateLimit } from 'utils/crm/rate-limit';
import type { ActionState } from 'components/crm/ActionForm';

export async function saveAccount(_state: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Please sign in again.' };
  try {
    await rateLimit(`account:${user.id}`, 5, 60);
    const result = await supabase.from('profiles').update({
      full_name: text(form, 'full_name', 160, true),
      phone: phone(text(form, 'phone', 40)),
    }).eq('id', user.id).select('id').single();
    if (result.error) throw new Error('Unable to save your account.');
    revalidatePath('/workspaces');
    return { message: 'Account updated.' };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : 'Unable to save account.' };
  }
}
