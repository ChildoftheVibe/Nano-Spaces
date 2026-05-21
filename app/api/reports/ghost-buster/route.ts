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

  const rangeStart = `${month}-01T00:00:00.000Z`
  const [year, mon] = month.split('-').map(Number) as [number, number]
  const nextMonth = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, '0')}`
  const rangeEnd = `${nextMonth}-01T00:00:00.000Z`

  const admin = createAdminClient()

  let query = admin
    .from('activity_log')
    .select('id, org_id, details, created_at')
    .eq('action', 'reservation.ghost_released')
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (orgId) query = query.eq('org_id', orgId)

  const { data: entries } = await query

  // Group by room
  const roomCounts: Record<string, { room_name: string; count: number; entries: unknown[] }> = {}

  for (const entry of entries ?? []) {
    const details = (entry.details ?? {}) as Record<string, unknown>
    const roomId = (details['location_id'] as string | null) ?? 'unknown'
    const roomName = (details['room_name'] as string | null) ?? 'Unknown Room'

    if (!roomCounts[roomId]) {
      roomCounts[roomId] = { room_name: roomName, count: 0, entries: [] }
    }
    roomCounts[roomId]!.count += 1
    roomCounts[roomId]!.entries.push({
      id: entry.id,
      created_at: entry.created_at,
      booking_title: (details['title'] as string | null) ?? 'Unknown',
      booker_name: (details['booked_by_name'] as string | null) ?? 'Unknown',
      start_time: (details['start_time'] as string | null) ?? '',
    })
  }

  const rooms = Object.entries(roomCounts)
    .map(([room_id, data]) => ({ room_id, ...data }))
    .sort((a, b) => b.count - a.count)

  return success({ rooms, totalNoShows: (entries ?? []).length })
})
