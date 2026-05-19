import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { sendEmail } from '@/lib/email/send'
import { subscriptionReminderTemplate } from '@/lib/email/auth-templates'
import { env } from '@/lib/env'

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
    await admin.from('organizations').update({ subscription_status: 'expired' }).eq('id', org.id)
    await admin.from('activity_log').insert({
      org_id: org.id,
      actor_id: null,
      action: 'grace_period_expired',
      target_type: 'organization',
      target_id: org.id,
      details: {},
    })
    graceExpired++
  }

  // Renewal reminders for active subscriptions at 7d, 3d, 1d windows
  const REMINDER_WINDOWS = [
    {
      days: 7,
      subject: (tier: string) => `Your Nano Spaces ${tier} subscription renews in 7 days`,
    },
    {
      days: 3,
      subject: (tier: string) => `Your Nano Spaces ${tier} subscription renews in 3 days`,
    },
    { days: 1, subject: (tier: string) => `Your Nano Spaces ${tier} subscription renews tomorrow` },
  ]

  for (const window of REMINDER_WINDOWS) {
    const windowStart = new Date(now.getTime() + (window.days - 0.5) * 24 * 60 * 60 * 1000)
    const windowEnd = new Date(now.getTime() + (window.days + 0.5) * 24 * 60 * 60 * 1000)

    const { data: orgs } = await admin
      .from('organizations')
      .select('id, subscription_tier, subscription_expires_at')
      .eq('subscription_status', 'active')
      .gte('subscription_expires_at', windowStart.toISOString())
      .lte('subscription_expires_at', windowEnd.toISOString())

    for (const org of orgs ?? []) {
      const adminEmail = await getOrgAdminEmail(admin, org.id)
      if (!adminEmail) continue

      const renewalDate = new Date(org.subscription_expires_at as string).toLocaleDateString(
        'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' },
      )
      const tierLabel =
        (org.subscription_tier as string).charAt(0).toUpperCase() +
        (org.subscription_tier as string).slice(1)

      await sendEmail({
        to: adminEmail,
        subject: window.subject(tierLabel),
        html: subscriptionReminderTemplate(window.days, tierLabel, renewalDate, billingUrl),
      }).catch(() => null)
      remindersSent++
    }
  }

  // Grace period notification — send when a subscription first enters grace
  // (handled by webhook BILLING.SUBSCRIPTION.CANCELLED → sets status='grace')
  // We send the grace email immediately in the cancel API route instead.

  return Response.json({ ok: true, remindersSent, graceExpired })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrgAdminEmail(admin: any, orgId: string): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('email')
    .eq('org_id', orgId)
    .eq('role', 'org_admin')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  return (data?.email as string | null | undefined) ?? null
}
