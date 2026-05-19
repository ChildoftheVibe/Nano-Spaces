import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { totpEnrollVerifySchema } from '@/lib/validation/auth'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { verifyTotpCode, decryptTotpSecret } from '@/lib/auth/totp'
import { create2faCookieValue, build2faCookieHeader } from '@/lib/auth/2fa-token'
import { AuthError, ValidationError } from '@/lib/errors/AppError'
import { env } from '@/lib/env'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const body = await req.json().catch(() => null)
  const parsed = totpEnrollVerifySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const { code } = parsed.data
  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()

  if (error || !user) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, totp_secret')
    .eq('id', user.id)
    .single()

  if (!profile?.totp_secret) {
    throw new AuthError({
      userMessage: 'No pending TOTP enrollment found. Please start enrollment first.',
      requestId,
    })
  }

  const secret = decryptTotpSecret(profile.totp_secret)
  const valid = verifyTotpCode(code, secret)

  if (!valid) {
    throw new AuthError({
      userMessage: 'Invalid code. Make sure your authenticator app time is correct.',
      requestId,
    })
  }

  // Activate 2FA
  await adminClient
    .from('profiles')
    .update({ totp_enabled: true, two_fa_method: 'totp' })
    .eq('id', user.id)

  // Issue 2FA cookie so the user doesn't need to verify immediately after enrolling
  const cookieValue = await create2faCookieValue(user.id, env.NEXTAUTH_SECRET)
  const isProd = process.env.NODE_ENV === 'production'
  const cookieHeader = build2faCookieHeader(cookieValue, isProd)

  return success({ enrolled: true }, { headers: { 'Set-Cookie': cookieHeader } })
})
