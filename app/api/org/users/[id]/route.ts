import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError, NotFoundError } from '@/lib/errors/AppError'

const bodySchema = z.object({
  action: z.enum(['suspend', 'unsuspend', 'hibernate', 'wake', 'reset_2fa', 'force_logout']),
})

export const PATCH = withErrorHandling(async (req: NextRequest, ctx) => {
  const requestId = crypto.randomUUID()
  const targetId = (ctx.params as Record<string, string>)['id'] ?? ''

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const { data: adminProfile } = await sessionClient
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'org_admin' || !adminProfile.org_id) {
    throw new AuthError({ userMessage: 'Org admin access required.', requestId })
  }

  const admin = createAdminClient()

  // Verify target belongs to this org
  const { data: target } = await admin
    .from('profiles')
    .select('id, is_active, hibernate_status, role')
    .eq('id', targetId)
    .eq('org_id', adminProfile.org_id)
    .single()

  if (!target) {
    throw new NotFoundError({ userMessage: 'User not found.', requestId })
  }

  if (targetId === user.id) {
    throw new ValidationError({ userMessage: 'You cannot modify your own account.', requestId })
  }

  const { action } = parsed.data
  let updatePayload: Record<string, unknown> = {}

  switch (action) {
    case 'suspend':
      updatePayload = { is_active: false }
      break
    case 'unsuspend':
      updatePayload = {
        is_active: true,
        failed_login_attempts: 0,
        locked_until: null,
      }
      break
    case 'hibernate':
      updatePayload = { hibernate_status: 'hibernated' }
      break
    case 'wake':
      updatePayload = { hibernate_status: 'active' }
      break
    case 'reset_2fa':
      updatePayload = {
        totp_enabled: false,
        totp_secret: null,
        two_fa_method: 'email_otp',
      }
      break
    case 'force_logout':
      // Cookie invalidation happens client-side; revoke Supabase sessions
      await admin.auth.admin.signOut(targetId, 'others')
      break
  }

  if (Object.keys(updatePayload).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (admin.from('profiles') as any)
      .update(updatePayload)
      .eq('id', targetId)

    if (updateError) throw new Error('Failed to update user.')
  }

  await admin.from('activity_log').insert({
    org_id: adminProfile.org_id,
    actor_id: user.id,
    action: `user_${action}`,
    target_type: 'profile',
    target_id: targetId,
    details: {},
  })

  return success({ action, targetId })
})

export const DELETE = withErrorHandling(async (_req: NextRequest, ctx) => {
  const requestId = crypto.randomUUID()
  const targetId = (ctx.params as Record<string, string>)['id'] ?? ''

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const { data: adminProfile } = await sessionClient
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'org_admin' || !adminProfile.org_id) {
    throw new AuthError({ userMessage: 'Org admin access required.', requestId })
  }

  if (targetId === user.id) {
    throw new ValidationError({ userMessage: 'You cannot remove your own account.', requestId })
  }

  const admin = createAdminClient()

  const { data: target } = await admin
    .from('profiles')
    .select('id, email')
    .eq('id', targetId)
    .eq('org_id', adminProfile.org_id)
    .single()

  if (!target) {
    throw new NotFoundError({ userMessage: 'User not found.', requestId })
  }

  await admin.from('activity_log').insert({
    org_id: adminProfile.org_id,
    actor_id: user.id,
    action: 'user_removed',
    target_type: 'profile',
    target_id: targetId,
    details: { email: target.email },
  })

  // Delete auth user (cascades to profile via FK)
  await admin.auth.admin.deleteUser(targetId)

  return success({ removed: true })
})
