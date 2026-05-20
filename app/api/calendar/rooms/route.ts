import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/errors/AppError'

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const { data: profile } = await sessionClient
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const admin = createAdminClient()

  const { data: rooms } = await admin
    .from('locations')
    .select(
      'id, name, type, capacity, photo_url, description, min_notice_hours, cancel_notice_hours, max_advance_days, max_booking_duration_mins, nano_buffer_mins, approval_required, waitlist_enabled',
    )
    .eq('org_id', profile.org_id)
    .eq('is_active', true)
    .eq('in_maintenance', false)
    .order('name', { ascending: true })

  return success({ rooms: rooms ?? [] })
})
