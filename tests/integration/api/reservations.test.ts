/**
 * Integration tests for POST /api/reservations.
 * Requires: local Supabase + Next.js dev server on :3000.
 * Run with: INTEGRATION=true npx vitest run tests/integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createOrg, createUser, createRoom, cleanup } from '../../factories'

const BASE_URL = process.env['TEST_BASE_URL'] ?? 'http://localhost:3000'
const skipIfNoServer = process.env['INTEGRATION'] !== 'true' ? describe.skip : describe

async function apiPost(path: string, body: unknown, cookie?: string) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function loginAndGetCookie(email: string, password: string): Promise<string> {
  const res = await apiPost('/api/auth/login', { email, password })
  const cookies = res.headers.get('set-cookie') ?? ''
  return cookies
}

skipIfNoServer('POST /api/reservations', () => {
  let orgId: string
  let roomId: string
  let userCookie: string
  let userId: string

  // Dates for tomorrow
  function tomorrowAt(hour: number): string {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setUTCHours(hour, 0, 0, 0)
    return d.toISOString()
  }

  beforeAll(async () => {
    const org = await createOrg()
    orgId = org.id
    const room = await createRoom(orgId)
    roomId = room.id
    const user = await createUser(orgId, { role: 'user' })
    userId = user.id
    userCookie = await loginAndGetCookie(user.email, 'TestPass1234!')
  })

  afterAll(async () => {
    await cleanup(orgId)
  })

  it('creates a confirmed reservation on the happy path', async () => {
    const res = await apiPost(
      '/api/reservations',
      {
        location_id: roomId,
        title: 'Integration Test Booking',
        start_time: tomorrowAt(10),
        end_time: tomorrowAt(11),
      },
      userCookie,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('confirmed')
    expect(body.data.booked_by).toBe(userId)
  })

  it('returns 409 on time conflict', async () => {
    const start = tomorrowAt(14)
    const end = tomorrowAt(15)
    // First booking
    await apiPost(
      '/api/reservations',
      { location_id: roomId, title: 'First', start_time: start, end_time: end },
      userCookie,
    )
    // Second booking at same time
    const res = await apiPost(
      '/api/reservations',
      { location_id: roomId, title: 'Conflict', start_time: start, end_time: end },
      userCookie,
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(['BOOKING_CONFLICT', 'CONFLICT']).toContain(body.error.code)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await apiPost('/api/reservations', {
      location_id: roomId,
      title: 'Unauthed',
      start_time: tomorrowAt(16),
      end_time: tomorrowAt(17),
    })
    expect(res.status).toBe(401)
  })
})
