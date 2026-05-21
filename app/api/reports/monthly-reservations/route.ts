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
  const month = url.searchParams.get('month') ?? ''
  const orgIdParam = url.searchParams.get('org_id') ?? ''

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new ValidationError({ userMessage: 'month param required (YYYY-MM).', requestId })
  }

  const isSuperAdmin = profile.role === 'super_admin'
  const orgId = isSuperAdmin ? orgIdParam || null : (profile.org_id as string)

  if (!isSuperAdmin && !orgId) {
    throw new AuthError({ userMessage: 'No org found.', requestId })
  }

  const rangeStart = `${month}-01T00:00:00.000Z`
  const [year, mon] = month.split('-').map(Number) as [number, number]
  const nextMonth = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, '0')}`
  const rangeEnd = `${nextMonth}-01T00:00:00.000Z`

  const admin = createAdminClient()

  let query = admin
    .from('reservations')
    .select(
      'id, title, start_time, end_time, status, checked_in, god_mode_override, god_mode_reason, cancellation_reason, cancelled_by, booked_by, location_id, created_at',
    )
    .gte('start_time', rangeStart)
    .lt('start_time', rangeEnd)
    .order('start_time', { ascending: true })

  if (orgId) {
    query = query.eq('org_id', orgId)
  }

  const { data: reservations } = await query

  if (!reservations || reservations.length === 0) {
    return success({ reservations: [], users: [], rooms: [] })
  }

  const userIds = [
    ...new Set([
      ...(reservations.map((r) => r.booked_by).filter(Boolean) as string[]),
      ...(reservations.map((r) => r.cancelled_by).filter(Boolean) as string[]),
    ]),
  ]
  const roomIds = [...new Set(reservations.map((r) => r.location_id).filter(Boolean))] as string[]

  const [{ data: profiles }, { data: rooms }] = await Promise.all([
    userIds.length
      ? admin.from('profiles').select('id, full_name').in('id', userIds)
      : Promise.resolve({ data: [] }),
    roomIds.length
      ? admin.from('locations').select('id, name').in('id', roomIds)
      : Promise.resolve({ data: [] }),
  ])

  const userMap: Record<string, string> = {}
  for (const p of profiles ?? []) userMap[p.id] = (p.full_name as string | null) ?? 'Unknown'

  const roomMap: Record<string, string> = {}
  for (const r of rooms ?? []) roomMap[r.id] = (r.name as string | null) ?? 'Unknown'

  const enriched = reservations.map((r) => ({
    id: r.id,
    title: r.title ?? '',
    start_time: r.start_time,
    end_time: r.end_time,
    status: r.status,
    checked_in: r.checked_in ?? false,
    god_mode: r.god_mode_override ?? false,
    god_mode_reason: r.god_mode_reason ?? '',
    cancellation_reason: r.cancellation_reason ?? '',
    booked_by_name: r.booked_by ? (userMap[r.booked_by as string] ?? 'Unknown') : 'Unknown',
    cancelled_by_name: r.cancelled_by ? (userMap[r.cancelled_by as string] ?? '') : '',
    room_name: r.location_id ? (roomMap[r.location_id as string] ?? 'Unknown') : 'Unknown',
  }))

  return success({ reservations: enriched })
})
