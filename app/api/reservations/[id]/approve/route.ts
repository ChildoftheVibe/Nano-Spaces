import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'
import { sendEmail } from '@/lib/email/send'
import { approvalStatusTemplate } from '@/lib/email/auth-templates'
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

    const isAdmin = profile.role === 'org_admin' || profile.role === 'super_admin'
    if (!isAdmin) throw new AuthError({ userMessage: 'Admin access required.', requestId })

    const reservationId = ctx.params?.id
    if (!reservationId) throw new ValidationError({ userMessage: 'Missing id.', requestId })

    const admin = createAdminClient()
    const { data: reservation } = await admin
      .from('reservations')
      .select('id, booked_by, org_id, title, start_time, location_id, status')
      .eq('id', reservationId)
      .single()

    if (!reservation || reservation.org_id !== profile.org_id) {
      throw new NotFoundError({ userMessage: 'Reservation not found.', requestId })
    }

    if (reservation.status !== 'pending') {
      throw new ValidationError({
        userMessage: 'Only pending reservations can be approved.',
        requestId,
      })
    }

    await admin.from('reservations').update({ status: 'confirmed' }).eq('id', reservationId)

    if (reservation.booked_by) {
      await admin.from('notifications').insert({
        user_id: reservation.booked_by as string,
        org_id: profile.org_id,
        type: 'reservation_confirmed',
        title: 'Booking Approved',
        body: `Your booking "${reservation.title as string}" has been approved.`,
        action_url: '/calendar',
      })

      try {
        const [{ data: bookerProfile }, { data: org }, { data: roomData }] = await Promise.all([
          admin
            .from('profiles')
            .select('full_name')
            .eq('id', reservation.booked_by as string)
            .single(),
          admin.from('organizations').select('primary_timezone').eq('id', profile.org_id).single(),
          admin
            .from('locations')
            .select('name')
            .eq('id', reservation.location_id as string)
            .single(),
        ])
        const { data: authUser } = await admin.auth.admin.getUserById(
          reservation.booked_by as string,
        )
        const bookerEmail = authUser.user?.email
        const tz = (org?.primary_timezone as string | null) ?? 'UTC'
        const startFormatted = format(
          toZonedTime(new Date(reservation.start_time as string), tz),
          "EEE, MMM d yyyy 'at' h:mm a zzz",
          { timeZone: tz },
        )
        if (bookerEmail) {
          await sendEmail({
            to: bookerEmail,
            subject: 'Booking Approved — Nano Spaces',
            html: approvalStatusTemplate(
              (bookerProfile?.full_name as string | null) ?? 'there',
              reservation.title as string,
              (roomData?.name as string | null) ?? 'Room',
              startFormatted,
              true,
            ),
            requestId,
          })
        }
      } catch {
        // email failure doesn't fail the approval
      }
    }

    await admin.from('activity_log').insert({
      org_id: profile.org_id,
      actor_id: user.id,
      action: 'reservation.approved',
      target_type: 'reservation',
      target_id: reservationId,
      details: {},
    })

    return success({ approved: true })
  },
)
