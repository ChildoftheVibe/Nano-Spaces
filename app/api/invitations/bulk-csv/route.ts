import { randomBytes, createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { invitationEmailTemplate } from '@/lib/email/auth-templates'
import { checkUserLimit } from '@/lib/tiers'
import { env } from '@/lib/env'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

const rowSchema = z.object({
  email: z.string().email(),
  role: z.enum(['user', 'org_admin']).default('user'),
})

function parseCsv(csv: string): Array<{ email: string; role: string }> {
  const lines = csv
    .trim()
    .split('\n')
    .map((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0]!.split(',').map((h) => h.trim().toLowerCase())
  const emailIdx = headers.indexOf('email')
  const roleIdx = headers.indexOf('role')

  if (emailIdx === -1) return []

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim())
    return {
      // eslint-disable-next-line security/detect-object-injection
      email: cols[emailIdx] ?? '',
      // eslint-disable-next-line security/detect-object-injection
      role: roleIdx !== -1 ? (cols[roleIdx] ?? 'user') : 'user',
    }
  })
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const formData = await req.formData().catch(() => null)
  const csvFile = formData?.get('file')

  if (!(csvFile instanceof File)) {
    throw new ValidationError({ userMessage: 'A CSV file is required.', requestId })
  }

  const csvText = await csvFile.text()
  const rows = parseCsv(csvText)

  if (rows.length === 0) {
    throw new ValidationError({
      userMessage: 'CSV must have at least one data row with an email column.',
      requestId,
    })
  }

  if (rows.length > 100) {
    throw new ValidationError({ userMessage: 'CSV must not exceed 100 rows.', requestId })
  }

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const { data: profile } = await sessionClient
    .from('profiles')
    .select('role, org_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'org_admin' || !profile.org_id) {
    throw new AuthError({ userMessage: 'Org admin access required.', requestId })
  }

  const admin = createAdminClient()
  const orgId = profile.org_id

  const { data: org } = await admin
    .from('organizations')
    .select('display_name')
    .eq('id', orgId)
    .single()

  const results: Array<{ email: string; status: string; error?: string }> = []

  for (const rawRow of rows) {
    const parsed = rowSchema.safeParse(rawRow)
    if (!parsed.success) {
      results.push({ email: rawRow.email, status: 'skipped', error: 'Invalid email or role' })
      continue
    }

    const { email, role } = parsed.data

    // Check tier limit before each invite
    const tierCheck = await checkUserLimit(orgId)
    if (!tierCheck.allowed) {
      results.push({ email, status: 'skipped', error: 'User limit reached for this plan' })
      continue
    }

    // Check existing member
    const { data: existingMember } = await admin
      .from('profiles')
      .select('id')
      .eq('org_id', orgId)
      .eq('email', email)
      .single()

    if (existingMember) {
      results.push({ email, status: 'skipped', error: 'Already a member' })
      continue
    }

    // Check pending invite
    const { data: pendingInvite } = await admin
      .from('invitations')
      .select('id')
      .eq('org_id', orgId)
      .eq('email', email)
      .eq('accepted', false)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (pendingInvite) {
      results.push({ email, status: 'skipped', error: 'Pending invitation already exists' })
      continue
    }

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const { data: invite, error: insertError } = await admin
      .from('invitations')
      .insert({
        org_id: orgId,
        email,
        role,
        token_hash: tokenHash,
        invited_by: user.id,
        expires_at: expiresAt,
        last_sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !invite) {
      results.push({ email, status: 'failed', error: 'Database error' })
      continue
    }

    try {
      const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/join?token=${rawToken}`
      await sendEmail({
        to: email,
        subject: `You've been invited to ${org?.display_name ?? 'Nano Spaces'}`,
        html: invitationEmailTemplate(
          profile.full_name ?? 'Your administrator',
          org?.display_name ?? 'Nano Spaces',
          role,
          acceptUrl,
        ),
        requestId,
      })
      results.push({ email, status: 'sent' })
    } catch {
      results.push({ email, status: 'sent_failed', error: 'Email delivery failed' })
    }
  }

  return success({ results })
})
