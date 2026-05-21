/**
 * Integration tests for auth API routes.
 * Requires: local Supabase + Next.js dev server on :3000.
 * Run with: INTEGRATION=true npx vitest run tests/integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createOrg, createUser, cleanup } from '../../factories'

const BASE_URL = process.env['TEST_BASE_URL'] ?? 'http://localhost:3000'
const skipIfNoServer = process.env['INTEGRATION'] !== 'true' ? describe.skip : describe

async function post(path: string, body: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

skipIfNoServer('POST /api/auth/login', () => {
  let orgId: string
  let userEmail: string

  beforeAll(async () => {
    const org = await createOrg()
    orgId = org.id
    const user = await createUser(orgId, { role: 'user' })
    userEmail = user.email
  })

  afterAll(async () => {
    await cleanup(orgId)
  })

  it('returns session cookie on valid credentials', async () => {
    const res = await post('/api/auth/login', {
      email: userEmail,
      password: 'TestPass1234!',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toBeTruthy()
  })

  it('returns 401 on wrong password', async () => {
    const res = await post('/api/auth/login', {
      email: userEmail,
      password: 'WrongPassword123!',
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('returns 401 on non-existent email', async () => {
    const res = await post('/api/auth/login', {
      email: 'nobody-exists@example.com',
      password: 'SomePass1!',
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 on missing email', async () => {
    const res = await post('/api/auth/login', { password: 'SomePass1!' })
    expect(res.status).toBe(400)
  })
})

skipIfNoServer('POST /api/auth/forgot-password', () => {
  let orgId: string
  let userEmail: string

  beforeAll(async () => {
    const org = await createOrg()
    orgId = org.id
    const user = await createUser(orgId)
    userEmail = user.email
  })

  afterAll(async () => {
    await cleanup(orgId)
  })

  it('returns 200 for existing email', async () => {
    const res = await post('/api/auth/forgot-password', { email: userEmail })
    expect(res.status).toBe(200)
  })

  it('returns 200 for non-existent email (prevents enumeration)', async () => {
    const res = await post('/api/auth/forgot-password', {
      email: 'noemail@nothere.example.com',
    })
    expect(res.status).toBe(200)
  })
})
