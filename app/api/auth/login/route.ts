import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { loginSchema } from '@/lib/validation/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { accountLockoutAdminTemplate } from '@/lib/email/auth-templates'
import { AuthError, RateLimitError, ValidationError } from '@/lib/errors/AppError'
import { verifyTurnstileToken } from '@/lib/auth/turnstile'

const SOFT_LOCK_THRESHOLD = 5
const HARD_LOCK_THRESHOLD = 10
const SOFT_LOCK_MINUTES = 30
const HARD_LOCK_HOURS = 24

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const rl = await checkRateLimit('login', ip)
  if (!rl.success) {
    throw new RateLimitError({
      userMessage: 'Too many login attempts. Please wait before trying again.',
      requestId,
    })
  }

  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const { email, password, turnstileToken } = parsed.data

  if (turnstileToken) {
    const valid = await verifyTurnstileToken(turnstileToken, ip)
    if (!valid) {
      throw new ValidationError({
        userMessage: 'Security challenge failed. Please try the challenge again.',
        requestId,
      })
    }
  }

  const supabase = createAdminClient()

  // Look up profile for lockout state before attempting sign-in
  const { data: preCheckProfile } = await supabase
    .from('profiles')
    .select('id, locked_until, failed_login_attempts, org_id, full_name')
    .eq('email', email)
    .maybeSingle()

  if (preCheckProfile?.locked_until) {
    const lockedUntil = new Date(preCheckProfile.locked_until)
    if (lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000)
      throw new AuthError({
        userMessage: `Account is locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
        details: { lockedUntil: preCheckProfile.locked_until },
        requestId,
      })
    }
    // Lock expired — clear it
    await supabase
      .from('profiles')
      .update({ locked_until: null, failed_login_attempts: 0 })
      .eq('id', preCheckProfile.id)
  }

  // Attempt sign-in via Supabase Auth
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !sessionData.session) {
    if (preCheckProfile) {
      const newCount = (preCheckProfile.failed_login_attempts ?? 0) + 1
      let lockedUntil: string | null = null

      if (newCount >= HARD_LOCK_THRESHOLD) {
        lockedUntil = new Date(Date.now() + HARD_LOCK_HOURS * 60 * 60 * 1000).toISOString()
      } else if (newCount >= SOFT_LOCK_THRESHOLD) {
        lockedUntil = new Date(Date.now() + SOFT_LOCK_MINUTES * 60 * 1000).toISOString()
      }

      await supabase
        .from('profiles')
        .update({ failed_login_attempts: newCount, locked_until: lockedUntil })
        .eq('id', preCheckProfile.id)

      // Notify org admins when account reaches the hard-lock threshold
      if (newCount === HARD_LOCK_THRESHOLD && preCheckProfile.org_id) {
        const [{ data: adminProfiles }, { data: org }] = await Promise.all([
          supabase
            .from('profiles')
            .select('email')
            .eq('org_id', preCheckProfile.org_id)
            .eq('role', 'org_admin'),
          supabase.from('organizations').select('name').eq('id', preCheckProfile.org_id).single(),
        ])

        if (adminProfiles && adminProfiles.length > 0) {
          await Promise.allSettled(
            adminProfiles.map((admin) =>
              sendEmail({
                to: admin.email,
                subject: `Account locked — ${preCheckProfile.full_name ?? email}`,
                html: accountLockoutAdminTemplate(
                  preCheckProfile.full_name ?? email,
                  email,
                  org?.name ?? 'your organization',
                ),
                requestId,
              }),
            ),
          )
        }
      }
    }

    throw new AuthError({
      userMessage: 'Invalid email or password.',
      requestId,
    })
  }

  // Successful sign-in — reset failed attempts
  await supabase
    .from('profiles')
    .update({ failed_login_attempts: 0, locked_until: null })
    .eq('id', sessionData.user.id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('two_fa_method, totp_enabled, is_active, tos_accepted_at')
    .eq('id', sessionData.user.id)
    .single()

  if (!profile) {
    throw new AuthError({ userMessage: 'Account not found.', requestId })
  }

  if (!profile.is_active) {
    throw new AuthError({
      userMessage: 'Your account has been suspended. Contact your administrator.',
      requestId,
    })
  }

  return success({
    session: sessionData.session,
    user: {
      id: sessionData.user.id,
      email: sessionData.user.email,
    },
    requires2fa: profile.totp_enabled === true,
    twoFaMethod: profile.two_fa_method ?? null,
    requiresTos: !profile.tos_accepted_at,
  })
})
