import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { twoFaCodeSchema } from '@/lib/validation/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyTotpCode, decryptTotpSecret } from '@/lib/auth/totp'
import { hashOtpCode } from '@/lib/auth/otp'
import { create2faCookieValue, build2faCookieHeader } from '@/lib/auth/2fa-token'
import { AuthError, RateLimitError, ValidationError } from '@/lib/errors/AppError'
import { env } from '@/lib/env'
import { z } from 'zod'

const bodySchema = z.object({
  userId: z.string().uuid(),
  code: twoFaCodeSchema.shape.code,
  method: z.enum(['totp', 'email_otp']),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const { userId, code, method } = parsed.data

  // Rate limit per user (not IP) to prevent targeted brute force on 2FA codes
  const rl = await checkRateLimit('twoFaVerify', userId)
  if (!rl.success) {
    throw new RateLimitError({
      userMessage: 'Too many verification attempts. Please wait before trying again.',
      requestId,
    })
  }

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, totp_secret, totp_enabled, two_fa_method, hibernate_status, org_id')
    .eq('id', userId)
    .single()

  if (!profile?.totp_enabled) {
    throw new AuthError({ userMessage: '2FA is not configured for this account.', requestId })
  }

  let verified = false

  if (method === 'totp') {
    if (!profile.totp_secret) {
      throw new AuthError({ userMessage: 'TOTP is not configured.', requestId })
    }
    const secret = decryptTotpSecret(profile.totp_secret)
    verified = verifyTotpCode(code, secret)
  } else {
    const codeHash = hashOtpCode(code)
    const { data: otpRow } = await supabase
      .from('email_otp_codes')
      .select('id, expires_at, is_used')
      .eq('user_id', userId)
      .eq('code_hash', codeHash)
      .eq('purpose', 'login')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpRow) {
      await supabase.from('email_otp_codes').update({ is_used: true }).eq('id', otpRow.id)
      verified = true
    }
  }

  if (!verified) {
    throw new AuthError({ userMessage: 'Invalid or expired code.', requestId })
  }

  // Hibernate auto-wake: check seat availability before re-activating a hibernated user
  if (profile.hibernate_status === 'hibernated' && profile.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier, tier_user_limit')
      .eq('id', profile.org_id)
      .single()

    if (org?.tier_user_limit != null) {
      const { count: activeCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('hibernate_status', 'active')
        .eq('is_active', true)
        .neq('id', userId)

      if ((activeCount ?? 0) >= org.tier_user_limit) {
        throw new AuthError({
          userMessage:
            'Your organization has reached its active user limit. Contact your administrator to free up a seat.',
          requestId,
        })
      }
    }

    await supabase.from('profiles').update({ hibernate_status: 'active' }).eq('id', userId)
  }

  await supabase
    .from('profiles')
    .update({
      last_active_at: new Date().toISOString(),
      failed_login_attempts: 0,
    })
    .eq('id', userId)

  const cookieValue = await create2faCookieValue(userId, env.NEXTAUTH_SECRET)
  const isProd = process.env.NODE_ENV === 'production'
  const cookieHeader = build2faCookieHeader(cookieValue, isProd)

  return success({ verified: true }, { headers: { 'Set-Cookie': cookieHeader } })
})
