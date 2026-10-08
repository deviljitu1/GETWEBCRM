import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with cross-browser cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Basic route protection
  // If user is not logged in and trying to access a protected route
  const publicRoute = pathname === '/' || pathname === '/login' || ['/auth/callback','/auth/recovery','/auth/forgot-password','/auth/password'].includes(pathname) ||
    /^\/(?:admin|[a-z0-9]+(?:-[a-z0-9]+)*)\/login$/.test(pathname) || pathname.startsWith('/api/');
  if (!user && !publicRoute) {
    // Redirect to login page of the current orgSlug if present, else generic login
    const parts = pathname.split('/')
    const orgSlug = parts[1]
    url.pathname = ['workspaces', 'login'].includes(orgSlug) ? '/login' : `/${orgSlug}/login`
    url.search = ''
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    return response
  }

  return supabaseResponse
}
