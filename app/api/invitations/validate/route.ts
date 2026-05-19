import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/errors/AppError'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const token = req.nextUrl.searchParams.get('token')
  if (!token || token.length !== 64) {
    throw new ValidationError({ userMessage: 'Invalid token.', requestId })
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('invitations')
    .select('id, email, role, org_id, expires_at, accepted, revoked')
    .eq('token_hash', tokenHash)
    .single()

  if (!invite || invite.accepted || invite.revoked) {
    throw new NotFoundError({
      userMessage: 'This invitation is invalid or has already been used.',
      requestId,
    })
  }

  if (new Date(invite.expires_at) < new Date()) {
    throw new NotFoundError({ userMessage: 'This invitation has expired.', requestId })
  }

  const { data: org } = await admin
    .from('organizations')
    .select('display_name')
    .eq('id', invite.org_id)
    .single()

  return success({
    invitationId: invite.id,
    email: invite.email,
    role: invite.role,
    orgName: org?.display_name ?? 'Nano Spaces',
  })
})
