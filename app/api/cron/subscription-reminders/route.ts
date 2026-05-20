import type { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { subscriptionReminderTemplate } from '@/lib/email/auth-templates'
import { env } from '@/lib/env'

// Sends renewal reminders at 7d/3d/1d, expires grace periods past their end date.
export const GET = async (req: NextRequest): Promise<Response> => {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const billingUrl = `${env.NEXT_PUBLIC_APP_URL}/settings/billing`

  let remindersSent = 0
  let graceExpired = 0

  // Expire grace periods that have ended
  const { data: expiredGrace } = await admin
    .from('organizations')
    .select('id')
    .eq('subscription_status', 'grace')
    .lt('grace_period_ends_at', now.toISOString())

  for (const org of expiredGrace ?? []) {
    await admin
      .from('organizations')
      .update({ subscription_status: 'expired' })
      .eq('id', org.id as string)
    await admin.from('activity_log').insert({
      org_id: org.id as string,
      actor_id: null,
      action: 'grace_period_expired',
      target_type: 'organization',
      target_id: org.id as string,
      details: {},
    })
    graceExpired++
  }

  // Renewal reminders at 7d, 3d, 1d before subscription_expires_at
  const WINDOWS = [
    { days: 7, subjectSuffix: 'in 7 days' },
    { days: 3, subjectSuffix: 'in 3 days' },
    { days: 1, subjectSuffix: 'tomorrow' },
  ] as const

  for (const win of WINDOWS) {
    const windowStart = new Date(now.getTime() + (win.days - 0.5) * 24 * 60 * 60 * 1000)
    const windowEnd = new Date(now.getTime() + (win.days + 0.5) * 24 * 60 * 60 * 1000)

    const { data: orgs } = await admin
      .from('organizations')
      .select('id, subscription_tier, subscription_expires_at')
      .eq('subscription_status', 'active')
      .gte('subscription_expires_at', windowStart.toISOString())
      .lte('subscription_expires_at', windowEnd.toISOString())

    for (const org of orgs ?? []) {
      const adminEmail = await getOrgAdminEmail(admin, org.id as string)
      if (!adminEmail) continue

      const tier = org.subscription_tier as string
      const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)
      const renewalDate = new Date(org.subscription_expires_at as string).toLocaleDateString(
        'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' },
      )

      await sendEmail({
        to: adminEmail,
        subject: `Your Nano Spaces ${tierLabel} subscription renews ${win.subjectSuffix}`,
        html: subscriptionReminderTemplate(win.days, tierLabel, renewalDate, billingUrl),
      }).catch(() => null)
      remindersSent++
    }
  }

  return Response.json({ ok: true, remindersSent, graceExpired })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrgAdminEmail(admin: any, orgId: string): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('org_id', orgId)
    .eq('role', 'org_admin')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (!data) return null
  const { data: authUser } = await admin.auth.admin.getUserById(data.id)
  return authUser.user?.email ?? null
}
