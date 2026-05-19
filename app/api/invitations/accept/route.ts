import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { isPasswordBreached } from '@/lib/auth/password'
import { NotFoundError, ValidationError } from '@/lib/errors/AppError'

const bodySchema = z.object({
  token: z.string().length(64),
  fullName: z.string().min(1, 'Name is required').max(100),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128),
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

  const { token, fullName, password } = parsed.data
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('invitations')
    .select('id, email, role, org_id, expires_at, accepted, revoked')
    .eq('token_hash', tokenHash)
    .single()

  if (!invite || invite.accepted || invite.revoked) {
    throw new NotFoundError({
      userMessage: 'This invitation is invalid or has already been used.',
      requestId,
    })
  }

  if (new Date(invite.expires_at) < new Date()) {
    throw new NotFoundError({ userMessage: 'This invitation has expired.', requestId })
  }

  // Breach check
  const breached = await isPasswordBreached(password)
  if (breached) {
    throw new ValidationError({
      userMessage:
        'This password has appeared in a known data breach. Please choose a different password.',
      requestId,
    })
  }

  // Create auth user
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    if (createError?.message?.includes('already registered')) {
      throw new ValidationError({
        userMessage: 'An account with this email already exists.',
        requestId,
      })
    }
    throw new Error('Failed to create account.')
  }

  const newUserId = created.user.id

  // Create profile
  const { error: profileError } = await admin.from('profiles').insert({
    id: newUserId,
    full_name: fullName,
    email: invite.email,
    role: invite.role as 'user' | 'org_admin',
    org_id: invite.org_id,
  })

  if (profileError) {
    // Rollback auth user on profile failure
    await admin.auth.admin.deleteUser(newUserId)
    throw new Error('Failed to create profile.')
  }

  // Mark invitation accepted
  await admin.from('invitations').update({ accepted: true }).eq('id', invite.id)

  await admin.from('activity_log').insert({
    org_id: invite.org_id,
    actor_id: newUserId,
    action: 'invitation_accepted',
    target_type: 'invitation',
    target_id: invite.id,
    details: { email: invite.email, role: invite.role },
  })

  // Return the email so the client can sign in with email+password directly
  return success({ email: invite.email })
})
