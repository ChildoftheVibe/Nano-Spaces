import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

export const GET = withErrorHandling(async (req: NextRequest) => {
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

  if (!profile || !['org_admin', 'super_admin'].includes(profile.role as string)) {
    throw new AuthError({ userMessage: 'Admin access required.', requestId })
  }

  const url = new URL(req.url)
  const targetUserId = url.searchParams.get('user_id') ?? ''
  const orgIdParam = url.searchParams.get('org_id') ?? ''

  if (!targetUserId) {
    throw new ValidationError({ userMessage: 'user_id param required.', requestId })
  }

  const isSuperAdmin = profile.role === 'super_admin'
  const orgId = isSuperAdmin ? orgIdParam || null : (profile.org_id as string)

  const admin = createAdminClient()

  // Verify target user belongs to same org (unless super admin)
  if (!isSuperAdmin) {
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('org_id, full_name')
      .eq('id', targetUserId)
      .single()

    if (!targetProfile || targetProfile.org_id !== orgId) {
      throw new AuthError({ userMessage: 'User not found in your org.', requestId })
    }
  }

  let query = admin
    .from('reservations')
    .select(
      'id, title, start_time, end_time, status, checked_in, checked_in_at, notes, cancellation_reason, cancelled_by, location_id, created_at, god_mode_override',
    )
    .eq('booked_by', targetUserId)
    .order('start_time', { ascending: false })
    .limit(500)

  if (!isSuperAdmin && orgId) {
    query = query.eq('org_id', orgId)
  }

  const { data: reservations } = await query

  const roomIds = [
    ...new Set((reservations ?? []).map((r) => r.location_id).filter(Boolean)),
  ] as string[]
  const cancellerIds = [
    ...new Set((reservations ?? []).map((r) => r.cancelled_by).filter(Boolean)),
  ] as string[]

  const [{ data: rooms }, { data: cancellers }] = await Promise.all([
    roomIds.length
      ? admin.from('locations').select('id, name').in('id', roomIds)
      : Promise.resolve({ data: [] }),
    cancellerIds.length
      ? admin.from('profiles').select('id, full_name').in('id', cancellerIds)
      : Promise.resolve({ data: [] }),
  ])

  const roomMap: Record<string, string> = {}
  for (const r of rooms ?? []) roomMap[r.id] = (r.name as string | null) ?? 'Unknown'

  const cancellerMap: Record<string, string> = {}
  for (const p of cancellers ?? []) cancellerMap[p.id] = (p.full_name as string | null) ?? 'Unknown'

  const enriched = (reservations ?? []).map((r) => ({
    id: r.id,
    title: r.title ?? '',
    room_name: r.location_id ? (roomMap[r.location_id as string] ?? 'Unknown') : 'Unknown',
    start_time: r.start_time,
    end_time: r.end_time,
    status: r.status,
    checked_in: r.checked_in ?? false,
    checked_in_at: r.checked_in_at ?? '',
    notes: r.notes ?? '',
    cancellation_reason: r.cancellation_reason ?? '',
    cancelled_by_name: r.cancelled_by ? (cancellerMap[r.cancelled_by as string] ?? '') : '',
    god_mode: r.god_mode_override ?? false,
    created_at: r.created_at,
  }))

  // Also return org users list for selector
  const usersQuery = orgId
    ? admin
        .from('profiles')
        .select('id, full_name')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('full_name')
    : admin.from('profiles').select('id, full_name').eq('is_active', true).order('full_name')

  const { data: orgUsers } = await usersQuery

  return success({ reservations: enriched, users: orgUsers ?? [] })
})
