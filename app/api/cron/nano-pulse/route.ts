import type { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { hibernationNoticeTemplate } from '@/lib/email/auth-templates'

// Hibernates users inactive for 30+ days, flags their future reservations, emails them.
export const GET = async (req: NextRequest): Promise<Response> => {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: staleProfiles } = await admin
    .from('profiles')
    .select('id, full_name, org_id')
    .eq('is_active', true)
    .eq('hibernate_status', 'active')
    .lt('last_active_at', cutoff)
    .not('last_active_at', 'is', null)

  let hibernated = 0
  let reservationsFlagged = 0

  for (const profile of staleProfiles ?? []) {
    const userId = profile.id as string
    const orgId = profile.org_id as string

    await admin
      .from('profiles')
      .update({ hibernate_status: 'hibernated', hibernated_at: now.toISOString() })
      .eq('id', userId)

    // Flag future confirmed/pending reservations for this user
    const { data: flagged } = await admin
      .from('reservations')
      .update({ status: 'flagged' })
      .eq('booked_by', userId)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', now.toISOString())
      .select('id')

    reservationsFlagged += flagged?.length ?? 0

    await admin.from('activity_log').insert({
      org_id: orgId,
      actor_id: null,
      action: 'user_hibernated',
      target_type: 'profile',
      target_id: userId,
      details: { triggered_by: 'system_cron', reservations_flagged: flagged?.length ?? 0 },
    })

    // Get org name and user email for notification
    try {
      const [{ data: org }, { data: authUser }] = await Promise.all([
        admin.from('organizations').select('display_name').eq('id', orgId).single(),
        admin.auth.admin.getUserById(userId),
      ])
      const userEmail = authUser.user?.email
      if (userEmail) {
        await sendEmail({
          to: userEmail,
          subject: 'Your Nano Spaces account has been hibernated',
          html: hibernationNoticeTemplate(
            (profile.full_name as string | null) ?? 'there',
            (org?.display_name as string | null) ?? 'your organization',
          ),
        })
      }
    } catch {
      // email failure doesn't fail the hibernation
    }

    hibernated++
  }

  return Response.json({ ok: true, hibernated, reservationsFlagged })
}
