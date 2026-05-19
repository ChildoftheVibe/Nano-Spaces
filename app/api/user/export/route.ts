import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { createZipBuffer } from '@/lib/zip'
import { AuthError, RateLimitError } from '@/lib/errors/AppError'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0]!)
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))]
  return lines.join('\n')
}

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) {
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })
  }

  // 1 export per user per 24 hours
  const rl = await checkRateLimit('export', user.id)
  if (!rl.success) {
    throw new RateLimitError({
      userMessage: 'You can only export your data once per 24 hours. Please try again later.',
      requestId,
    })
  }

  const admin = createAdminClient()

  const [{ data: profile }, { data: reservations }, { data: activityLog }] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'id, full_name, email, timezone, role, is_active, hibernate_status, email_reminders, reminder_timing, created_at, tos_accepted_at, tos_version_accepted',
      )
      .eq('id', user.id)
      .single(),
    admin
      .from('reservations')
      .select(
        'id, title, start_time, end_time, status, checked_in, checked_in_at, notes, created_at, location_id',
      )
      .eq('booked_by', user.id)
      .order('start_time', { ascending: false }),
    admin
      .from('activity_log')
      .select('id, action, target_type, target_id, details, created_at')
      .eq('actor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  const exportedAt = new Date().toISOString()

  const jsonPayload = JSON.stringify(
    {
      exported_at: exportedAt,
      profile,
      reservations: reservations ?? [],
      activity_log: activityLog ?? [],
    },
    null,
    2,
  )

  const csvPayload = toCsv(
    (reservations ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      start_time: r.start_time,
      end_time: r.end_time,
      status: r.status,
      checked_in: r.checked_in,
      checked_in_at: r.checked_in_at ?? '',
      notes: r.notes ?? '',
      location_id: r.location_id ?? '',
      created_at: r.created_at,
    })),
  )

  const zip = createZipBuffer([
    { name: 'data.json', data: Buffer.from(jsonPayload, 'utf-8') },
    { name: 'reservations.csv', data: Buffer.from(csvPayload, 'utf-8') },
  ])

  const filename = `nanospaces-export-${exportedAt.slice(0, 10)}.zip`

  return new Response(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(zip.length),
    },
  })
})
