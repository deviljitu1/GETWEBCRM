import 'server-only';
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: This client bypasses RLS. Never expose it to the browser.
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Server configuration is incomplete');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
