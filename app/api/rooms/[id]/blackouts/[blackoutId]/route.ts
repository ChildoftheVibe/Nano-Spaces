import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'

export const DELETE = withErrorHandling(
  async (_req: NextRequest, ctx: { params?: { id?: string; blackoutId?: string } }) => {
    const requestId = crypto.randomUUID()

    const sessionClient = await createSessionClient()
    const {
      data: { user },
      error,
    } = await sessionClient.auth.getUser()
    if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

    const { data: profile } = await sessionClient
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'org_admin' || !profile.org_id) {
      throw new AuthError({ userMessage: 'Org admin access required.', requestId })
    }

    const roomId = ctx.params?.id
    const blackoutId = ctx.params?.blackoutId
    if (!roomId || !blackoutId) {
      throw new ValidationError({ userMessage: 'Missing id.', requestId })
    }

    const admin = createAdminClient()

    // Verify room belongs to org
    const { data: room } = await admin
      .from('locations')
      .select('id, org_id')
      .eq('id', roomId)
      .single()

    if (!room || room.org_id !== profile.org_id) {
      throw new NotFoundError({ userMessage: 'Room not found.', requestId })
    }

    const { error: deleteError } = await admin
      .from('blackout_dates')
      .delete()
      .eq('id', blackoutId)
      .eq('location_id', roomId)

    if (deleteError) throw new Error('Failed to delete blackout.')

    return success({ deleted: true })
  },
)
