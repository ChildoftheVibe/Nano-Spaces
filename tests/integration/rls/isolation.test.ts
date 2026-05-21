/**
 * RLS isolation tests: verify Org A users cannot read Org B data.
 * Requires local Supabase running.
 *
 * Run with: INTEGRATION=true npx vitest run tests/integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createOrg, createUser, createRoom, createReservation, cleanup } from '../../factories'

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321'
const ANON_KEY =
  process.env['SUPABASE_ANON_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7W9fDQAanvgAfJ_4lZMziPWFyMZCZUlaTmg'

const skipIfNoLocalSupabase = process.env['INTEGRATION'] !== 'true' ? describe.skip : describe

skipIfNoLocalSupabase('RLS org isolation', () => {
  let org1Id: string
  let org2Id: string
  let org1UserEmail: string
  let org2RoomId: string
  let org2ReservationId: string

  beforeAll(async () => {
    const org1 = await createOrg({ display_name: 'Org 1' })
    const org2 = await createOrg({ display_name: 'Org 2' })
    org1Id = org1.id
    org2Id = org2.id

    const user1 = await createUser(org1Id, { role: 'user' })
    org1UserEmail = user1.email

    const room2 = await createRoom(org2Id, { name: 'Org 2 Secret Room' })
    org2RoomId = room2.id

    const adminUser2 = await createUser(org2Id, { role: 'org_admin' })
    const res = await createReservation(org2Id, org2RoomId, adminUser2.id)
    org2ReservationId = res.id
  })

  afterAll(async () => {
    await cleanup(org1Id)
    await cleanup(org2Id)
  })

  async function signInAsOrg1User() {
    const client = createClient(SUPABASE_URL, ANON_KEY)
    await client.auth.signInWithPassword({ email: org1UserEmail, password: 'TestPass1234!' })
    return client
  }

  it('org1 user cannot see org2 reservations', async () => {
    const client = await signInAsOrg1User()
    const { data } = await client.from('reservations').select('id').eq('id', org2ReservationId)
    expect(data).toEqual([])
  })

  it('org1 user cannot see org2 rooms', async () => {
    const client = await signInAsOrg1User()
    const { data } = await client.from('locations').select('id').eq('id', org2RoomId)
    expect(data).toEqual([])
  })

  it('org1 user can only see their own org reservations', async () => {
    const client = await signInAsOrg1User()
    const { data } = await client.from('reservations').select('org_id')
    for (const row of data ?? []) {
      expect((row as { org_id: string }).org_id).toBe(org1Id)
    }
  })
})
