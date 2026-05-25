import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { AuthError } from '@/lib/errors/AppError'
import { createSessionClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const supabase = await createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new AuthError({ userMessage: 'Unauthorized', requestId: '' })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, email_reminders, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return success({ items: [], allComplete: true })
  }

  const orgId = profile.org_id

  // Fetch org's locations first (availability_rules have no org_id — linked via location_id)
  const { data: orgRooms, count: roomCount } = await supabase
    .from('locations')
    .select('id', { count: 'exact' })
    .eq('org_id', orgId)

  const locationIds = orgRooms?.map((r) => r.id) ?? []

  // Check availability rules via location IDs
  const { count: availabilityCount } =
    locationIds.length > 0
      ? await supabase
          .from('availability_rules')
          .select('id', { count: 'exact', head: true })
          .in('location_id', locationIds)
      : { count: 0 }

  // Check member count (excluding the current user)
  const { count: memberCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .neq('id', user.id)

  // Check if org has any reservations
  const { count: reservationCount } = await supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)

  const items = [
    {
      id: 'add_room',
      label: 'Add your first room',
      description: 'Set up a bookable space for your team',
      href: '/rooms',
      complete: (roomCount ?? 0) > 0,
    },
    {
      id: 'set_availability',
      label: 'Set availability hours',
      description: 'Define when rooms are available for booking',
      href: '/rooms',
      complete: (availabilityCount ?? 0) > 0,
    },
    {
      id: 'invite_member',
      label: 'Invite a team member',
      description: 'Bring your colleagues onto the platform',
      href: '/users',
      complete: (memberCount ?? 0) > 0,
    },
    {
      id: 'first_booking',
      label: 'Make your first booking',
      description: 'Try booking a room on the calendar',
      href: '/calendar',
      complete: (reservationCount ?? 0) > 0,
    },
    {
      id: 'email_prefs',
      label: 'Set up email preferences',
      description: 'Choose how you want to receive reminders',
      href: '/settings',
      complete: profile.email_reminders === true,
    },
  ]

  return success({ items, allComplete: items.every((i) => i.complete) })
})
