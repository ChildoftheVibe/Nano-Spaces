import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { changePasswordSchema } from '@/lib/validation/user'
import { createSessionClient } from '@/lib/supabase/server'
import { isPasswordBreached } from '@/lib/auth/password'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const body = await req.json().catch(() => null)
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const { currentPassword, newPassword } = parsed.data
  const supabase = await createSessionClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  // Re-authenticate to verify current password
  const { error: reAuthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (reAuthError) {
    throw new AuthError({ userMessage: 'Current password is incorrect.', requestId })
  }

  const breached = await isPasswordBreached(newPassword)
  if (breached) {
    throw new ValidationError({
      userMessage:
        'This password has appeared in a data breach and cannot be used. Please choose a different password.',
      requestId,
    })
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    throw new AuthError({ userMessage: 'Failed to update password.', requestId })
  }

  return success({ updated: true })
})
