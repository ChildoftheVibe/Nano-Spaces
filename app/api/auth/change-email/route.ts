import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { changeEmailSchema } from '@/lib/validation/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { emailChangeNewTemplate, emailChangeOldTemplate } from '@/lib/email/auth-templates'
import { AuthError, RateLimitError, ValidationError } from '@/lib/errors/AppError'
import { env } from '@/lib/env'
import { createHash, randomBytes } from 'crypto'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const rl = await checkRateLimit('default', ip)
  if (!rl.success) {
    throw new RateLimitError({ userMessage: 'Too many requests.', requestId })
  }

  const body = await req.json().catch(() => null)
  const parsed = changeEmailSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const { newEmail, currentPassword } = parsed.data
  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error: userError,
  } = await sessionClient.auth.getUser()

  if (userError || !user?.email) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  // Re-authenticate to confirm identity before email change
  const { error: reAuthError } = await sessionClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (reAuthError) {
    throw new AuthError({ userMessage: 'Current password is incorrect.', requestId })
  }

  if (newEmail.toLowerCase() === user.email.toLowerCase()) {
    throw new ValidationError({
      userMessage: 'New email must be different from your current email.',
      requestId,
    })
  }

  // Check the new email isn't already taken (query profiles to avoid admin API dependency)
  const adminClient = createAdminClient()
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', newEmail)
    .maybeSingle()
  if (existingProfile) {
    // No enumeration: return same success to avoid leaking whether email exists
    return success({ sent: true })
  }

  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await adminClient
    .from('profiles')
    .update({
      pending_email: newEmail,
      email_change_token_hash: tokenHash,
      email_change_expires_at: expiresAt,
    })
    .eq('id', user.id)

  const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}&id=${user.id}`

  await Promise.all([
    sendEmail({
      to: newEmail,
      subject: 'Confirm your new Nano Spaces email',
      html: emailChangeNewTemplate(verifyUrl, newEmail),
      requestId,
    }),
    sendEmail({
      to: user.email,
      subject: 'Your Nano Spaces email address is being changed',
      html: emailChangeOldTemplate(newEmail),
      requestId,
    }),
  ])

  return success({ sent: true })
})
