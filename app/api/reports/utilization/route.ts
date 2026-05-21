import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/errors/AppError'

interface AvailabilityRule {
  location_id: string
  day_of_week: number[]
  open_time: string
  close_time: string
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number) as [number, number]
  return h * 60 + m
}

function availableMinutesForDay(rules: AvailabilityRule[], dayOfWeek: number): number {
  const applicable = rules.filter((r) => (r.day_of_week as number[]).includes(dayOfWeek))
  return applicable.reduce((sum, r) => {
    const open = parseTime(r.open_time)
    const close = parseTime(r.close_time)
    return sum + Math.max(0, close - open)
  }, 0)
}

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
  const orgIdParam = url.searchParams.get('org_id') ?? ''

  const isSuperAdmin = profile.role === 'super_admin'
  const orgId = isSuperAdmin ? orgIdParam || null : (profile.org_id as string)

  const admin = createAdminClient()

  const now = new Date()
  const rangeStart = now.toISOString()
  const rangeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  let roomsQuery = admin
    .from('locations')
    .select('id, name')
    .eq('is_active', true)
    .eq('in_maintenance', false)

  if (orgId) roomsQuery = roomsQuery.eq('org_id', orgId)

  const { data: rooms } = await roomsQuery

  if (!rooms || rooms.length === 0) {
    return success({ rooms: [] })
  }

  const roomIds = rooms.map((r) => r.id)

  const { data: rules } = await admin
    .from('availability_rules')
    .select('location_id, day_of_week, open_time, close_time')
    .in('location_id', roomIds)

  const { data: reservations } = await admin
    .from('reservations')
    .select('location_id, start_time, end_time')
    .in('location_id', roomIds)
    .in('status', ['confirmed', 'pending'])
    .gte('start_time', rangeStart)
    .lt('start_time', rangeEnd)

  const result = rooms.map((room) => {
    const roomRules = (rules ?? []).filter((r) => r.location_id === room.id) as AvailabilityRule[]

    // Calculate total available minutes over next 30 days
    let totalAvailableMinutes = 0
    const cursor = new Date(now)
    cursor.setHours(0, 0, 0, 0)
    for (let d = 0; d < 30; d++) {
      const dow = cursor.getDay() // 0=Sun
      totalAvailableMinutes += availableMinutesForDay(roomRules, dow)
      cursor.setDate(cursor.getDate() + 1)
    }

    // Calculate booked minutes
    const roomReservations = (reservations ?? []).filter((r) => r.location_id === room.id)
    const bookedMinutes = roomReservations.reduce((sum, r) => {
      const start = new Date(r.start_time as string).getTime()
      const end = new Date(r.end_time as string).getTime()
      return sum + Math.max(0, (end - start) / 60000)
    }, 0)

    const utilizationPct =
      totalAvailableMinutes > 0 ? Math.round((bookedMinutes / totalAvailableMinutes) * 100) : 0

    return {
      room_id: room.id,
      room_name: room.name,
      booked_hours: Math.round(bookedMinutes / 60),
      available_hours: Math.round(totalAvailableMinutes / 60),
      utilization_pct: utilizationPct,
    }
  })

  return success({ rooms: result })
})
