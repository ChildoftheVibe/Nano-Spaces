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
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join(
    '\n',
  )
}

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
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'org_admin' || !profile.org_id) {
    throw new AuthError({ userMessage: 'Org admin access required.', requestId })
  }

  const orgId = profile.org_id as string

  const rl = await checkRateLimit('export', `org:${orgId}`)
  if (!rl.success) {
    throw new RateLimitError({
      userMessage: 'Org export is limited to once per 24 hours. Please try again later.',
      requestId,
    })
  }

  const admin = createAdminClient()

  const [{ data: reservations }, { data: users }, { data: rooms }, { data: blackouts }] =
    await Promise.all([
      admin
        .from('reservations')
        .select(
          'id, title, start_time, end_time, status, booked_by, location_id, checked_in, checked_in_at, cancellation_reason, notes, created_at',
        )
        .eq('org_id', orgId)
        .order('start_time', { ascending: false })
        .limit(10000),
      admin
        .from('profiles')
        .select('id, full_name, email, role, is_active, hibernate_status, timezone, created_at')
        .eq('org_id', orgId)
        .order('full_name'),
      admin
        .from('locations')
        .select(
          'id, name, capacity, is_active, nano_buffer_mins, ghost_buster_enabled, approval_required, created_at',
        )
        .eq('org_id', orgId)
        .order('name'),
      admin
        .from('blackout_dates')
        .select('id, title, start_time, end_time, is_recurring, created_at')
        .eq('org_id', orgId)
        .order('start_time', { ascending: false }),
    ])

  // Build user map for name enrichment
  const userMap: Record<string, string> = {}
  for (const u of users ?? []) userMap[u.id] = (u.full_name as string | null) ?? 'Unknown'

  const roomMap: Record<string, string> = {}
  for (const r of rooms ?? []) roomMap[r.id] = (r.name as string | null) ?? 'Unknown'

  const reservationsCsv = toCsv(
    (reservations ?? []).map((r) => ({
      id: r.id,
      title: r.title ?? '',
      room: r.location_id ? (roomMap[r.location_id as string] ?? r.location_id) : '',
      booked_by: r.booked_by ? (userMap[r.booked_by as string] ?? r.booked_by) : '',
      start_time: r.start_time,
      end_time: r.end_time,
      status: r.status,
      checked_in: r.checked_in ?? false,
      checked_in_at: r.checked_in_at ?? '',
      cancellation_reason: r.cancellation_reason ?? '',
      notes: r.notes ?? '',
      created_at: r.created_at,
    })),
  )

  const usersCsv = toCsv(
    (users ?? []).map((u) => ({
      id: u.id,
      full_name: u.full_name ?? '',
      email: u.email ?? '',
      role: u.role,
      is_active: u.is_active,
      hibernate_status: u.hibernate_status,
      timezone: u.timezone ?? '',
      created_at: u.created_at,
    })),
  )

  const roomsCsv = toCsv(
    (rooms ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      capacity: r.capacity ?? '',
      is_active: r.is_active,
      buffer_mins: r.nano_buffer_mins ?? 0,
      ghost_buster_enabled: r.ghost_buster_enabled ?? false,
      approval_required: r.approval_required ?? false,
      created_at: r.created_at,
    })),
  )

  const blackoutsCsv = toCsv(
    (blackouts ?? []).map((b) => ({
      id: b.id,
      title: b.title ?? '',
      start_time: b.start_time,
      end_time: b.end_time,
      is_recurring: b.is_recurring ?? false,
      created_at: b.created_at,
    })),
  )

  const exportedAt = new Date().toISOString()

  const zip = createZipBuffer([
    { name: 'reservations.csv', data: Buffer.from(reservationsCsv, 'utf-8') },
    { name: 'users.csv', data: Buffer.from(usersCsv, 'utf-8') },
    { name: 'rooms.csv', data: Buffer.from(roomsCsv, 'utf-8') },
    { name: 'blackouts.csv', data: Buffer.from(blackoutsCsv, 'utf-8') },
    {
      name: 'README.txt',
      data: Buffer.from(
        `Nano Spaces Org Export\nExported: ${exportedAt}\nOrg ID: ${orgId}\n\nFiles:\n- reservations.csv: All reservations\n- users.csv: All org members\n- rooms.csv: All rooms/locations\n- blackouts.csv: All blackout dates\n`,
        'utf-8',
      ),
    },
  ])

  const filename = `nanospaces-org-export-${exportedAt.slice(0, 10)}.zip`

  return new Response(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(zip.length),
    },
  })
})
