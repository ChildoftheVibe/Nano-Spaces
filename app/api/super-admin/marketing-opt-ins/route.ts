import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/errors/AppError'

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const requestId = crypto.randomUUID()

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

  const admin = createAdminClient()

  // Fetch orgs that have opted in and their admin profiles
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, display_name, name, slug, subscription_tier, subscription_status, created_at')
    .eq('master_admin_email_optin', true)
    .order('display_name')

  if (!orgs || orgs.length === 0) {
    return success({ optIns: [] })
  }

  const orgIds = orgs.map((o) => o.id)

  // For each opted-in org, get the primary admin profile
  const { data: adminProfiles } = await admin
    .from('profiles')
    .select('id, org_id, full_name')
    .in('org_id', orgIds)
    .eq('role', 'org_admin')
    .eq('is_active', true)

  // Fetch emails for those admins
  const adminMap: Record<string, { name: string; email: string }> = {}
  await Promise.all(
    (adminProfiles ?? []).map(async (p) => {
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(p.id as string)
        if (authUser.user?.email) {
          adminMap[p.org_id as string] = {
            name: (p.full_name as string | null) ?? 'Unknown',
            email: authUser.user.email,
          }
        }
      } catch {
        // skip if auth lookup fails
      }
    }),
  )

  const optIns = orgs.map((o) => ({
    org_id: o.id,
    org_name: (o.display_name as string | null) ?? (o.name as string),
    slug: o.slug,
    subscription_tier: o.subscription_tier,
    subscription_status: o.subscription_status,
    created_at: o.created_at,
    admin_name: adminMap[o.id as string]?.name ?? 'Unknown',
    admin_email: adminMap[o.id as string]?.email ?? '',
  }))

  return success({ optIns })
})
