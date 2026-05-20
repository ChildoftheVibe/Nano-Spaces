import type { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { ghostBusterReleaseTemplate } from '@/lib/email/auth-templates'
import { toZonedTime, format } from 'date-fns-tz'

// Releases confirmed reservations where no check-in happened within ghost_buster_mins.
export const GET = async (req: NextRequest): Promise<Response> => {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()

  // Fetch all ghost-buster-enabled locations with their timeout windows
  const { data: locations } = await admin
    .from('locations')
    .select('id, ghost_buster_mins, org_id')
    .eq('ghost_buster_enabled', true)
    .eq('is_active', true)

  if (!locations?.length) return Response.json({ ok: true, released: 0 })

  const locationMap = new Map<string, { ghostMins: number; orgId: string }>()
  for (const loc of locations) {
    locationMap.set(loc.id as string, {
      ghostMins: (loc.ghost_buster_mins as number) ?? 15,
      orgId: loc.org_id as string,
    })
  }

  // Smallest ghost window — anything that started before this cutoff may be eligible
  const minMins = Math.min(...locations.map((l) => (l.ghost_buster_mins as number) ?? 15))
  const earliestCutoff = new Date(now.getTime() - minMins * 60 * 1000).toISOString()

  const { data: candidates } = await admin
    .from('reservations')
    .select('id, booked_by, org_id, title, start_time, end_time, location_id')
    .eq('status', 'confirmed')
    .eq('checked_in', false)
    .in(
      'location_id',
      locations.map((l) => l.id as string),
    )
    .lte('start_time', earliestCutoff)

  let released = 0

  for (const res of candidates ?? []) {
    const locationMeta = locationMap.get(res.location_id as string)
    if (!locationMeta) continue

    const cutoff = new Date(
      new Date(res.start_time as string).getTime() + locationMeta.ghostMins * 60 * 1000,
    )
    if (now < cutoff) continue

    const { error: rpcError } = await admin.rpc('release_ghost_reservation', {
      p_reservation_id: res.id,
    })
    if (rpcError) continue

    released++

    // Email the booker
    if (res.booked_by) {
      try {
        const [{ data: org }, { data: authUser }] = await Promise.all([
          admin
            .from('organizations')
            .select('primary_timezone')
            .eq('id', res.org_id as string)
            .single(),
          admin.auth.admin.getUserById(res.booked_by as string),
        ])
        const tz = (org?.primary_timezone as string | null) ?? 'UTC'
        const startFormatted = format(
          toZonedTime(new Date(res.start_time as string), tz),
          "EEE, MMM d yyyy 'at' h:mm a zzz",
          { timeZone: tz },
        )
        const { data: room } = await admin
          .from('locations')
          .select('name')
          .eq('id', res.location_id as string)
          .single()
        const { data: profile } = await admin
          .from('profiles')
          .select('full_name')
          .eq('id', res.booked_by as string)
          .single()
        const bookerEmail = authUser.user?.email
        if (bookerEmail) {
          await sendEmail({
            to: bookerEmail,
            subject: 'Your booking was released — Nano Spaces',
            html: ghostBusterReleaseTemplate(
              (profile?.full_name as string | null) ?? 'there',
              res.title as string,
              (room?.name as string | null) ?? 'Room',
              startFormatted,
            ),
          })
        }
      } catch {
        // email failure doesn't fail the release
      }
    }

    // Offer slot to next waitlisted user
    await admin.rpc('process_waitlist_slot', {
      p_location_id: res.location_id as string,
      p_start_time: res.start_time as string,
      p_end_time: res.end_time as string,
    })
  }

  return Response.json({ ok: true, released })
}
