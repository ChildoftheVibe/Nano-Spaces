import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Redis } from '@upstash/redis'

const BUILD_SHA = process.env['VERCEL_GIT_COMMIT_SHA'] ?? 'local'
const VERSION = process.env['npm_package_version'] ?? '0.1.0'

async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const t0 = Date.now()
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('tos_versions').select('version').limit(1)
    if (error) return { ok: false, latencyMs: Date.now() - t0, error: error.message }
    return { ok: true, latencyMs: Date.now() - t0 }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, error: String(err) }
  }
}

async function checkStorage(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const t0 = Date.now()
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.storage.listBuckets()
    if (error) return { ok: false, latencyMs: Date.now() - t0, error: error.message }
    return { ok: true, latencyMs: Date.now() - t0 }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, error: String(err) }
  }
}

async function checkRateLimiter(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const t0 = Date.now()
  try {
    const redis = new Redis({
      url: process.env['UPSTASH_REDIS_REST_URL']!,
      token: process.env['UPSTASH_REDIS_REST_TOKEN']!,
    })
    await redis.ping()
    return { ok: true, latencyMs: Date.now() - t0 }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, error: String(err) }
  }
}

function checkEmail(): { ok: boolean; configured: boolean } {
  const configured = !!process.env['RESEND_API_KEY']
  return { ok: configured, configured }
}

export async function GET(_req: NextRequest) {
  const [db, storage, rateLimiter] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkRateLimiter(),
  ])
  const email = checkEmail()

  const allOk = db.ok && storage.ok && rateLimiter.ok && email.ok
  const status = allOk ? 'healthy' : 'degraded'

  return NextResponse.json(
    {
      status,
      buildSha: BUILD_SHA,
      version: VERSION,
      timestamp: new Date().toISOString(),
      services: {
        database: db,
        storage,
        rateLimiter,
        email,
      },
    },
    { status: allOk ? 200 : 503 },
  )
}
