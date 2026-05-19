-- =============================================================================
-- Nano Spaces — seed data
-- All UUIDs are hard-coded so cross-table references remain stable across resets.
-- Password for all seed users: NanoSeed2024!
-- =============================================================================

-- Require pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- TOS version
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.tos_versions (version, content_url, effective_at) VALUES
  ('1.0', 'https://nanospaces.app/legal/tos/v1.0', '2024-01-01 00:00:00+00');

-- ─────────────────────────────────────────────────────────────────────────────
-- Auth users  (inserted directly into auth schema for local seeding only)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES
  -- Super admin
  ('a0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000',
   'superadmin@nanospaces.app',
   crypt('NanoSeed2024!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated'),

  -- Acme Corp — org admin
  ('c0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000',
   'alice.admin@acmecorp.example',
   crypt('NanoSeed2024!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated'),

  -- Acme Corp — regular users (4)
  ('c0000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000',
   'bob.smith@acmecorp.example',
   crypt('NanoSeed2024!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000',
   'carol.jones@acmecorp.example',
   crypt('NanoSeed2024!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000000',
   'dave.hibernated@acmecorp.example',
   crypt('NanoSeed2024!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000000',
   'eve.suspended@acmecorp.example',
   crypt('NanoSeed2024!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated'),

  -- Globex Corp — org admin
  ('d0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000',
   'grace.admin@globexcorp.example',
   crypt('NanoSeed2024!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated'),

  -- Globex Corp — regular users (4)
  ('d0000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000',
   'hank.user@globexcorp.example',
   crypt('NanoSeed2024!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000',
   'iris.user@globexcorp.example',
   crypt('NanoSeed2024!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000000',
   'jake.user@globexcorp.example',
   crypt('NanoSeed2024!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000000',
   'kim.hibernated@globexcorp.example',
   crypt('NanoSeed2024!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- Organizations
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.organizations (
  id, name, slug, display_name,
  subscription_status, subscription_tier,
  tier_room_limit, tier_admin_limit, tier_user_limit,
  primary_timezone,
  tos_version_accepted, tos_accepted_at
) VALUES
  ('b0000000-0000-0000-0000-000000000001',
   'Acme Corp', 'acme-corp', 'Acme Corp',
   'active', 'starter', 5, 1, 100,
   'America/New_York', '1.0', now()),
  ('b0000000-0000-0000-0000-000000000002',
   'Globex Corp', 'globex-corp', 'Globex Corp',
   'active', 'growth', 20, 5, NULL,
   'America/Chicago', '1.0', now());

-- ─────────────────────────────────────────────────────────────────────────────
-- Super admin profile (no org_id)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (
  id, org_id, role, full_name, email,
  timezone, is_active, tos_accepted_at, tos_version_accepted
) VALUES
  ('a0000000-0000-0000-0000-000000000001',
   NULL, 'super_admin', 'Super Admin', 'superadmin@nanospaces.app',
   'UTC', true, now(), '1.0');

-- ─────────────────────────────────────────────────────────────────────────────
-- Acme Corp profiles
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (
  id, org_id, role, full_name, email,
  timezone, is_active, hibernate_status,
  tos_accepted_at, tos_version_accepted
) VALUES
  ('c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'org_admin', 'Alice Administrator', 'alice.admin@acmecorp.example',
   'America/New_York', true, 'active', now(), '1.0'),
  ('c0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001',
   'user', 'Bob Smith', 'bob.smith@acmecorp.example',
   'America/New_York', true, 'active', now(), '1.0'),
  ('c0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000001',
   'user', 'Carol Jones', 'carol.jones@acmecorp.example',
   'America/New_York', true, 'active', now(), '1.0'),
  ('c0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000001',
   'user', 'Dave Hibernated', 'dave.hibernated@acmecorp.example',
   'America/New_York', true, 'hibernated', now(), '1.0'),
  ('c0000000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000001',
   'user', 'Eve Suspended', 'eve.suspended@acmecorp.example',
   'America/New_York', false, 'active', now(), '1.0');

-- ─────────────────────────────────────────────────────────────────────────────
-- Globex Corp profiles
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (
  id, org_id, role, full_name, email,
  timezone, is_active, hibernate_status,
  tos_accepted_at, tos_version_accepted
) VALUES
  ('d0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002',
   'org_admin', 'Grace Administrator', 'grace.admin@globexcorp.example',
   'America/Chicago', true, 'active', now(), '1.0'),
  ('d0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000002',
   'user', 'Hank User', 'hank.user@globexcorp.example',
   'America/Chicago', true, 'active', now(), '1.0'),
  ('d0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000002',
   'user', 'Iris User', 'iris.user@globexcorp.example',
   'America/Chicago', true, 'active', now(), '1.0'),
  ('d0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000002',
   'user', 'Jake User', 'jake.user@globexcorp.example',
   'America/Chicago', true, 'active', now(), '1.0'),
  ('d0000000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000002',
   'user', 'Kim Hibernated', 'kim.hibernated@globexcorp.example',
   'America/Chicago', true, 'hibernated', now(), '1.0');

-- ─────────────────────────────────────────────────────────────────────────────
-- Locations — 3 per org
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.locations (
  id, org_id, name, description, type, capacity,
  min_notice_hours, cancel_notice_hours, max_advance_days,
  nano_buffer_mins, ghost_buster_enabled, ghost_buster_mins
) VALUES
  -- Acme rooms
  ('e0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'Conference Room A', '10-person boardroom with projector', 'room', 10,
   1, 2, 30, 5, true, 15),
  ('e0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001',
   'Focus Pod 1', 'Quiet single-person focus space', 'room', 1,
   0, 1, 14, 0, true, 10),
  ('e0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000001',
   'Training Room', 'Classroom-style with 20 seats', 'room', 20,
   24, 24, 60, 10, true, 20),

  -- Globex rooms
  ('e0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000002',
   'Innovation Hub', 'Open collaboration space', 'room', 15,
   1, 2, 60, 5, true, 15),
  ('e0000000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000002',
   'Executive Suite', 'Private exec meeting room', 'room', 8,
   4, 4, 60, 10, true, 20),
  ('e0000000-0000-0000-0000-000000000006',
   'b0000000-0000-0000-0000-000000000002',
   'Lab Space', 'Technical lab with workstations', 'room', 12,
   2, 4, 30, 5, true, 15);

-- ─────────────────────────────────────────────────────────────────────────────
-- Availability rules — Mon-Fri 08:00-18:00 for all rooms
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.availability_rules (id, location_id, day_of_week, open_time, close_time) VALUES
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', ARRAY[1,2,3,4,5], '08:00', '18:00'),
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000002', ARRAY[1,2,3,4,5], '07:00', '20:00'),
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000003', ARRAY[1,2,3,4,5], '09:00', '17:00'),
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000004', ARRAY[1,2,3,4,5], '08:00', '20:00'),
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000005', ARRAY[1,2,3,4,5], '08:00', '18:00'),
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000006', ARRAY[1,2,3,4,5], '09:00', '18:00');

-- ─────────────────────────────────────────────────────────────────────────────
-- Blackout dates
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.blackout_dates (id, org_id, title, start_time, end_time, created_by) VALUES
  (gen_random_uuid(),
   'b0000000-0000-0000-0000-000000000001',
   'Acme All-Hands Day',
   '2025-03-15 00:00:00+00', '2025-03-16 00:00:00+00',
   'c0000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(),
   'b0000000-0000-0000-0000-000000000002',
   'Globex Company Retreat',
   '2025-04-10 00:00:00+00', '2025-04-12 00:00:00+00',
   'd0000000-0000-0000-0000-000000000001');

-- ─────────────────────────────────────────────────────────────────────────────
-- Sample reservations — 5 for Acme, 5 for Globex
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.reservations (
  id, location_id, booked_by, org_id, title, start_time, end_time, status, checked_in
) VALUES
  -- Acme reservations
  ('f0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'Q1 Planning Meeting',
   '2025-03-10 09:00:00+00', '2025-03-10 11:00:00+00',
   'confirmed', true),
  ('f0000000-0000-0000-0000-000000000002',
   'e0000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001',
   'Deep Work Session',
   '2025-03-11 10:00:00+00', '2025-03-11 12:00:00+00',
   'confirmed', false),
  ('f0000000-0000-0000-0000-000000000003',
   'e0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000001',
   'Client Demo',
   '2025-03-12 14:00:00+00', '2025-03-12 15:30:00+00',
   'confirmed', false),
  ('f0000000-0000-0000-0000-000000000004',
   'e0000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'New Employee Orientation',
   '2025-03-20 09:00:00+00', '2025-03-20 17:00:00+00',
   'confirmed', false),
  ('f0000000-0000-0000-0000-000000000005',
   'e0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001',
   'Sprint Retrospective',
   '2025-03-07 15:00:00+00', '2025-03-07 16:00:00+00',
   'cancelled', false),

  -- Globex reservations
  ('f0000000-0000-0000-0000-000000000006',
   'e0000000-0000-0000-0000-000000000004',
   'd0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002',
   'Innovation Workshop',
   '2025-03-10 13:00:00+00', '2025-03-10 17:00:00+00',
   'confirmed', true),
  ('f0000000-0000-0000-0000-000000000007',
   'e0000000-0000-0000-0000-000000000005',
   'd0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000002',
   'Investor Meeting',
   '2025-03-11 09:00:00+00', '2025-03-11 10:30:00+00',
   'confirmed', false),
  ('f0000000-0000-0000-0000-000000000008',
   'e0000000-0000-0000-0000-000000000006',
   'd0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000002',
   'Lab Experiment Setup',
   '2025-03-12 08:00:00+00', '2025-03-12 12:00:00+00',
   'confirmed', false),
  ('f0000000-0000-0000-0000-000000000009',
   'e0000000-0000-0000-0000-000000000004',
   'd0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000002',
   'Team Sync',
   '2025-03-13 10:00:00+00', '2025-03-13 11:00:00+00',
   'confirmed', false),
  ('f0000000-0000-0000-0000-000000000010',
   'e0000000-0000-0000-0000-000000000005',
   'd0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002',
   'Board Prep Session',
   '2025-03-05 14:00:00+00', '2025-03-05 16:00:00+00',
   'confirmed', true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Sample activity log entries
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.activity_log (org_id, actor_id, action, target_type, target_id, details) VALUES
  ('b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   'reservation.created', 'reservation',
   'f0000000-0000-0000-0000-000000000001',
   '{"title":"Q1 Planning Meeting"}'::jsonb),
  ('b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000002',
   'reservation.created', 'reservation',
   'f0000000-0000-0000-0000-000000000005',
   '{"title":"Sprint Retrospective"}'::jsonb),
  ('b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   'reservation.cancelled', 'reservation',
   'f0000000-0000-0000-0000-000000000005',
   '{"reason":"rescheduled"}'::jsonb),
  ('b0000000-0000-0000-0000-000000000002',
   'd0000000-0000-0000-0000-000000000001',
   'reservation.created', 'reservation',
   'f0000000-0000-0000-0000-000000000006',
   '{"title":"Innovation Workshop"}'::jsonb);
