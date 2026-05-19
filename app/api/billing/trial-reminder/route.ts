import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { sendEmail } from '@/lib/email/send'
import { trialReminderTemplate } from '@/lib/email/auth-templates'
import { env } from '@/lib/env'

export const GET = async (req: NextRequest): Promise<Response> => {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const billingUrl = `${env.NEXT_PUBLIC_APP_URL}/settings/billing`

  let day7Sent = 0
  let day13Sent = 0

  // Day-7 reminder: trial started ≥7 days ago, hasn't expired yet, not yet sent
  const day7Cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: day7Orgs } = await admin
    .from('organizations')
    .select('id, trial_ends_at')
    .eq('subscription_status', 'trial')
    .eq('trial_day7_sent', false)
    .lte('trial_starts_at', day7Cutoff)
    .gt('trial_ends_at', now.toISOString())

  for (const org of day7Orgs ?? []) {
    const daysLeft = Math.ceil(
      (new Date(org.trial_ends_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    )
    const adminEmail = await getOrgAdminEmail(admin, org.id)
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `Your Nano Spaces trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        html: trialReminderTemplate(daysLeft, billingUrl),
      }).catch(() => null)
    }
    await admin.from('organizations').update({ trial_day7_sent: true }).eq('id', org.id)
    day7Sent++
  }

  // Day-13 reminder: trial started ≥13 days ago, hasn't expired yet, not yet sent
  const day13Cutoff = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString()
  const { data: day13Orgs } = await admin
    .from('organizations')
    .select('id, trial_ends_at')
    .eq('subscription_status', 'trial')
    .eq('trial_day13_sent', false)
    .lte('trial_starts_at', day13Cutoff)
    .gt('trial_ends_at', now.toISOString())

  for (const org of day13Orgs ?? []) {
    const daysLeft = Math.ceil(
      (new Date(org.trial_ends_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    )
    const adminEmail = await getOrgAdminEmail(admin, org.id)
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `Your Nano Spaces trial ends tomorrow`,
        html: trialReminderTemplate(Math.max(daysLeft, 1), billingUrl),
      }).catch(() => null)
    }
    await admin.from('organizations').update({ trial_day13_sent: true }).eq('id', org.id)
    day13Sent++
  }

  return Response.json({ ok: true, day7Sent, day13Sent })
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
