import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'

export const DELETE = withErrorHandling(
  async (_req: NextRequest, ctx: { params?: { id?: string; userId?: string } }) => {
    const requestId = crypto.randomUUID()

    const sessionClient = await createSessionClient()
    const {
      data: { user },
      error,
    } = await sessionClient.auth.getUser()
    if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

    const { data: profile } = await sessionClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      throw new AuthError({ userMessage: 'Super admin access required.', requestId })
    }

    const orgId = ctx.params?.id
    const userId = ctx.params?.userId
    if (!orgId || !userId) throw new ValidationError({ userMessage: 'Missing params.', requestId })

    if (userId === user.id) {
      throw new ValidationError({ userMessage: 'You cannot remove your own account.', requestId })
    }

    const admin = createAdminClient()

    const { data: target } = await admin
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .eq('org_id', orgId)
      .single()

    if (!target) throw new NotFoundError({ userMessage: 'User not found in this org.', requestId })

    await admin.from('activity_log').insert({
      org_id: orgId,
      actor_id: user.id,
      action: 'user_deleted_by_super_admin',
      target_type: 'profile',
      target_id: userId,
      details: { email: target.email },
    })

    await admin.auth.admin.deleteUser(userId)

    return success({ deleted: true })
  },
)
