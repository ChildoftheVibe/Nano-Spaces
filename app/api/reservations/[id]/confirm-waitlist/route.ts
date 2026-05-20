import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import {
  AuthError,
  NotFoundError,
  ValidationError,
  BookingConflictError,
} from '@/lib/errors/AppError'
import { sendEmail } from '@/lib/email/send'
import { bookingConfirmationTemplate } from '@/lib/email/auth-templates'
import { toZonedTime, format } from 'date-fns-tz'

export const POST = withErrorHandling(
  async (_req: NextRequest, ctx: { params?: { id?: string } }) => {
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
    if (!profile?.org_id) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

    const reservationId = ctx.params?.id
    if (!reservationId) throw new ValidationError({ userMessage: 'Missing id.', requestId })

    const admin = createAdminClient()
    const { data: reservation } = await admin
      .from('reservations')
      .select('id, booked_by, org_id, status, waitlist_expires_at')
      .eq('id', reservationId)
      .single()

    if (!reservation || reservation.org_id !== profile.org_id) {
      throw new NotFoundError({ userMessage: 'Reservation not found.', requestId })
    }

    if (reservation.booked_by !== user.id) {
      throw new AuthError({ userMessage: 'Not authorized.', requestId })
    }

    if (reservation.status !== 'waitlisted') {
      throw new ValidationError({
        userMessage: 'This reservation is not on the waitlist.',
        requestId,
      })
    }

    const { data: newStatus, error: rpcError } = await admin.rpc('confirm_from_waitlist', {
      p_reservation_id: reservationId,
    })

    if (rpcError) {
      if (rpcError.message?.includes('WAITLIST_EXPIRED')) {
        throw new ValidationError({
          userMessage:
            'Your waitlist hold has expired. The slot may have been given to someone else.',
          requestId,
        })
      }
      if (rpcError.message?.includes('BOOKING_CONFLICT')) {
        throw new BookingConflictError({
          userMessage: 'This slot was just taken. Please try a different time.',
          requestId,
        })
      }
      throw new ValidationError({ userMessage: 'Unable to confirm booking.', requestId })
    }

    try {
      const [{ data: resDetails }, { data: org }] = await Promise.all([
        admin
          .from('reservations')
          .select('title, start_time, end_time, location_id')
          .eq('id', reservationId)
          .single(),
        admin.from('organizations').select('primary_timezone').eq('id', profile.org_id).single(),
      ])
      const { data: authUser } = await admin.auth.admin.getUserById(user.id)
      const { data: userProfile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      const { data: roomData } = await admin
        .from('locations')
        .select('name')
        .eq('id', resDetails?.location_id as string)
        .single()

      const tz = (org?.primary_timezone as string | null) ?? 'UTC'
      const userEmail = authUser.user?.email
      if (userEmail && resDetails) {
        await sendEmail({
          to: userEmail,
          subject: 'Booking Confirmed — Nano Spaces',
          html: bookingConfirmationTemplate(
            (userProfile?.full_name as string | null) ?? 'there',
            resDetails.title as string,
            (roomData?.name as string | null) ?? 'Room',
            format(
              toZonedTime(new Date(resDetails.start_time as string), tz),
              "EEE, MMM d yyyy 'at' h:mm a zzz",
              { timeZone: tz },
            ),
            format(
              toZonedTime(new Date(resDetails.end_time as string), tz),
              "EEE, MMM d yyyy 'at' h:mm a zzz",
              { timeZone: tz },
            ),
            newStatus === 'pending',
          ),
          requestId,
        })
      }
    } catch {
      // email failure doesn't fail the confirmation
    }

    return success({ status: newStatus as string })
  },
)
