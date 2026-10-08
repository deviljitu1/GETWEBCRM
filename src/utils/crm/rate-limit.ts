import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from 'utils/supabase/admin';
export async function rateLimit(key: string, limit = 30, seconds = 60) {
  const bucket = createHash('sha256').update(key).digest('hex');
  const { data, error } = await createAdminClient().rpc('consume_rate_limit', { bucket, max_attempts: limit, window_seconds: seconds });
  if (error) throw new Error('Unable to process requests right now');
  if (!data) throw new Error('Too many requests. Please try again later.');
}
