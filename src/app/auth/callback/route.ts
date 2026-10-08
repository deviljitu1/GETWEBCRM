import { NextResponse } from 'next/server'
import { createClient } from 'utils/supabase/server'
import { safeNext } from 'utils/crm/validation'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const accepted = await supabase.rpc('accept_pending_invitations')
      if (!accepted.error) {
        const admin = await supabase.rpc('is_platform_admin')
        if (!admin.error) return NextResponse.redirect(new URL(admin.data === true ? '/admin' : next, origin))
      }
    }
  }

  // return the user to an error page with instructions
  const scope = next.split('/')[1]
  const login = scope === 'admin' ? '/admin/login' : scope && !['workspaces','login'].includes(scope) && /^[a-z0-9-]+$/.test(scope) ? `/${scope}/login` : '/login'
  return NextResponse.redirect(new URL(`${login}?error=auth-failed`, origin))
}
