import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { createAdminClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/errors/AppError'
import { createHash } from 'crypto'
import { redirect } from 'next/navigation'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const userId = searchParams.get('id')

  if (!token || !userId) {
    throw new AuthError({ userMessage: 'Invalid verification link.', requestId })
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, pending_email, email_change_token_hash, email_change_expires_at')
    .eq('id', userId)
    .single()

  if (
    !profile?.pending_email ||
    !profile.email_change_token_hash ||
    !profile.email_change_expires_at
  ) {
    throw new AuthError({
      userMessage: 'Verification link is invalid or has already been used.',
      requestId,
    })
  }

  if (profile.email_change_token_hash !== tokenHash) {
    throw new AuthError({ userMessage: 'Verification link is invalid.', requestId })
  }

  if (new Date(profile.email_change_expires_at) < new Date()) {
    throw new AuthError({
      userMessage: 'Verification link has expired. Please request a new email change.',
      requestId,
    })
  }

  // Apply email change in Supabase Auth
  await supabase.auth.admin.updateUserById(userId, { email: profile.pending_email })

  // Clear pending fields
  await supabase
    .from('profiles')
    .update({
      pending_email: null,
      email_change_token_hash: null,
      email_change_expires_at: null,
    })
    .eq('id', userId)

  redirect('/login?emailChanged=1')
})
