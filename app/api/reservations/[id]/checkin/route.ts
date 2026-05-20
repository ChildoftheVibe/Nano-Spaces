import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, NotFoundError, ValidationError } from '@/lib/errors/AppError'

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
      .select('id, booked_by, org_id, status, start_time, end_time, checked_in')
      .eq('id', reservationId)
      .single()

    if (!reservation || reservation.org_id !== profile.org_id) {
      throw new NotFoundError({ userMessage: 'Reservation not found.', requestId })
    }

    const isOwner = reservation.booked_by === user.id
    const isAdmin = profile.role === 'org_admin' || profile.role === 'super_admin'
    if (!isOwner && !isAdmin) {
      throw new AuthError({ userMessage: 'Not authorized.', requestId })
    }

    if (reservation.status !== 'confirmed') {
      throw new ValidationError({
        userMessage: 'Only confirmed reservations can be checked in.',
        requestId,
      })
    }

    if (reservation.checked_in as boolean) {
      return success({ already_checked_in: true })
    }

    const now = new Date()
    const startTime = new Date(reservation.start_time as string)
    const endTime = new Date(reservation.end_time as string)
    const tenMinBefore = new Date(startTime.getTime() - 10 * 60 * 1000)

    if (now < tenMinBefore) {
      throw new ValidationError({
        userMessage: 'Check-in opens 10 minutes before the booking starts.',
        requestId,
      })
    }

    if (now > endTime) {
      throw new ValidationError({
        userMessage: 'This booking has already ended.',
        requestId,
      })
    }

    await admin
      .from('reservations')
      .update({ checked_in: true, checked_in_at: now.toISOString() })
      .eq('id', reservationId)

    await admin.from('activity_log').insert({
      org_id: profile.org_id,
      actor_id: user.id,
      action: 'reservation.checked_in',
      target_type: 'reservation',
      target_id: reservationId,
      details: {},
    })

    return success({ checked_in: true })
  },
)
