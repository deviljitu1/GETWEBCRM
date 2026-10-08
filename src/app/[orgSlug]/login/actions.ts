'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from 'utils/supabase/server'

export async function login(formData: FormData, orgSlug: string) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // Basic error handling - can be expanded to return error messages to UI
    redirect(`/${orgSlug}/login?error=${error.message}`)
  }

  revalidatePath(`/${orgSlug}/dashboard`, 'layout')
  redirect(`/${orgSlug}/dashboard`)
}

export async function signup(formData: FormData, orgSlug: string) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect(`/${orgSlug}/login?error=${error.message}`)
  }

  revalidatePath(`/${orgSlug}/dashboard`, 'layout')
  redirect(`/${orgSlug}/dashboard`)
}
