import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { twoFaCodeSchema } from '@/lib/validation/auth'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { hashOtpCode } from '@/lib/auth/otp'
import { create2faCookieValue, build2faCookieHeader } from '@/lib/auth/2fa-token'
import { AuthError, ValidationError } from '@/lib/errors/AppError'
import { env } from '@/lib/env'
import { z } from 'zod'

const bodySchema = z.object({ code: twoFaCodeSchema.shape.code })

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
  const codeHash = hashOtpCode(code)

  const { data: otpRow } = await adminClient
    .from('email_otp_codes')
    .select('id')
    .eq('user_id', user.id)
    .eq('code_hash', codeHash)
    .eq('purpose', 'enrollment')
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!otpRow) {
    throw new AuthError({ userMessage: 'Invalid or expired code.', requestId })
  }

  // Mark OTP used
  await adminClient.from('email_otp_codes').update({ is_used: true }).eq('id', otpRow.id)

  // Activate email OTP 2FA
  await adminClient
    .from('profiles')
    .update({ totp_enabled: true, two_fa_method: 'email_otp' })
    .eq('id', user.id)

  // Issue 2FA cookie so the user doesn't need to re-verify immediately
  const cookieValue = await create2faCookieValue(user.id, env.NEXTAUTH_SECRET)
  const isProd = process.env.NODE_ENV === 'production'
  const cookieHeader = build2faCookieHeader(cookieValue, isProd)

  return success({ enrolled: true }, { headers: { 'Set-Cookie': cookieHeader } })
})
