import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { checkRateLimit } from '@/lib/rate-limit'
import { createAdminClient, createSessionClient } from '@/lib/supabase/server'
import { generateOtpCode, hashOtpCode, getOtpExpiry } from '@/lib/auth/otp'
import { sendEmail } from '@/lib/email/send'
import { otpEmailTemplate } from '@/lib/email/auth-templates'
import { AuthError, RateLimitError, ValidationError } from '@/lib/errors/AppError'
import { z } from 'zod'

const bodySchema = z.object({
  purpose: z.enum(['login', 'enrollment']),
  userId: z.string().uuid().optional(),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const rl = await checkRateLimit('otpSend', ip)
  if (!rl.success) {
    throw new RateLimitError({
      userMessage: 'Too many OTP requests. Please wait before requesting another code.',
      requestId,
    })
  }

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const { purpose, userId: bodyUserId } = parsed.data

  let userId: string
  let userEmail: string

  if (purpose === 'login' && bodyUserId) {
    // Pre-auth: userId passed explicitly (user just authenticated password, needs 2FA)
    const adminClient = createAdminClient()
    const { data: authUser, error } = await adminClient.auth.admin.getUserById(bodyUserId)
    if (error || !authUser.user?.email) {
      throw new AuthError({ userMessage: 'User not found.', requestId })
    }
    userId = authUser.user.id
    userEmail = authUser.user.email
  } else {
    // Post-auth enrollment: get from session cookie
    const sessionClient = await createSessionClient()
    const {
      data: { user },
      error,
    } = await sessionClient.auth.getUser()
    if (error || !user?.email) {
      throw new AuthError({ userMessage: 'Not authenticated.', requestId })
    }
    userId = user.id
    userEmail = user.email
  }

  const code = generateOtpCode()
  const codeHash = hashOtpCode(code)
  const expiresAt = getOtpExpiry()

  const adminClient = createAdminClient()

  // Invalidate any existing unused OTPs for this user+purpose
  await adminClient
    .from('email_otp_codes')
    .update({ is_used: true })
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .eq('is_used', false)

  await adminClient.from('email_otp_codes').insert({
    user_id: userId,
    code_hash: codeHash,
    purpose,
    expires_at: expiresAt.toISOString(),
  })

  const purposeLabel = purpose === 'enrollment' ? 'email verification' : 'sign-in'
  await sendEmail({
    to: userEmail,
    subject: `Your Nano Spaces ${purposeLabel} code`,
    html: otpEmailTemplate(code, purposeLabel),
    requestId,
  })

  return success({ sent: true })
})
