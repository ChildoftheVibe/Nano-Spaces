import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/errors/AppError'

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

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  let query = admin
    .from('reservations')
    .select('start_time, end_time')
    .in('status', ['confirmed', 'cancelled'])
    .gte('start_time', ninetyDaysAgo)
    .lte('start_time', now)
    .limit(5000)

  if (orgId) query = query.eq('org_id', orgId)

  const { data: reservations } = await query

  // Build hour × day grid (0-23 hours, 0-6 days Mon-Sun)
  // grid[hour][day] = count
  const grid: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0) as number[])

  for (const r of reservations ?? []) {
    const start = new Date(r.start_time as string)
    const end = new Date(r.end_time as string)
    const dayOfWeek = (start.getUTCDay() + 6) % 7 // 0=Mon, 6=Sun

    // Count each hour slot the reservation spans
    const startHour = start.getUTCHours()
    const endHour = end.getUTCHours() + (end.getUTCMinutes() > 0 ? 1 : 0)
    for (let h = startHour; h < Math.min(endHour, 24); h++) {
      ;(grid[h] as number[])[dayOfWeek] = ((grid[h] as number[])[dayOfWeek] ?? 0) + 1
    }
  }

  const maxVal = Math.max(...grid.flat(), 1)

  return success({ grid, maxVal, totalReservations: (reservations ?? []).length })
})
