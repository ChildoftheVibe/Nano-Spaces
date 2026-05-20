import type { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { weeklyDigestTemplate } from '@/lib/email/auth-templates'

// Sends weekly digest emails to all org admins with past-week booking stats.
export const GET = async (req: NextRequest): Promise<Response> => {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekAgoIso = weekAgo.toISOString()

  // Only orgs with active subscriptions (or trial)
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, display_name')
    .in('subscription_status', ['active', 'trial'])

  const weekLabel = weekAgo.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  let emailsSent = 0

  for (const org of orgs ?? []) {
    const orgId = org.id as string

    // Compile stats in parallel
    const [
      { count: totalBookings },
      { count: cancellations },
      { count: noShows },
      { count: pendingApprovals },
      { count: newUsers },
    ] = await Promise.all([
      // New bookings created this week
      admin
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .in('status', ['confirmed', 'pending'])
        .gte('created_at', weekAgoIso),

      // Cancellations this week
      admin
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'cancelled')
        .gte('cancelled_at', weekAgoIso),

      // Ghost-released (no-shows) logged this week
      admin
        .from('activity_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('action', 'reservation.ghost_released')
        .gte('created_at', weekAgoIso),

      // Currently pending approvals
      admin
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'pending'),

      // New users joined this week
      admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', weekAgoIso),
    ])

    const stats = {
      totalBookings: totalBookings ?? 0,
      cancellations: cancellations ?? 0,
      noShows: noShows ?? 0,
      pendingApprovals: pendingApprovals ?? 0,
      newUsers: newUsers ?? 0,
    }

    // Send to all org admins
    const { data: admins } = await admin
      .from('profiles')
      .select('id')
      .eq('org_id', orgId)
      .eq('role', 'org_admin')
      .eq('is_active', true)

    for (const adminProfile of admins ?? []) {
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(adminProfile.id as string)
        const adminEmail = authUser.user?.email
        if (adminEmail) {
          await sendEmail({
            to: adminEmail,
            subject: `Weekly Digest — ${org.display_name as string}`,
            html: weeklyDigestTemplate(org.display_name as string, weekLabel, stats),
          })
          emailsSent++
        }
      } catch {
        // continue on per-admin errors
      }
    }
  }

  return Response.json({ ok: true, emailsSent })
}
