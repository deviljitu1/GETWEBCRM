import { createClient } from '@supabase/supabase-js'

// IMPORTANT: This client bypasses RLS. Never expose it to the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
