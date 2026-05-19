import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verify2faCookieValue, TWO_FA_COOKIE_NAME } from '@/lib/auth/2fa-token'
import { CURRENT_TOS_VERSION } from '@/lib/tos'

const PROTECTED_PREFIXES = [
  '/calendar',
  '/settings',
  '/admin',
  '/org-admin',
  '/super-admin',
  '/onboarding',
]
const ORG_ADMIN_PREFIXES = ['/org-admin']
const SUPER_ADMIN_PREFIXES = ['/super-admin']
const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password']
// Routes exempt from TOS/onboarding redirects (they ARE the TOS/onboarding pages)
const TOS_EXEMPT = ['/onboarding', '/accept-tos']

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
}
function isOrgAdminRoute(pathname: string): boolean {
  return ORG_ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
}
function isSuperAdminRoute(pathname: string): boolean {
  return SUPER_ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
}
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((p) => pathname.startsWith(p))
}
function isTosExempt(pathname: string): boolean {
  return TOS_EXEMPT.some((p) => pathname.startsWith(p))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  let response = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthenticated = !!user

  // Redirect logged-in users away from auth pages
  if (isAuthRoute(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL('/calendar', req.url))
  }

  // Public routes — no auth required
  if (!isProtected(pathname)) {
    return response
  }

  // Not logged in — send to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Fetch profile once for all subsequent checks
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'role, is_active, tos_accepted_at, tos_version_accepted, org_id, totp_enabled, two_fa_method',
    )
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Suspended accounts
  if (!profile.is_active) {
    return NextResponse.redirect(new URL('/unauthorized?reason=suspended', req.url))
  }

  // 2FA not enrolled — send to onboarding to set it up
  if (!profile.totp_enabled) {
    if (!pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
    return response
  }

  // 2FA enrolled — verify the session cookie
  const twoFaCookie = req.cookies.get(TWO_FA_COOKIE_NAME)?.value
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const verifiedUserId = twoFaCookie ? await verify2faCookieValue(twoFaCookie, secret) : null

  if (!verifiedUserId || verifiedUserId !== user.id) {
    const verifyUrl = new URL('/verify-2fa', req.url)
    verifyUrl.searchParams.set('userId', user.id)
    verifyUrl.searchParams.set('method', profile.two_fa_method ?? 'totp')
    verifyUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(verifyUrl)
  }

  // TOS: first-time acceptance — send to onboarding (step 3)
  if (!profile.tos_accepted_at && !isTosExempt(pathname)) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // TOS: version outdated — send to re-acceptance page
  if (
    profile.tos_accepted_at &&
    profile.tos_version_accepted !== CURRENT_TOS_VERSION &&
    !isTosExempt(pathname)
  ) {
    return NextResponse.redirect(new URL('/accept-tos', req.url))
  }

  // Role checks
  if (isSuperAdminRoute(pathname) && profile.role !== 'super_admin') {
    return NextResponse.redirect(new URL('/unauthorized?reason=role', req.url))
  }
  if (isOrgAdminRoute(pathname) && profile.role !== 'org_admin' && profile.role !== 'super_admin') {
    return NextResponse.redirect(new URL('/unauthorized?reason=role', req.url))
  }

  // Subscription check
  if (profile.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_status, grace_period_ends_at')
      .eq('id', profile.org_id)
      .single()

    const status = org?.subscription_status ?? ''
    const graceStillActive =
      status === 'grace' &&
      org?.grace_period_ends_at != null &&
      new Date(org.grace_period_ends_at) > new Date()
    const isBlocked =
      status === 'inactive' || status === 'expired' || (status === 'grace' && !graceStillActive)

    if (
      isBlocked &&
      !pathname.startsWith('/paywall') &&
      !pathname.startsWith('/settings/billing')
    ) {
      return NextResponse.redirect(new URL('/paywall', req.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|api/user|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
