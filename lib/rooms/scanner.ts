import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { reservationFlaggedTemplate } from '@/lib/email/auth-templates'

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const HolidaysLib = require('date-holidays') as new (country: string) => {
  isHoliday: (date: Date) => false | Array<{ name: string }>
}
const usHolidays = new HolidaysLib('US')

type RuleData = {
  day_of_week: number[]
  open_time: string
  close_time: string
  block_holidays: boolean
}

function utcTimeStr(date: Date): string {
  return date.toISOString().substring(11, 19)
}

function isReservationValidUnderRules(start: Date, end: Date, rules: RuleData[]): boolean {
  const dow = start.getUTCDay()
  const startT = utcTimeStr(start)
  const endT = utcTimeStr(end)

  return rules.some(
    (rule) =>
      rule.day_of_week.includes(dow) &&
      startT >= rule.open_time &&
      endT <= rule.close_time &&
      !(rule.block_holidays && usHolidays.isHoliday(start) !== false),
  )
}

async function notifyFlaggedReservation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  reservationId: string,
  userId: string,
  orgId: string,
  locationName: string,
  bookingTitle: string,
  startTime: string,
  endTime: string,
  reason: string,
): Promise<void> {
  const { data: profile } = await admin.from('profiles').select('email').eq('id', userId).single()

  await admin.from('notifications').insert({
    user_id: userId,
    org_id: orgId,
    type: 'reservation_flagged',
    title: 'Booking requires attention',
    body: `Your booking "${bookingTitle}" at ${locationName} has been flagged: ${reason}`,
    action_url: `/reservations/${reservationId}`,
  })

  if (profile?.email) {
    await sendEmail({
      to: profile.email as string,
      subject: `Booking flagged: ${bookingTitle}`,
      html: reservationFlaggedTemplate(locationName, reason, bookingTitle, startTime, endTime),
    }).catch(() => null)
  }
}

export async function flagReservationsInWindow(
  locationId: string,
  orgId: string,
  windowStart: Date,
  windowEnd: Date,
  reason: string,
  locationName: string,
): Promise<number> {
  const admin = createAdminClient()

  const { data: reservations } = await admin
    .from('reservations')
    .select('id, booked_by, title, start_time, end_time')
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .in('status', ['pending', 'confirmed'])
    .gte('start_time', windowStart.toISOString())
    .lte('start_time', windowEnd.toISOString())

  let flagged = 0
  for (const res of reservations ?? []) {
    await admin.from('reservations').update({ status: 'flagged' }).eq('id', res.id)

    if (res.booked_by) {
      await notifyFlaggedReservation(
        admin,
        res.id as string,
        res.booked_by as string,
        orgId,
        locationName,
        res.title as string,
        res.start_time as string,
        res.end_time as string,
        reason,
      )
    }
    flagged++
  }
  return flagged
}

export async function flagReservationsOutsideAvailability(
  locationId: string,
  orgId: string,
  newRules: RuleData[],
  locationName: string,
): Promise<number> {
  const admin = createAdminClient()

  const now = new Date().toISOString()
  const { data: reservations } = await admin
    .from('reservations')
    .select('id, booked_by, title, start_time, end_time')
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .in('status', ['pending', 'confirmed'])
    .gte('start_time', now)

  let flagged = 0

  if (!newRules.length) {
    // No availability rules → all future reservations are now invalid
    for (const res of reservations ?? []) {
      await admin.from('reservations').update({ status: 'flagged' }).eq('id', res.id)
      if (res.booked_by) {
        await notifyFlaggedReservation(
          admin,
          res.id as string,
          res.booked_by as string,
          orgId,
          locationName,
          res.title as string,
          res.start_time as string,
          res.end_time as string,
          'Availability rules were removed for this room.',
        )
      }
      flagged++
    }
    return flagged
  }

  for (const res of reservations ?? []) {
    const start = new Date(res.start_time as string)
    const end = new Date(res.end_time as string)

    if (!isReservationValidUnderRules(start, end, newRules)) {
      await admin.from('reservations').update({ status: 'flagged' }).eq('id', res.id)
      if (res.booked_by) {
        await notifyFlaggedReservation(
          admin,
          res.id as string,
          res.booked_by as string,
          orgId,
          locationName,
          res.title as string,
          res.start_time as string,
          res.end_time as string,
          'The availability hours for this room have changed.',
        )
      }
      flagged++
    }
  }
  return flagged
}
