import type { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { auditTamperAlertTemplate } from '@/lib/email/auth-templates'

// Computes a SHA-256 hash chain over each org's activity_log.
// If the chain head changes for already-seen rows, tampering is flagged.
export const GET = async (req: NextRequest): Promise<Response> => {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  let processed = 0
  let tamperCount = 0

  // Fetch all active orgs
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, display_name')
    .in('subscription_status', ['active', 'trial', 'grace'])

  for (const org of orgs ?? []) {
    try {
      const orgId = org.id as string
      const orgName = (org.display_name as string | null) ?? orgId

      // Fetch the previous audit chain entry for this org
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: prevChain } = await (admin.from('audit_chain') as any)
        .select('chain_head_hash, row_count, last_entry_id')
        .eq('org_id', orgId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .single()

      const prevHash: string = (prevChain?.chain_head_hash as string | null) ?? ''
      const prevCount: number = (prevChain?.row_count as number | null) ?? 0

      // Fetch ALL activity_log entries for this org, ordered by id (stable)
      const { data: entries } = await admin
        .from('activity_log')
        .select('id, action, actor_id, target_id, target_type, created_at, details')
        .eq('org_id', orgId)
        .order('id', { ascending: true })

      const allEntries = entries ?? []
      const totalCount = allEntries.length

      if (totalCount === 0) continue

      // Recompute hash chain for all entries
      let runningHash = ''
      for (const entry of allEntries) {
        const payload = [
          runningHash,
          entry.id,
          entry.action,
          entry.actor_id ?? '',
          entry.target_id ?? '',
          entry.created_at,
          JSON.stringify(entry.details ?? {}),
        ].join('|')
        runningHash = await sha256(payload)
      }

      // Verify: recompute hash only for the first prevCount entries and compare
      let tamperDetected = false
      if (prevCount > 0 && prevHash) {
        let verifyHash = ''
        for (let i = 0; i < Math.min(prevCount, allEntries.length); i++) {
          const entry = allEntries[i]!
          const payload = [
            verifyHash,
            entry.id,
            entry.action,
            entry.actor_id ?? '',
            entry.target_id ?? '',
            entry.created_at,
            JSON.stringify(entry.details ?? {}),
          ].join('|')
          verifyHash = await sha256(payload)
        }
        // If we had exactly prevCount rows and the hash doesn't match, tampering detected
        if (allEntries.length >= prevCount && verifyHash !== prevHash) {
          tamperDetected = true
          tamperCount++
        }
      }

      const lastEntry = allEntries[allEntries.length - 1]!

      // Insert new chain record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('audit_chain') as any).insert({
        org_id: orgId,
        chain_head_hash: runningHash,
        row_count: totalCount,
        last_entry_id: lastEntry.id,
        computed_at: new Date().toISOString(),
        tamper_detected: tamperDetected,
      })

      if (tamperDetected) {
        // Alert super admins
        const { data: superAdmins } = await admin
          .from('profiles')
          .select('id')
          .eq('role', 'super_admin')
          .eq('is_active', true)

        for (const sa of superAdmins ?? []) {
          try {
            const { data: authUser } = await admin.auth.admin.getUserById(sa.id as string)
            const email = authUser.user?.email
            if (email) {
              await sendEmail({
                to: email,
                subject: `⚠️ Audit Tampering Detected — ${orgName}`,
                html: auditTamperAlertTemplate(orgName, new Date().toUTCString()),
              })
            }
          } catch {
            // continue
          }
        }
      }

      processed++
    } catch {
      // continue per-org errors
    }
  }

  return Response.json({ ok: true, processed, tamperCount })
}

async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
