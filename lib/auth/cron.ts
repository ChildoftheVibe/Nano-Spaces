import type { NextRequest } from 'next/server'
import { env } from '@/lib/env'

export function verifyCronSecret(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${env.CRON_SECRET}`
}
