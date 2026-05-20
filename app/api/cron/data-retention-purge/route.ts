import type { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { createAdminClient } from '@/lib/supabase/server'

// Purges cancelled reservations >2 years old and activity_log >1 year old.
export const GET = async (req: NextRequest): Promise<Response> => {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString()
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: reservationsDeleted }, { data: logsDeleted }] = await Promise.all([
    // Use created_at as fallback when cancelled_at is null (some old rows may lack it)
    admin
      .from('reservations')
      .delete()
      .eq('status', 'cancelled')
      .or(`cancelled_at.lt.${twoYearsAgo},and(cancelled_at.is.null,created_at.lt.${twoYearsAgo})`)
      .select('id'),
    admin.from('activity_log').delete().lt('created_at', oneYearAgo).select('id'),
  ])

  return Response.json({
    ok: true,
    reservationsDeleted: reservationsDeleted?.length ?? 0,
    logsDeleted: logsDeleted?.length ?? 0,
  })
}
