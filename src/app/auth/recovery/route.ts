import { NextResponse } from 'next/server';
import { createClient } from 'utils/supabase/server';
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const result = await supabase.auth.exchangeCodeForSession(code);
    if (!result.error) return NextResponse.redirect(new URL('/auth/password',origin));
  }
  return NextResponse.redirect(new URL('/auth/forgot-password?error=expired',origin));
}
