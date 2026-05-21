/**
 * Test data factories for integration tests.
 * Requires local Supabase running: npx supabase start
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0'

export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let counter = 0
function uid(): string {
  return `test-${Date.now()}-${++counter}`
}

export interface TestOrg {
  id: string
  slug: string
  display_name: string
}

export async function createOrg(
  overrides: Partial<{ display_name: string; subscription_tier: string }> = {},
): Promise<TestOrg> {
  const slug = `org-${uid()}`
  const { data, error } = await adminClient
    .from('organizations')
    .insert({
      name: overrides.display_name ?? `Test Org ${uid()}`,
      display_name: overrides.display_name ?? `Test Org ${uid()}`,
      slug,
      subscription_status: 'active',
      subscription_tier: overrides.subscription_tier ?? 'starter',
      tier_user_limit: 10,
      tier_room_limit: 3,
      tier_admin_limit: 2,
    })
    .select('id, slug, display_name')
    .single()

  if (error) throw new Error(`createOrg failed: ${error.message}`)
  return data as TestOrg
}

export interface TestUser {
  id: string
  email: string
  orgId: string
  role: string
}

export async function createUser(
  orgId: string,
  overrides: Partial<{ role: string; email: string; is_active: boolean }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `user-${uid()}@test.example.com`

  // Create auth user
  const {
    data: { user },
    error: authErr,
  } = await adminClient.auth.admin.createUser({
    email,
    password: 'TestPass1234!',
    email_confirm: true,
  })
  if (authErr || !user) throw new Error(`createUser auth failed: ${authErr?.message}`)

  // Create profile
  const { error: profileErr } = await adminClient.from('profiles').insert({
    id: user.id,
    org_id: orgId,
    full_name: `Test User ${uid()}`,
    email,
    role: overrides.role ?? 'user',
    is_active: overrides.is_active ?? true,
    totp_enrolled: false,
    tos_accepted_at: new Date().toISOString(),
    tos_version_accepted: '1.0',
  })
  if (profileErr) throw new Error(`createUser profile failed: ${profileErr.message}`)

  return { id: user.id, email, orgId, role: overrides.role ?? 'user' }
}

export interface TestRoom {
  id: string
  name: string
  orgId: string
}

export async function createRoom(
  orgId: string,
  overrides: Partial<{ name: string; approval_required: boolean; waitlist_enabled: boolean }> = {},
): Promise<TestRoom> {
  const name = overrides.name ?? `Room ${uid()}`
  const { data, error } = await adminClient
    .from('locations')
    .insert({
      org_id: orgId,
      name,
      type: 'meeting_room',
      is_active: true,
      capacity: 10,
      min_notice_hours: 0,
      max_advance_days: 30,
      nano_buffer_mins: 0,
      ghost_buster_enabled: false,
      ghost_buster_mins: 15,
      approval_required: overrides.approval_required ?? false,
      cancel_notice_hours: 0,
      waitlist_enabled: overrides.waitlist_enabled ?? false,
    })
    .select('id, name')
    .single()

  if (error) throw new Error(`createRoom failed: ${error.message}`)

  // Add default availability rule (Mon-Fri 08:00-18:00)
  await adminClient.from('availability_rules').insert({
    location_id: (data as { id: string }).id,
    day_of_week: [1, 2, 3, 4, 5],
    open_time: '08:00',
    close_time: '18:00',
    block_holidays: false,
  })

  return { id: (data as { id: string }).id, name, orgId }
}

export interface TestReservation {
  id: string
  locationId: string
  bookedBy: string
  startTime: string
  endTime: string
  status: string
}

export async function createReservation(
  orgId: string,
  locationId: string,
  bookedBy: string,
  overrides: Partial<{
    startTime: string
    endTime: string
    status: string
    title: string
  }> = {},
): Promise<TestReservation> {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)

  const endTime = new Date(tomorrow)
  endTime.setHours(11, 0, 0, 0)

  const startTime = overrides.startTime ?? tomorrow.toISOString()
  const endTimeStr = overrides.endTime ?? endTime.toISOString()

  const { data, error } = await adminClient
    .from('reservations')
    .insert({
      org_id: orgId,
      location_id: locationId,
      booked_by: bookedBy,
      title: overrides.title ?? `Test Booking ${uid()}`,
      start_time: startTime,
      end_time: endTimeStr,
      status: overrides.status ?? 'confirmed',
    })
    .select('id, status')
    .single()

  if (error) throw new Error(`createReservation failed: ${error.message}`)

  return {
    id: (data as { id: string }).id,
    locationId,
    bookedBy,
    startTime,
    endTime: endTimeStr,
    status: (data as { status: string }).status,
  }
}

export async function cleanup(orgId: string): Promise<void> {
  // Delete in dependency order
  await adminClient.from('activity_log').delete().eq('org_id', orgId)
  await adminClient.from('notifications').delete().eq('org_id', orgId)
  await adminClient.from('reservations').delete().eq('org_id', orgId)
  await adminClient
    .from('availability_rules')
    .delete()
    .in(
      'location_id',
      (await adminClient.from('locations').select('id').eq('org_id', orgId)).data?.map(
        (r) => (r as { id: string }).id,
      ) ?? [],
    )
  await adminClient.from('locations').delete().eq('org_id', orgId)
  await adminClient.from('invitations').delete().eq('org_id', orgId)
  // Delete profiles and auth users
  const { data: profiles } = await adminClient.from('profiles').select('id').eq('org_id', orgId)
  for (const p of profiles ?? []) {
    await adminClient.auth.admin.deleteUser((p as { id: string }).id)
  }
  await adminClient.from('organizations').delete().eq('id', orgId)
}
