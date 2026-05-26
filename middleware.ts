import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verify2faCookieValue, TWO_FA_COOKIE_NAME } from '@/lib/auth/2fa-token'
import { CURRENT_TOS_VERSION } from '@/lib/tos'

function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64')
}

function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    // strict-dynamic: scripts loaded by the trusted nonce-bearing script are also trusted
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://www.paypal.com https://www.paypalobjects.com`,
    // unsafe-inline needed for Tailwind + Next.js inline styles
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    // Supabase REST + realtime WebSocket, Sentry, Turnstile
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://challenges.cloudflare.com",
    // Turnstile + PayPal render inside iframes
    "frame-src 'self' https://challenges.cloudflare.com https://www.paypal.com https://www.sandbox.paypal.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ]
  return directives.join('; ')
}

function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set('Content-Security-Policy', buildCsp(nonce))
  return response
}

// Route groups like (org-admin)/(super-admin) do not appear in the URL,
// so these prefixes must match the real page paths.
const ORG_ADMIN_PREFIXES = [
  '/activity-log',
  '/approvals',
  '/org-settings',
  '/reports',
  '/rooms',
  '/users',
]
const SUPER_ADMIN_PREFIXES = ['/god-mode-audit', '/marketing', '/orgs']
const PROTECTED_PREFIXES = [
  '/calendar',
  '/settings',
  '/onboarding',
  ...ORG_ADMIN_PREFIXES,
  ...SUPER_ADMIN_PREFIXES,
]
const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password', '/signup']
// Routes exempt from TOS/onboarding redirects (they ARE the TOS/onboarding pages)
const TOS_EXEMPT = ['/onboarding', '/accept-tos']
// Public routes that bypass the entire middleware pipeline
const PUBLIC_BYPASS = ['/auth/callback', '/auth/oauth-signup']

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
function isPublicBypass(pathname: string): boolean {
  return PUBLIC_BYPASS.some((p) => pathname.startsWith(p))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Generate a per-request nonce for the Content-Security-Policy
  const nonce = generateNonce()
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)

  let response = NextResponse.next({ request: { headers: requestHeaders } })

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
          // Preserve the nonce request header when rebuilding the response
          response = NextResponse.next({ request: { headers: requestHeaders } })
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

  // OAuth callback and oauth-signup bypass the full pipeline
  if (isPublicBypass(pathname)) {
    return applySecurityHeaders(response, nonce)
  }

  // Root path: authenticated users go to calendar, new visitors go to landing
  if (pathname === '/') {
    const dest = isAuthenticated ? '/calendar' : '/landing'
    return applySecurityHeaders(NextResponse.redirect(new URL(dest, req.url)), nonce)
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute(pathname) && isAuthenticated) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/calendar', req.url)), nonce)
  }

  // Authenticated user lands on /verify-2fa via back button or direct navigation:
  // if they already have a valid 2FA cookie, skip the form and send them forward.
  if (pathname.startsWith('/verify-2fa') && isAuthenticated) {
    const twoFaCookie = req.cookies.get(TWO_FA_COOKIE_NAME)?.value
    const secret = process.env.NEXTAUTH_SECRET
    if (secret && twoFaCookie) {
      const verifiedUserId = await verify2faCookieValue(twoFaCookie, secret)
      if (verifiedUserId === user.id) {
        const next = req.nextUrl.searchParams.get('next') ?? '/calendar'
        return applySecurityHeaders(NextResponse.redirect(new URL(next, req.url)), nonce)
      }
    }
    // Cookie absent or invalid — they genuinely need to verify; let the page render.
    return applySecurityHeaders(response, nonce)
  }

  // Public routes — no auth required
  if (!isProtected(pathname)) {
    return applySecurityHeaders(response, nonce)
  }

  // Not logged in — send to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return applySecurityHeaders(NextResponse.redirect(loginUrl), nonce)
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
    // OAuth users without a profile still need to complete org setup
    const provider = user.app_metadata?.['provider'] as string | undefined
    if (provider && provider !== 'email') {
      return applySecurityHeaders(
        NextResponse.redirect(new URL('/auth/oauth-signup', req.url)),
        nonce,
      )
    }
    return applySecurityHeaders(NextResponse.redirect(new URL('/login', req.url)), nonce)
  }

  // Suspended accounts
  if (!profile.is_active) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/unauthorized?reason=suspended', req.url)),
      nonce,
    )
  }

  // 2FA not enrolled — send to onboarding to set it up
  if (!profile.totp_enabled) {
    if (!pathname.startsWith('/onboarding')) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/onboarding', req.url)), nonce)
    }
    return applySecurityHeaders(response, nonce)
  }

  // 2FA enrolled — verify the session cookie
  const twoFaCookie = req.cookies.get(TWO_FA_COOKIE_NAME)?.value
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/login', req.url)), nonce)
  }

  const verifiedUserId = twoFaCookie ? await verify2faCookieValue(twoFaCookie, secret) : null

  if (!verifiedUserId || verifiedUserId !== user.id) {
    const verifyUrl = new URL('/verify-2fa', req.url)
    verifyUrl.searchParams.set('userId', user.id)
    verifyUrl.searchParams.set('method', profile.two_fa_method ?? 'totp')
    verifyUrl.searchParams.set('next', pathname)
    return applySecurityHeaders(NextResponse.redirect(verifyUrl), nonce)
  }

  // TOS: first-time acceptance — send to onboarding (step 3)
  if (!profile.tos_accepted_at && !isTosExempt(pathname)) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/onboarding', req.url)), nonce)
  }

  // TOS: version outdated — send to re-acceptance page
  if (
    profile.tos_accepted_at &&
    profile.tos_version_accepted !== CURRENT_TOS_VERSION &&
    !isTosExempt(pathname)
  ) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/accept-tos', req.url)), nonce)
  }

  // Role checks
  if (isSuperAdminRoute(pathname) && profile.role !== 'super_admin') {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/unauthorized?reason=role', req.url)),
      nonce,
    )
  }
  if (isOrgAdminRoute(pathname) && profile.role !== 'org_admin' && profile.role !== 'super_admin') {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/unauthorized?reason=role', req.url)),
      nonce,
    )
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
      return applySecurityHeaders(NextResponse.redirect(new URL('/paywall', req.url)), nonce)
    }
  }

  return applySecurityHeaders(response, nonce)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|api/user|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
