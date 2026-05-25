import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError } from '@/lib/errors/AppError'
import { sendEmail } from '@/lib/email/send'
import { godModeDisplacedTemplate } from '@/lib/email/auth-templates'
import { toZonedTime, format } from 'date-fns-tz'
import { env } from '@/lib/env'

const createSchema = z.object({
  location_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  god_mode_reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
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
    .select('id, role, org_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    throw new AuthError({ userMessage: 'Super admin access required.', requestId })
  }
  if (!profile.org_id) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input.',
      requestId,
    })
  }

  const { location_id, title, notes, start_time, end_time, god_mode_reason } = parsed.data
  const startDate = new Date(start_time)
  const endDate = new Date(end_time)

  if (endDate <= startDate) {
    throw new ValidationError({ userMessage: 'End time must be after start time.', requestId })
  }

  const admin = createAdminClient()

  const [{ data: room }, { data: org }] = await Promise.all([
    admin
      .from('locations')
      .select('id, org_id, name, is_active, in_maintenance')
      .eq('id', location_id)
      .single(),
    admin
      .from('organizations')
      .select('primary_timezone, display_name')
      .eq('id', profile.org_id as string)
      .single(),
  ])

  if (!room || room.org_id !== profile.org_id) {
    throw new ValidationError({ userMessage: 'Room not found.', requestId })
  }
  if (!room.is_active) throw new ValidationError({ userMessage: 'Room is not active.', requestId })
  if (room.in_maintenance) {
    throw new ValidationError({ userMessage: 'Room is under maintenance.', requestId })
  }

  const tz = (org?.primary_timezone as string | null) ?? 'UTC'
  const startFormatted = format(toZonedTime(startDate, tz), "EEE, MMM d yyyy 'at' h:mm a zzz", {
    timeZone: tz,
  })

  // Find all conflicting reservations (pending or confirmed)
  const { data: conflicts } = await admin
    .from('reservations')
    .select('id, booked_by, title, org_id')
    .eq('location_id', location_id)
    .in('status', ['pending', 'confirmed'])
    .lt('start_time', end_time)
    .gt('end_time', start_time)

  const displacedCount = conflicts?.length ?? 0

  // Cancel each conflicting reservation and auto-waitlist the displaced user
  const displacedUserIds = new Set<string>()
  for (const conflict of conflicts ?? []) {
    await admin
      .from('reservations')
      .update({
        status: 'cancelled',
        cancellation_reason: 'Admin priority override',
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', conflict.id as string)

    if (conflict.booked_by) {
      displacedUserIds.add(conflict.booked_by as string)

      // Auto-add displaced user to waitlist for the same slot
      const { data: existingWaitlist } = await admin
        .from('reservations')
        .select('id')
        .eq('location_id', location_id)
        .eq('booked_by', conflict.booked_by as string)
        .eq('status', 'waitlisted')
        .eq('start_time', start_time)
        .eq('end_time', end_time)
        .limit(1)

      if (!existingWaitlist || existingWaitlist.length === 0) {
        await admin.from('reservations').insert({
          location_id,
          booked_by: conflict.booked_by as string,
          org_id: profile.org_id as string,
          title: conflict.title as string,
          status: 'waitlisted',
          start_time,
          end_time,
          original_booker_id: conflict.booked_by as string,
        })
      }

      // Send email to displaced user
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(conflict.booked_by as string)
        const { data: displacedProfile } = await admin
          .from('profiles')
          .select('full_name')
          .eq('id', conflict.booked_by as string)
          .single()

        const userEmail = authUser.user?.email
        if (userEmail) {
          const bookNowUrl = `${env.NEXT_PUBLIC_APP_URL}/calendar`
          await sendEmail({
            to: userEmail,
            subject: 'Your booking was cancelled — Nano Spaces',
            html: godModeDisplacedTemplate(
              (displacedProfile?.full_name as string | null) ?? 'there',
              conflict.title as string,
              room.name as string,
              startFormatted,
              god_mode_reason,
              bookNowUrl,
            ),
            requestId,
          })
        }
      } catch {
        // email failure doesn't fail the god mode booking
      }
    }
  }

  // Create the God Mode reservation — bypass RPC (which enforces conflict checks)
  const { data: newRes, error: insertErr } = await admin
    .from('reservations')
    .insert({
      location_id,
      booked_by: user.id,
      org_id: profile.org_id as string,
      title,
      notes: notes ?? null,
      start_time,
      end_time,
      status: 'confirmed',
      god_mode_override: true,
      god_mode_by: user.id,
      god_mode_reason,
    })
    .select('id')
    .single()

  if (insertErr) throw new Error('Failed to create God Mode reservation.')

  // Insert in-app notification for the admin
  await admin.from('notifications').insert({
    user_id: user.id,
    org_id: profile.org_id as string,
    type: 'reservation_confirmed',
    title: 'God Mode Booking Created',
    body: `"${title}" was created with God Mode override.`,
    action_url: '/calendar',
  })

  // Log to activity_log with full details
  await admin.from('activity_log').insert({
    org_id: profile.org_id as string,
    actor_id: user.id,
    action: 'reservation.god_mode_override',
    target_type: 'reservation',
    target_id: (newRes as { id: string }).id,
    details: {
      reservation_id: (newRes as { id: string }).id,
      title,
      room_id: location_id,
      room_name: room.name,
      start_time,
      end_time,
      god_mode_reason,
      displaced_count: displacedCount,
      displaced_user_ids: Array.from(displacedUserIds),
    },
  })

  return success(
    { reservationId: (newRes as { id: string }).id, displacedCount, status: 'confirmed' },
    { status: 201 },
  )
})
