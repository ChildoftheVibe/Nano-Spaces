import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'
import { sendEmail } from '@/lib/email/send'
import { bookingCancellationTemplate } from '@/lib/email/auth-templates'
import { toZonedTime, format } from 'date-fns-tz'

const editSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).nullable().optional(),
})

const cancelSchema = z.object({
  cancellation_reason: z.string().max(500).optional(),
})

async function requireAuth(_req: NextRequest, requestId: string) {
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

  return { user, profile: profile as { role: string; org_id: string } }
}

export const PUT = withErrorHandling(
  async (req: NextRequest, ctx: { params?: { id?: string } }) => {
    const requestId = crypto.randomUUID()
    const { user, profile } = await requireAuth(req, requestId)

    const reservationId = ctx.params?.id
    if (!reservationId)
      throw new ValidationError({ userMessage: 'Missing reservation id.', requestId })

    const body = await req.json().catch(() => null)
    const parsed = editSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError({
        userMessage: parsed.error.errors[0]?.message ?? 'Invalid input.',
        requestId,
      })
    }

    if (Object.keys(parsed.data).length === 0) return success({ updated: false })

    const admin = createAdminClient()
    const { data: reservation } = await admin
      .from('reservations')
      .select('id, booked_by, org_id, status')
      .eq('id', reservationId)
      .single()

    if (!reservation || reservation.org_id !== profile.org_id) {
      throw new NotFoundError({ userMessage: 'Reservation not found.', requestId })
    }

    const isOwner = reservation.booked_by === user.id
    const isAdmin = profile.role === 'org_admin' || profile.role === 'super_admin'
    if (!isOwner && !isAdmin) {
      throw new AuthError({ userMessage: 'Not authorized to edit this reservation.', requestId })
    }

    if (!['pending', 'confirmed'].includes(reservation.status as string)) {
      throw new ValidationError({
        userMessage: 'Only active reservations can be edited.',
        requestId,
      })
    }

    const updates: Record<string, unknown> = {}
    if (parsed.data.title !== undefined) updates.title = parsed.data.title
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('reservations') as any).update(updates).eq('id', reservationId)

    await admin.from('activity_log').insert({
      org_id: profile.org_id,
      actor_id: user.id,
      action: 'reservation.updated',
      target_type: 'reservation',
      target_id: reservationId,
      details: { fields: Object.keys(updates) },
    })

    return success({ updated: true })
  },
)

export const DELETE = withErrorHandling(
  async (req: NextRequest, ctx: { params?: { id?: string } }) => {
    const requestId = crypto.randomUUID()
    const { user, profile } = await requireAuth(req, requestId)

    const reservationId = ctx.params?.id
    if (!reservationId)
      throw new ValidationError({ userMessage: 'Missing reservation id.', requestId })

    const body = await req.json().catch(() => ({}))
    const parsed = cancelSchema.safeParse(body)
    const reason = parsed.success ? (parsed.data.cancellation_reason ?? null) : null

    const admin = createAdminClient()

    const { data: reservation } = await admin
      .from('reservations')
      .select('id, booked_by, org_id, title, start_time, end_time, status, location_id')
      .eq('id', reservationId)
      .single()

    if (!reservation || reservation.org_id !== profile.org_id) {
      throw new NotFoundError({ userMessage: 'Reservation not found.', requestId })
    }

    const isOwner = reservation.booked_by === user.id
    const isAdmin = profile.role === 'org_admin' || profile.role === 'super_admin'
    if (!isOwner && !isAdmin) {
      throw new AuthError({ userMessage: 'Not authorized to cancel this reservation.', requestId })
    }

    if (!['pending', 'confirmed'].includes(reservation.status as string)) {
      throw new ValidationError({
        userMessage: 'Only active reservations can be cancelled.',
        requestId,
      })
    }

    // Enforce cancel_notice_hours (only for users cancelling their own, not admins)
    if (isOwner && !isAdmin) {
      const { data: room } = await admin
        .from('locations')
        .select('cancel_notice_hours')
        .eq('id', reservation.location_id as string)
        .single()

      const cancelNotice = (room?.cancel_notice_hours as number | null) ?? 24
      const deadline = new Date(
        new Date(reservation.start_time as string).getTime() - cancelNotice * 60 * 60 * 1000,
      )
      if (new Date() > deadline) {
        throw new ValidationError({
          userMessage: `Cancellations require ${cancelNotice} hours notice. The deadline has passed.`,
          requestId,
        })
      }
    }

    await admin
      .from('reservations')
      .update({
        status: 'cancelled',
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', reservationId)

    // Notify booker if an admin cancelled their booking
    if (isAdmin && !isOwner && reservation.booked_by) {
      await admin.from('notifications').insert({
        user_id: reservation.booked_by as string,
        org_id: profile.org_id,
        type: 'reservation_cancelled',
        title: 'Booking Cancelled',
        body: `Your booking "${reservation.title as string}" was cancelled by an administrator.`,
        action_url: '/calendar',
      })

      // Send cancellation email to the booker (best-effort)
      try {
        const [{ data: bookerProfile }, { data: org }] = await Promise.all([
          admin
            .from('profiles')
            .select('full_name')
            .eq('id', reservation.booked_by as string)
            .single(),
          admin.from('organizations').select('primary_timezone').eq('id', profile.org_id).single(),
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
        const { data: roomData } = await admin
          .from('locations')
          .select('name')
          .eq('id', reservation.location_id as string)
          .single()

        if (bookerEmail) {
          await sendEmail({
            to: bookerEmail,
            subject: 'Booking Cancelled — Nano Spaces',
            html: bookingCancellationTemplate(
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
        // Email failure doesn't fail the cancellation
      }
    }

    await admin.from('activity_log').insert({
      org_id: profile.org_id,
      actor_id: user.id,
      action: 'reservation.cancelled',
      target_type: 'reservation',
      target_id: reservationId,
      details: { reason, cancelled_for: reservation.booked_by as string | null },
    })

    return success({ cancelled: true })
  },
)
