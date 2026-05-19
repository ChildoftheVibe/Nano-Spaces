import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { forgotPasswordSchema } from '@/lib/validation/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'
import { RateLimitError, ValidationError } from '@/lib/errors/AppError'
import { env } from '@/lib/env'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const rl = await checkRateLimit('forgotPassword', ip)
  if (!rl.success) {
    throw new RateLimitError({
      userMessage: 'Too many password reset requests. Please wait before trying again.',
      requestId,
    })
  }

  const body = await req.json().catch(() => null)
  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const { email } = parsed.data
  const supabase = createAdminClient()

  // No email enumeration: always return success regardless of whether email exists.
  // Supabase's resetPasswordForEmail silently no-ops for unknown emails.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  return success({ sent: true })
})
