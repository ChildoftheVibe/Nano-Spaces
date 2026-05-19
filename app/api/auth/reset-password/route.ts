import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { resetPasswordSchema } from '@/lib/validation/auth'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { isPasswordBreached } from '@/lib/auth/password'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const body = await req.json().catch(() => null)
  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const { password } = parsed.data

  const breached = await isPasswordBreached(password)
  if (breached) {
    throw new ValidationError({
      userMessage:
        'This password has appeared in a data breach and cannot be used. Please choose a different password.',
      requestId,
    })
  }

  const supabase = await createSessionClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new AuthError({
      userMessage: 'Invalid or expired reset link. Please request a new one.',
      requestId,
    })
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    throw new AuthError({
      userMessage: 'Failed to update password. Please request a new reset link.',
      requestId,
    })
  }

  // Fetch two_fa_method so the client can redirect to /verify-2fa
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('two_fa_method, totp_enabled')
    .eq('id', user.id)
    .single()

  return success({
    updated: true,
    userId: user.id,
    twoFaMethod: profile?.totp_enabled ? (profile.two_fa_method ?? 'totp') : null,
  })
})
