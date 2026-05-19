import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError, BookingConflictError } from '@/lib/errors/AppError'
import { sendEmail } from '@/lib/email/send'
import { bookingConfirmationTemplate } from '@/lib/email/auth-templates'
import { toZonedTime, format } from 'date-fns-tz'

const createSchema = z.object({
  location_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
})

function timeStr(date: Date, tz: string): string {
  return format(toZonedTime(date, tz), 'HH:mm:ss')
}

function formatForEmail(iso: string, tz: string): string {
  return format(toZonedTime(new Date(iso), tz), "EEE, MMM d yyyy 'at' h:mm a zzz", { timeZone: tz })
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

  if (!profile || !profile.org_id)
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  if (!start || !end)
    throw new ValidationError({ userMessage: 'start and end required.', requestId })

  const admin = createAdminClient()

  const [
    { data: reservations },
    { data: blackouts },
    { data: allRooms },
    { data: bookerProfiles },
  ] = await Promise.all([
    admin
      .from('reservations')
      .select('id, title, notes, location_id, booked_by, start_time, end_time, status')
      .eq('org_id', profile.org_id)
      .in('status', ['pending', 'confirmed', 'flagged'])
      .gte('end_time', start)
      .lte('start_time', end),
    admin
      .from('blackout_dates')
      .select('id, title, location_id, start_time, end_time')
      .eq('org_id', profile.org_id)
      .gte('end_time', start)
      .lte('start_time', end),
    admin
      .from('locations')
      .select(
        'id, name, is_active, in_maintenance, maintenance_from, maintenance_to, maintenance_note, nano_buffer_mins',
      )
      .eq('org_id', profile.org_id),
    admin.from('profiles').select('id, full_name').eq('org_id', profile.org_id),
  ])

  const nameMap: Record<string, string> = {}
  for (const p of bookerProfiles ?? []) {
    nameMap[p.id] = (p.full_name as string | null) ?? 'Unknown'
  }

  const roomMap: Record<string, { name: string; nano_buffer_mins: number }> = {}
  for (const r of allRooms ?? []) {
    roomMap[r.id] = {
      name: r.name as string,
      nano_buffer_mins: (r.nano_buffer_mins as number) ?? 5,
    }
  }

  const mapped = (reservations ?? []).map((r) => ({
    id: r.id,
    title: r.title as string,
    notes: r.notes as string | null,
    location_id: r.location_id as string,
    room_name: roomMap[r.location_id as string]?.name ?? 'Room',
    booked_by: r.booked_by as string | null,
    booker_name: r.booked_by ? (nameMap[r.booked_by as string] ?? 'Unknown') : 'Unknown',
    start_time: r.start_time as string,
    end_time: r.end_time as string,
    status: r.status as string,
    is_mine: r.booked_by === user.id,
    nano_buffer_mins: roomMap[r.location_id as string]?.nano_buffer_mins ?? 5,
  }))

  const maintenanceWindows = (allRooms ?? [])
    .filter((r) => r.is_active && r.in_maintenance && r.maintenance_from && r.maintenance_to)
    .map((r) => ({
      id: r.id as string,
      room_name: r.name as string,
      maintenance_from: r.maintenance_from as string,
      maintenance_to: r.maintenance_to as string,
      maintenance_note: r.maintenance_note as string | null,
    }))

  return success({ reservations: mapped, blackouts: blackouts ?? [], maintenanceWindows })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const { data: profile } = await sessionClient
    .from('profiles')
    .select('id, role, org_id, full_name, email:id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.org_id)
    throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input.',
      requestId,
    })
  }

  const { location_id, title, notes, start_time, end_time } = parsed.data
  const startDate = new Date(start_time)
  const endDate = new Date(end_time)
  const now = new Date()

  if (endDate <= startDate) {
    throw new ValidationError({ userMessage: 'End time must be after start time.', requestId })
  }

  const admin = createAdminClient()

  // Fetch room + org timezone
  const [{ data: room }, { data: org }] = await Promise.all([
    admin
      .from('locations')
      .select(
        'id, org_id, name, is_active, in_maintenance, maintenance_from, maintenance_to, min_notice_hours, cancel_notice_hours, max_advance_days, max_booking_duration_mins, max_bookings_per_user_per_day, approval_required, nano_buffer_mins',
      )
      .eq('id', location_id)
      .single(),
    admin.from('organizations').select('primary_timezone').eq('id', profile.org_id).single(),
  ])

  if (!room || room.org_id !== profile.org_id) {
    throw new ValidationError({ userMessage: 'Room not found.', requestId })
  }
  if (!room.is_active)
    throw new ValidationError({ userMessage: 'Room is not available.', requestId })
  if (room.in_maintenance) {
    throw new ValidationError({ userMessage: 'Room is under maintenance.', requestId })
  }

  const tz = (org?.primary_timezone as string | null) ?? 'UTC'
  const minNotice = (room.min_notice_hours as number) ?? 24
  const maxAdvance = (room.max_advance_days as number) ?? 60

  // Min notice
  const minStart = new Date(now.getTime() + minNotice * 60 * 60 * 1000)
  if (startDate < minStart) {
    throw new ValidationError({
      userMessage: `Bookings require at least ${minNotice} hour${minNotice !== 1 ? 's' : ''} advance notice.`,
      requestId,
    })
  }

  // Max advance
  const maxStart = new Date(now.getTime() + maxAdvance * 24 * 60 * 60 * 1000)
  if (startDate > maxStart) {
    throw new ValidationError({
      userMessage: `Bookings can be made at most ${maxAdvance} days in advance.`,
      requestId,
    })
  }

  // Max duration
  if (room.max_booking_duration_mins) {
    const durationMins = (endDate.getTime() - startDate.getTime()) / 60000
    if (durationMins > (room.max_booking_duration_mins as number)) {
      throw new ValidationError({
        userMessage: `Maximum booking duration is ${room.max_booking_duration_mins} minutes.`,
        requestId,
      })
    }
  }

  // Availability rules
  const { data: rules } = await admin
    .from('availability_rules')
    .select('day_of_week, open_time, close_time, block_holidays')
    .eq('location_id', location_id)

  if (rules && rules.length > 0) {
    const startZoned = toZonedTime(startDate, tz)
    const endZoned = toZonedTime(endDate, tz)
    const dow = startZoned.getDay()
    const startT = timeStr(startDate, tz)
    const endT = timeStr(endDate, tz)

    // Check that start and end are on the same day (in org tz)
    if (startZoned.toDateString() !== endZoned.toDateString()) {
      throw new ValidationError({
        userMessage: 'Booking must start and end on the same day.',
        requestId,
      })
    }

    const matchingRule = rules.find(
      (r) =>
        (r.day_of_week as number[]).includes(dow) &&
        startT >= (r.open_time as string) &&
        endT <= (r.close_time as string),
    )

    if (!matchingRule) {
      throw new ValidationError({
        userMessage: "This time is outside the room's available hours.",
        requestId,
      })
    }
  }

  // Blackout check
  const { data: conflictingBlackouts } = await admin
    .from('blackout_dates')
    .select('id, title')
    .eq('org_id', profile.org_id)
    .or(`location_id.eq.${location_id},location_id.is.null`)
    .lt('start_time', end_time)
    .gt('end_time', start_time)
    .limit(1)

  if (conflictingBlackouts && conflictingBlackouts.length > 0) {
    const bo = conflictingBlackouts[0]
    throw new ValidationError({
      userMessage: `This time falls within a blocked period: "${(bo?.title as string) ?? 'Blackout'}"`,
      requestId,
    })
  }

  // Nano-buffer check: is there a booking ending within buffer mins before our start?
  if (room.nano_buffer_mins && (room.nano_buffer_mins as number) > 0) {
    const bufferMs = (room.nano_buffer_mins as number) * 60 * 1000
    const bufferStart = new Date(startDate.getTime() - bufferMs)

    const { data: bufferConflicts } = await admin
      .from('reservations')
      .select('id')
      .eq('location_id', location_id)
      .in('status', ['pending', 'confirmed'])
      .gt('end_time', bufferStart.toISOString())
      .lte('end_time', start_time)
      .limit(1)

    if (bufferConflicts && bufferConflicts.length > 0) {
      throw new ValidationError({
        userMessage: `A ${room.nano_buffer_mins}-minute buffer is required between bookings.`,
        requestId,
      })
    }

    // Also check: does a booking start within buffer mins after our end?
    const bufferEnd = new Date(endDate.getTime() + bufferMs)
    const { data: bufferConflictsAfter } = await admin
      .from('reservations')
      .select('id')
      .eq('location_id', location_id)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', end_time)
      .lt('start_time', bufferEnd.toISOString())
      .limit(1)

    if (bufferConflictsAfter && bufferConflictsAfter.length > 0) {
      throw new ValidationError({
        userMessage: `A ${room.nano_buffer_mins}-minute buffer is required between bookings.`,
        requestId,
      })
    }
  }

  // Max bookings per user per day
  if (room.max_bookings_per_user_per_day) {
    const dayStart = toZonedTime(startDate, tz)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const { count: dayCount } = await admin
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', location_id)
      .eq('booked_by', user.id)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())

    if ((dayCount ?? 0) >= (room.max_bookings_per_user_per_day as number)) {
      throw new ValidationError({
        userMessage: `You have reached the maximum bookings per day for this room (${room.max_bookings_per_user_per_day}).`,
        requestId,
      })
    }
  }

  // Determine status
  const bookingStatus = (room.approval_required as boolean) ? 'pending' : 'confirmed'

  // Call RPC — atomic conflict check + insert
  const { data: reservationId, error: rpcError } = await admin.rpc(
    'create_reservation_with_locks',
    {
      p_location_id: location_id,
      p_booked_by: user.id,
      p_org_id: profile.org_id,
      p_title: title,
      p_notes: notes ?? '',
      p_start_time: start_time,
      p_end_time: end_time,
      p_status: bookingStatus,
    },
  )

  if (rpcError) {
    if (rpcError.message?.includes('BOOKING_CONFLICT')) {
      throw new BookingConflictError({
        userMessage: 'This time slot is no longer available. Please choose a different time.',
        requestId,
      })
    }
    throw new Error('Failed to create reservation.')
  }

  // Send confirmation email (best-effort)
  try {
    const { data: userProfile } = await admin
      .from('profiles')
      .select('full_name, email:id')
      .eq('id', user.id)
      .single()

    const { data: authUser } = await admin.auth.admin.getUserById(user.id)

    const userEmail = authUser.user?.email
    const userName = (userProfile?.full_name as string | null) ?? 'there'

    if (userEmail) {
      await sendEmail({
        to: userEmail,
        subject:
          bookingStatus === 'pending'
            ? 'Booking Received — Nano Spaces'
            : 'Booking Confirmed — Nano Spaces',
        html: bookingConfirmationTemplate(
          userName,
          title,
          room.name as string,
          formatForEmail(start_time, tz),
          formatForEmail(end_time, tz),
          bookingStatus === 'pending',
        ),
        requestId,
      })
    }
  } catch {
    // Email failure doesn't fail the booking
  }

  return success({ reservationId, status: bookingStatus }, { status: 201 })
})
