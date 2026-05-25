import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

const bodySchema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  fullName: z.string().min(1, 'Name is required').max(100),
})

function buildSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 48)
  const suffix = Math.random().toString(36).substring(2, 7)
  return `${base}-${suffix}`
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input',
      details: parsed.error.flatten(),
      requestId,
    })
  }

  const { orgName, fullName } = parsed.data

  const session = await createSessionClient()
  const {
    data: { user },
  } = await session.auth.getUser()

  if (!user) {
    throw new AuthError({ userMessage: 'Not authenticated', requestId })
  }

  const { data: existing } = await session.from('profiles').select('id').eq('id', user.id).single()

  if (existing) {
    throw new ValidationError({ userMessage: 'Account is already set up.', requestId })
  }

  const admin = createAdminClient()

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName, slug: buildSlug(orgName), display_name: orgName })
    .select('id')
    .single()

  if (orgError ?? !org) {
    throw new Error('Failed to create organization.')
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: user.id,
    full_name: fullName,
    email: user.email!,
    role: 'org_admin',
    org_id: org.id,
  })

  if (profileError) {
    await admin.from('organizations').delete().eq('id', org.id)
    throw new Error('Failed to create profile.')
  }

  await admin.from('activity_log').insert({
    org_id: org.id,
    actor_id: user.id,
    action: 'org_created',
    target_type: 'organization',
    target_id: org.id,
    details: { name: orgName, via: 'oauth' },
  })

  return success({ orgId: org.id })
})
