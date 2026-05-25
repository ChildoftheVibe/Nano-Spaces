import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

async function requireSuperAdmin(requestId: string) {
  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const { data: profile } = await sessionClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    throw new AuthError({ userMessage: 'Super admin access required.', requestId })
  }

  return { user, sessionClient }
}

function buildSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 48)
  const suffix = Math.random().toString(36).substring(2, 7)
  return `${base}-${suffix}`
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()
  await requireSuperAdmin(requestId)

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const search = url.searchParams.get('search')?.trim() ?? ''
  const limit = 25
  const offset = (page - 1) * limit

  const admin = createAdminClient()

  let query = admin
    .from('organizations')
    .select(
      'id, name, display_name, slug, subscription_status, subscription_tier, trial_ends_at, subscription_expires_at, grace_period_ends_at, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,display_name.ilike.%${search}%,slug.ilike.%${search}%`)
  }

  const { data: orgs, count } = await query

  return success({ orgs: orgs ?? [], total: count ?? 0, page, limit })
})

const createSchema = z.object({
  orgName: z.string().min(2).max(100),
  adminFullName: z.string().min(1).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(12).max(128),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()
  const { user } = await requireSuperAdmin(requestId)

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError({
      userMessage: parsed.error.errors[0]?.message ?? 'Invalid input.',
      requestId,
    })
  }

  const { orgName, adminFullName, adminEmail, adminPassword } = parsed.data
  const admin = createAdminClient()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  })

  if (createError ?? !created.user) {
    if (createError?.message?.includes('already registered')) {
      throw new ValidationError({
        userMessage: 'An account with this email already exists.',
        requestId,
      })
    }
    throw new Error('Failed to create admin user.')
  }

  const newUserId = created.user.id

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName, slug: buildSlug(orgName), display_name: orgName })
    .select('id')
    .single()

  if (orgError ?? !org) {
    await admin.auth.admin.deleteUser(newUserId)
    throw new Error('Failed to create organization.')
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: newUserId,
    full_name: adminFullName,
    email: adminEmail,
    role: 'org_admin',
    org_id: org.id,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(newUserId)
    await admin.from('organizations').delete().eq('id', org.id)
    throw new Error('Failed to create profile.')
  }

  await admin.from('activity_log').insert({
    org_id: org.id,
    actor_id: user.id,
    action: 'org_created_by_super_admin',
    target_type: 'organization',
    target_id: org.id,
    details: { org_name: orgName, admin_email: adminEmail },
  })

  return success({ orgId: org.id })
})
