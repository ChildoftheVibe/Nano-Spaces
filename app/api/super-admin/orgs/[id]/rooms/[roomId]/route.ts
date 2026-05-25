import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'

export const DELETE = withErrorHandling(
  async (_req: NextRequest, ctx: { params?: { id?: string; roomId?: string } }) => {
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
    const roomId = ctx.params?.roomId
    if (!orgId || !roomId) throw new ValidationError({ userMessage: 'Missing params.', requestId })

    const admin = createAdminClient()

    const { data: room } = await admin
      .from('locations')
      .select('id, name')
      .eq('id', roomId)
      .eq('org_id', orgId)
      .single()

    if (!room) throw new NotFoundError({ userMessage: 'Room not found in this org.', requestId })

    await admin.from('activity_log').insert({
      org_id: orgId,
      actor_id: user.id,
      action: 'room_deleted_by_super_admin',
      target_type: 'location',
      target_id: roomId,
      details: { name: room.name },
    })

    await admin.from('locations').delete().eq('id', roomId)

    return success({ deleted: true })
  },
)
