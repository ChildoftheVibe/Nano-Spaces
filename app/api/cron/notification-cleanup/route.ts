import type { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { createAdminClient } from '@/lib/supabase/server'

// Deletes notifications older than 30 days.
export const GET = async (req: NextRequest): Promise<Response> => {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: deleted, error } = await admin
    .from('notifications')
    .delete()
    .lt('created_at', cutoff)
    .select('id')

  if (error) return Response.json({ error: 'Deletion failed' }, { status: 500 })

  return Response.json({ ok: true, deleted: deleted?.length ?? 0 })
}
