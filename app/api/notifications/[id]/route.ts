import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError } from '@/lib/errors/AppError'

export const PATCH = withErrorHandling(
  async (_req: NextRequest, ctx: { params?: { id?: string } }) => {
    const requestId = crypto.randomUUID()
    const params = ctx.params ?? {}

    const sessionClient = await createSessionClient()
    const {
      data: { user },
      error,
    } = await sessionClient.auth.getUser()
    if (error || !user) {
      throw new AuthError({ userMessage: 'Not authenticated.', requestId })
    }

    const admin = createAdminClient()
    if (!params.id) {
      throw new NotFoundError({ userMessage: 'Notification not found.', requestId })
    }

    const { data } = await admin
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (!data) {
      throw new NotFoundError({ userMessage: 'Notification not found.', requestId })
    }

    return success({ id: data.id })
  },
)
