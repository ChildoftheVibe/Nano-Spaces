/**
 * Integration tests for invitations API.
 * Requires: INTEGRATION=true + local Supabase + Next.js dev server on :3000.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createOrg, createUser, cleanup } from '../../factories'

const BASE_URL = process.env['TEST_BASE_URL'] ?? 'http://localhost:3000'
const skipIfNoServer = process.env['INTEGRATION'] !== 'true' ? describe.skip : describe

async function loginAndGetCookie(email: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPass1234!' }),
  })
  return res.headers.get('set-cookie') ?? ''
}

async function post(path: string, body: unknown, cookie: string) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  })
}

skipIfNoServer('POST /api/invitations', () => {
  let orgId: string
  let adminCookie: string

  beforeAll(async () => {
    const org = await createOrg({ subscription_tier: 'growth' })
    orgId = org.id
    const admin = await createUser(orgId, { role: 'org_admin' })
    adminCookie = await loginAndGetCookie(admin.email)
  })

  afterAll(async () => {
    await cleanup(orgId)
  })

  it('creates an invitation successfully', async () => {
    const res = await post(
      '/api/invitations',
      { email: `invitee-${Date.now()}@test.example.com`, role: 'user' },
      adminCookie,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('token')
  })

  it('returns 401 when not authenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', role: 'user' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid email', async () => {
    const res = await post('/api/invitations', { email: 'not-an-email', role: 'user' }, adminCookie)
    expect(res.status).toBe(400)
  })
})
