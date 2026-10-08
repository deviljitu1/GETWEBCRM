import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(8000) }) },
    });
    for (let check = 0; check < 3; check++) {
      const { data, error } = await supabase.rpc('database_health');
      if (error || data !== true) throw new Error('Database unavailable');
    }
    return Response.json({ ok: true, checkedAt: new Date().toISOString() }, { headers });
  } catch {
    console.error(JSON.stringify({ event: 'supabase_health_failed' }));
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
