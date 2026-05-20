import type { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { waitlistAvailableTemplate } from '@/lib/email/auth-templates'
import { toZonedTime, format } from 'date-fns-tz'
import { env } from '@/lib/env'
import { sendPushToUser } from '@/lib/push/send'

// Expires stale waitlist holds and promotes next waiter. Also emails waitlist users on available holds.
export const GET = async (req: NextRequest): Promise<Response> => {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Expire stale holds and promote next waiter
  const { data: processed, error } = await admin.rpc('advance_expired_waitlist')
  if (error) return Response.json({ error: 'advance_expired_waitlist failed' }, { status: 500 })

  // Email users whose waitlist_expires_at was just set (active holds without email yet)
  // Heuristic: waitlist_expires_at is in the future (hold just activated) and set within last 20 minutes
  const now = new Date()
  const recentHoldCutoff = new Date(now.getTime() - 20 * 60 * 1000).toISOString()

  const { data: activeHolds } = await admin
    .from('reservations')
    .select('id, booked_by, org_id, title, start_time, location_id, waitlist_expires_at')
    .eq('status', 'waitlisted')
    .gt('waitlist_expires_at', now.toISOString())
    .gte('waitlist_expires_at', recentHoldCutoff)

  let emailed = 0

  for (const hold of activeHolds ?? []) {
    if (!hold.booked_by) continue
    try {
      const [{ data: org }, { data: room }, { data: profile }, { data: authUser }] =
        await Promise.all([
          admin
            .from('organizations')
            .select('primary_timezone')
            .eq('id', hold.org_id as string)
            .single(),
          admin
            .from('locations')
            .select('name')
            .eq('id', hold.location_id as string)
            .single(),
          admin
            .from('profiles')
            .select('full_name')
            .eq('id', hold.booked_by as string)
            .single(),
          admin.auth.admin.getUserById(hold.booked_by as string),
        ])
      const tz = (org?.primary_timezone as string | null) ?? 'UTC'
      const startFormatted = format(
        toZonedTime(new Date(hold.start_time as string), tz),
        "EEE, MMM d yyyy 'at' h:mm a zzz",
        { timeZone: tz },
      )
      const bookNowUrl = `${env.NEXT_PUBLIC_APP_URL}/calendar?activate_waitlist=${hold.id as string}`
      const userEmail = authUser.user?.email
      if (userEmail) {
        await sendEmail({
          to: userEmail,
          subject: 'Your waitlist spot is available — Nano Spaces',
          html: waitlistAvailableTemplate(
            (profile?.full_name as string | null) ?? 'there',
            hold.title as string,
            (room?.name as string | null) ?? 'Room',
            startFormatted,
            bookNowUrl,
          ),
        })
        void sendPushToUser(hold.booked_by as string, {
          title: 'Waitlist spot available!',
          body: `Your slot for "${hold.title as string}" is ready. Confirm now before it expires.`,
          url: bookNowUrl,
        })
        emailed++
      }
    } catch {
      // continue on per-hold errors
    }
  }

  return Response.json({ ok: true, processed: processed as number, emailed })
}
