import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'

export const DELETE = withErrorHandling(
  async (_req: NextRequest, ctx: { params?: { id?: string } }) => {
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
    if (!orgId) throw new ValidationError({ userMessage: 'Missing org id.', requestId })

    const admin = createAdminClient()

    const { data: org } = await admin.from('organizations').select('id').eq('id', orgId).single()
    if (!org) throw new NotFoundError({ userMessage: 'Organization not found.', requestId })

    const { count } = await admin
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)

    await admin.from('reservations').delete().eq('org_id', orgId)

    await admin.from('activity_log').insert({
      org_id: orgId,
      actor_id: user.id,
      action: 'calendar_cleared_by_super_admin',
      target_type: 'organization',
      target_id: orgId,
      details: { reservations_deleted: count ?? 0 },
    })

    return success({ deleted: count ?? 0 })
  },
)
