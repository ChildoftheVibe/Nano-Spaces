import type { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { bookingReminderTemplate } from '@/lib/email/auth-templates'
import { toZonedTime, format } from 'date-fns-tz'
import { sendPushToUser } from '@/lib/push/send'

// Sends 1-hour booking reminders to users with email_reminders enabled.
export const GET = async (req: NextRequest): Promise<Response> => {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() + 50 * 60 * 1000).toISOString()
  const windowEnd = new Date(now.getTime() + 70 * 60 * 1000).toISOString()

  const { data: reservations } = await admin
    .from('reservations')
    .select('id, booked_by, org_id, title, start_time, end_time, location_id')
    .eq('status', 'confirmed')
    .eq('reminder_1h_sent', false)
    .gte('start_time', windowStart)
    .lte('start_time', windowEnd)

  let sent = 0

  for (const res of reservations ?? []) {
    if (!res.booked_by) continue

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email_reminders, reminder_timing')
      .eq('id', res.booked_by as string)
      .single()

    if (!profile?.email_reminders) continue
    const timing = profile.reminder_timing as string | null
    if (timing !== '1h' && timing !== 'both') continue

    try {
      const [{ data: org }, { data: room }, { data: authUser }] = await Promise.all([
        admin
          .from('organizations')
          .select('primary_timezone')
          .eq('id', res.org_id as string)
          .single(),
        admin
          .from('locations')
          .select('name')
          .eq('id', res.location_id as string)
          .single(),
        admin.auth.admin.getUserById(res.booked_by as string),
      ])
      const tz = (org?.primary_timezone as string | null) ?? 'UTC'
      const fmt = (iso: string) =>
        format(toZonedTime(new Date(iso), tz), "EEE, MMM d yyyy 'at' h:mm a zzz", { timeZone: tz })

      const userEmail = authUser.user?.email
      if (userEmail) {
        await sendEmail({
          to: userEmail,
          subject: `Reminder: "${res.title as string}" starts in 1 hour`,
          html: bookingReminderTemplate(
            (profile.full_name as string | null) ?? 'there',
            res.title as string,
            (room?.name as string | null) ?? 'Room',
            fmt(res.start_time as string),
            fmt(res.end_time as string),
            '1h',
          ),
        })

        await admin
          .from('reservations')
          .update({ reminder_1h_sent: true })
          .eq('id', res.id as string)

        void sendPushToUser(res.booked_by as string, {
          title: `Starting in 1 hour: "${res.title as string}"`,
          body: `Your booking at ${(room?.name as string | null) ?? 'the room'} starts at ${fmt(res.start_time as string)}`,
          url: '/calendar',
        })

        sent++
      }
    } catch {
      // continue on per-reservation errors
    }
  }

  return Response.json({ ok: true, sent })
}
