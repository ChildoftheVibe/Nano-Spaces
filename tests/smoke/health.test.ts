/**
 * Smoke tests — run post-deploy to verify the app is healthy.
 * These must complete in <2 minutes total.
 *
 * Run with: SMOKE_URL=https://yourapp.vercel.app npx vitest run tests/smoke
 */
import { describe, it, expect } from 'vitest'

const BASE_URL = process.env['SMOKE_URL'] ?? process.env['TEST_BASE_URL'] ?? 'http://localhost:3000'
const TIMEOUT = 10000

async function get(path: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT) })
}

describe('Smoke tests', () => {
  it('login page returns 200', async () => {
    const res = await get('/login')
    expect(res.status).toBe(200)
  })

  it('/api/user/push-key returns 200 (DB + env connectivity check)', async () => {
    const res = await get('/api/user/push-key')
    // Returns the VAPID public key — if DB is down or env missing, this will 500
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
  })

  it('terms page returns 200', async () => {
    const res = await get('/terms')
    expect(res.status).toBe(200)
  })

  it('privacy page returns 200', async () => {
    const res = await get('/privacy')
    expect(res.status).toBe(200)
  })

  it('/api/auth/login returns 401 (not 500) on bad credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smoke@test.example', password: 'SmokeTest1!' }),
      signal: AbortSignal.timeout(TIMEOUT),
    })
    // Must be 401 (auth error) not 500 (app crash or DB down)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('AUTH_ERROR')
  })

  it('join page returns 200', async () => {
    const res = await get('/join')
    expect(res.status).toBe(200)
  })

  it('forgot-password page returns 200', async () => {
    const res = await get('/forgot-password')
    expect(res.status).toBe(200)
  })

  it('API responses include Content-Type: application/json', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x', password: 'y' }),
      signal: AbortSignal.timeout(TIMEOUT),
    })
    expect(res.headers.get('content-type')).toContain('application/json')
  })
})
