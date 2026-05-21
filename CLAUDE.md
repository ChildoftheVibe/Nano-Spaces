# CLAUDE.md

This file provides complete guidance for rebuilding or continuing development on Nano Spaces. Any coding agent reading this file should be able to reconstruct the full application state and continue from the current phase.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server on :3000
npm run build        # Production build
npm run start        # Start production server

# Code quality
npm run lint         # ESLint (TS/TSX/JS/JSX)
npm run lint:fix     # ESLint with auto-fix
npm run typecheck    # tsc --noEmit
npm run format       # Prettier write

# Supabase (requires `supabase start` first)
npx supabase start          # Start local Supabase stack
npx supabase db reset       # Reset DB + apply migrations + seed
npx supabase migration new <name>   # Create a new migration file
npx supabase gen types typescript --local > types/supabase.ts  # Regenerate DB types
./scripts/test-migrations.sh  # Full migration test (apply → verify → reset → verify)
```

Pre-commit hook runs `lint-staged`: ESLint + Prettier on staged `.ts/.tsx/.js/.jsx/.json/.css/.md` files.

---

## What This App Is

Nano Spaces is a production-ready **multi-tenant space-booking PWA**. Organizations sign up, invite users, and their users book shared rooms/buildings via a calendar UI. Billing is per-org on monthly PayPal subscriptions (Starter / Growth tiers).

**Stack:** Next.js 14 (App Router) · TypeScript strict · Supabase (Postgres + Auth + Storage) · Tailwind CSS · shadcn/ui · Sentry · Vercel deployment target.

---

## Build Phase History

Phases are listed in order. All phases through Phase 13 are complete.

### Phase 1 — Infrastructure (complete)

- TypeScript strict: `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`
- ESLint: `next/core-web-vitals` + `@typescript-eslint/recommended` + `security` + `jsx-a11y`
- Prettier: 2-space, single quotes, no semis, 100-char line, trailing commas
- Husky + lint-staged pre-commit hooks
- shadcn/ui primitives installed (button, card, input, label, dialog, dropdown-menu, select, separator, switch, table, tabs, toast, toaster, tooltip, badge)
- `lib/env.ts` — Zod env validation, all 27 vars, `WEB_PUSH_EMAIL` validated with `startsWith('mailto:')`
- `lib/api-response/` — `ApiSuccess<T>`, `ApiError`, `ApiResponse<T>`, `success()`, `failure()`, `withErrorHandling()`
- `lib/errors/AppError.ts` — `AppError` base + `ValidationError` (400), `AuthError` (401), `RateLimitError` (429), `NotFoundError` (404), `BookingConflictError`/`ConflictError` (409), `TierLimitError` (402), `ExternalServiceError` (502)
- `lib/retry.ts` — `withRetry` with exponential backoff; immediate throw on 4xx
- Sentry client/server/edge configs with PII scrubbing (email + full_name stripped)
- GitHub Actions CI: lint + typecheck + build jobs
- Full folder scaffold with `.gitkeep` files

### Phase 2 — Database Schema (complete)

24 migration files in `supabase/migrations/`. Applied in order `00001–00024`. Run `npx supabase db reset` to apply all.

| #     | File                        | What it creates                                                                                            |
| ----- | --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 00001 | `create_tos_versions`       | `tos_versions` lookup table                                                                                |
| 00002 | `create_organizations`      | `organizations` + slug-immutability trigger                                                                |
| 00003 | `create_profiles`           | `profiles` (1:1 with `auth.users`)                                                                         |
| 00004 | `create_locations`          | `locations` (bookable rooms/buildings)                                                                     |
| 00005 | `create_availability_rules` | `availability_rules` (open-hours per location)                                                             |
| 00006 | `create_blackout_dates`     | `blackout_dates` (org-level blocked periods)                                                               |
| 00007 | `create_reservations`       | `reservations` (bookings)                                                                                  |
| 00008 | `create_invitations`        | `invitations` (pending email invites)                                                                      |
| 00009 | `create_notifications`      | `notifications` (in-app bell)                                                                              |
| 00010 | `create_push_subscriptions` | `push_subscriptions` (VAPID web-push)                                                                      |
| 00011 | `create_invoices`           | `invoices` (PayPal billing records)                                                                        |
| 00012 | `create_activity_log`       | `activity_log` (audit trail)                                                                               |
| 00013 | `create_processed_webhooks` | `processed_webhooks` (webhook idempotency)                                                                 |
| 00014 | `enable_rls_and_helpers`    | RLS on all tables; `auth_org_id()` + `auth_role()` helpers                                                 |
| 00015 | `create_rls_policies`       | Per-table `org_isolation` + `super_admin_all` policies                                                     |
| 00016 | `create_indexes`            | Performance indexes across all tables                                                                      |
| 00017 | `create_rpc_functions`      | `create_reservation_with_locks`, `release_ghost_reservation` RPCs                                          |
| 00018 | `rls_remaining_tables`      | RLS on `tos_versions` (public read) + `processed_webhooks` (service-role only)                             |
| 00019 | `auth_additions`            | `totp_secret` column on profiles; `email_otp_codes` table                                                  |
| 00020 | `phase5`                    | `email_signature` on organizations; `org-logos` storage bucket                                             |
| 00021 | `phase6`                    | `trial_day7_sent`/`trial_day13_sent` on organizations; `invoices` storage bucket; billing + trial indexes  |
| 00022 | `phase7`                    | `reminder_sent`, `reminder_1h_sent` on reservations; `hibernate_status` on profiles; billing indexes       |
| 00023 | `phase8`                    | Updated `create_reservation_with_locks` RPC to accept `p_status text DEFAULT 'confirmed'`                  |
| 00024 | `phase9`                    | `waitlisted` status, `waitlist_expires_at` on reservations; `waitlist_enabled` on locations; waitlist RPCs |

**Seed data** (`supabase/seed.sql`): password for all seed users is `NanoSeed2024!`.

| User                   | Email                              | Role                              |
| ---------------------- | ---------------------------------- | --------------------------------- |
| Super admin            | `superadmin@nanospaces.app`        | `super_admin`                     |
| Acme admin             | `alice.admin@acmecorp.example`     | `org_admin` (Acme Corp, starter)  |
| Acme user              | `bob.smith@acmecorp.example`       | `user`                            |
| Acme user              | `carol.jones@acmecorp.example`     | `user`                            |
| Acme user (hibernated) | `dave.hibernated@acmecorp.example` | `user`                            |
| Globex admin           | `grace.admin@globex.example`       | `org_admin` (Globex Corp, growth) |

### Phase 3 — Auth System (complete)

Full authentication with 2FA enforcement on all protected routes.

**Auth pages** (`app/(auth)/`):

- `login/page.tsx` — email/password login, Turnstile shown after 3 failures
- `forgot-password/page.tsx` — send reset email
- `reset-password/page.tsx` — consume reset token
- `setup-totp/page.tsx` — TOTP enrollment (QR code + manual code)
- `setup-email-otp/page.tsx` — email OTP enrollment
- `verify-2fa/page.tsx` — 2FA challenge (TOTP or email OTP)
- `layout.tsx` — centered auth card shell

**Auth API routes** (`app/api/auth/`):

- `login/route.ts` — credentials + Turnstile → session + 2FA cookie
- `logout/route.ts` — clears session + 2FA cookie
- `forgot-password/route.ts` — rate-limited reset email via Resend
- `reset-password/route.ts` — token verification + password update
- `change-email/route.ts` — initiates email change with verification
- `verify-email/route.ts` — consumes email change token
- `accept-tos/route.ts` — records TOS acceptance on profile
- `sessions/route.ts` + `sessions/[id]/route.ts` — list + revoke Supabase sessions
- `totp/enroll/route.ts` — generate TOTP secret + QR
- `totp/verify-enroll/route.ts` — verify + activate TOTP
- `otp/send/route.ts` — send email OTP (login or enrollment)
- `2fa/verify/route.ts` — verify TOTP or email OTP, issue `ns_2fa` cookie
- `2fa/verify-email-otp-enroll/route.ts` — verify OTP for enrollment flow

**Auth libs** (`lib/auth/`):

- `2fa-token.ts` — stateless `ns_2fa` cookie: `base64url(userId):expireMs:HMAC`; Web Crypto API (edge-compatible), 8-hour TTL, verified in middleware
- `totp.ts` — TOTP secret generation + verification via `otplib`
- `otp.ts` — 6-digit email OTP: SHA-256-hashed in `email_otp_codes` table, 10-minute TTL
- `password.ts` — bcrypt-style validation helpers
- `turnstile.ts` — Cloudflare Turnstile server-side verification

**Middleware** (`middleware.ts`) — enforces in order:

1. Logged-in users → `/calendar` if hitting auth pages
2. Unauthenticated → `/login?next=...`
3. 2FA not enrolled → `/onboarding`
4. 2FA enrolled but no valid `ns_2fa` cookie → `/verify-2fa?userId=&method=&next=`
5. TOS not accepted → `/onboarding`
6. TOS version outdated → `/accept-tos`
7. Role check: `/super-admin` requires `super_admin`; `/org-admin` requires `org_admin` or `super_admin`
8. Subscription: `past_due`/`cancelled` outside grace period → `/paywall`

Protected prefixes: `/calendar`, `/settings`, `/admin`, `/org-admin`, `/super-admin`, `/onboarding`. The matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `api/auth`, `api/user`, and image files.

**Rate limits** (`lib/rate-limit/index.ts`) — Upstash Redis sliding-window, fails open on Redis error:

| Key              | Limit | Window |
| ---------------- | ----- | ------ |
| `login`          | 10    | 15 min |
| `twoFaVerify`    | 5     | 10 min |
| `otpSend`        | 3     | 10 min |
| `forgotPassword` | 3     | 60 min |
| `inviteSend`     | 20    | 60 min |
| `export`         | 1     | 24 h   |
| `default`        | 100   | 1 min  |

### Phase 4 — User Onboarding & Settings (complete)

**Pages:**

- `app/onboarding/page.tsx` — 4-step wizard: (1) timezone, (2) 2FA setup, (3) TOS acceptance, (4) email prefs (org_admin only). Step 2 redirects to `/setup-totp?next=/onboarding?step=3` or email-OTP equivalent. Middleware already gates unenrolled/TOS-missing users here.
- `app/(user)/settings/page.tsx` — 5 tabs: Profile (name, timezone, email change), Security (change password, 2FA method, active sessions), Preferences (email reminders, push notifications), Sessions (list + revoke), Data & Privacy (data export, account deletion request)
- `app/(user)/layout.tsx` — sticky header nav: Calendar · Settings
- `app/terms/page.tsx` — public Terms of Service v1.0
- `app/privacy/page.tsx` — public Privacy Policy (no-sale statement, data processor table, user rights)
- `app/accept-tos/page.tsx` — scroll-to-bottom gate for TOS re-acceptance on version bumps

**User API routes** (`app/api/user/`):

- `profile/route.ts` — GET/PATCH profile (name, timezone)
- `change-password/route.ts` — POST current + new password
- `push-key/route.ts` — GET VAPID public key
- `push-subscription/route.ts` — POST/DELETE VAPID subscription
- `export/route.ts` — GET rate-limited full data export (profile + reservations + notifications as ZIP)
- `delete-request/route.ts` — POST marks account for deletion

**Org email pref route:**

- `app/api/org/email-optin/route.ts` — PATCH `organizations.master_admin_email_optin` (org_admin only)

**TOS constant:** `lib/tos.ts` exports `CURRENT_TOS_VERSION = '1.0'`. Bump this constant and insert a new row in `tos_versions` to trigger re-acceptance for all users.

### Phase 5 — Org Management & Invitations (complete)

**Org-admin pages** (`app/(org-admin)/`):

- `layout.tsx` — sticky header nav: Calendar · Users · Rooms · Approvals · Org Settings · My Settings
- `users/page.tsx` — user management table: list users, toggle active/inactive, change role, remove
- `org-settings/page.tsx` — display name, timezone, email signature, logo upload (2MB, jpg/png/webp to `org-logos` bucket), org-wide announcement email send

**Invitation pages:**

- `app/join/page.tsx` — public join page, consumes `?token=` query param, creates account or links existing

**Org API routes** (`app/api/org/`):

- `settings/route.ts` — GET/PATCH org settings (display_name, primary_timezone, email_signature)
- `users/route.ts` — GET paginated user list
- `users/[id]/route.ts` — PATCH (role, is_active) + DELETE user
- `logo/route.ts` — POST upload org logo to `org-logos` Supabase Storage bucket
- `announce/route.ts` — POST send announcement email to all org users via Resend
- `email-optin/route.ts` — PATCH `master_admin_email_optin`

**Invitation API routes** (`app/api/invitations/`):

- `route.ts` — GET list invitations; POST create invitation (checks tier limits)
- `[id]/route.ts` — DELETE revoke invitation
- `send/route.ts` — POST (re)send invitation email
- `bulk-csv/route.ts` — POST parse CSV, create + send bulk invitations
- `validate/route.ts` — GET validate token (used by join page before account creation)
- `accept/route.ts` — POST accept invitation, create profile, link to org

**Tier limits** (`lib/tiers/index.ts`):

- `checkRoomLimit(orgId)` — checks `tier_room_limit` vs active locations count
- `checkAdminLimit(orgId)` — checks `tier_admin_limit` vs active org_admin count
- `checkUserLimit(orgId)` — checks `tier_user_limit` vs active profiles count
- Returns `{ allowed, current, limit }` — throw `TierLimitError` if `!allowed`

**Storage buckets:**

- `org-logos` — public read, authenticated write (2MB, jpg/png/webp)
- `invoices` — private (service-role only), signed-URL downloads via API

### Phase 6 — Billing Infrastructure (complete)

PayPal subscription billing with PDF invoices, webhook handling, and trial tracking.

**PayPal libs** (`lib/paypal/`):

- `client.ts` — OAuth2 access token (cached), `verifyWebhookSignature()`, `PLAN_TIER_MAP` (plan ID → tier name), `cancelSubscription()`
- `invoice.ts` — `generateInvoicePdf()` using `pdf-lib` (A4 PDF with brand header); `createAndStoreInvoice()` uploads to `invoices` bucket + sends email via Resend

**PayPal webhook** (`app/api/paypal/webhook/route.ts`):

- Verifies PayPal signature header
- Idempotency check against `processed_webhooks` table
- Handles events: `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.SUSPENDED`, `PAYMENT.SALE.COMPLETED` (creates invoice record + PDF)

**Email templates** (`lib/email/auth-templates.ts`):

- `otpEmailTemplate(code, purposeLabel)` — OTP code with 10-min expiry
- `passwordResetTemplate(link)` — reset link with 1-hour expiry
- `emailChangeTemplate(link)` — email change confirmation
- Invoice email template built inline in `invoice.ts`

**DB additions (migration 00021):**

- `organizations.trial_day7_sent` (boolean, default false)
- `organizations.trial_day13_sent` (boolean, default false)
- `invoices` private Storage bucket
- Index `idx_processed_webhooks_event_id`
- Index `idx_invoices_org_created`
- Index `idx_orgs_trial_ends` (partial, status='trial')
- Index `idx_orgs_expires_at` (partial, status='active')

### Phase 7 — Billing Completion (complete)

**Billing API routes** (`app/api/billing/`):

- `subscribe/route.ts` — POST create PayPal subscription, update org `subscription_status`/`paypal_subscription_id`/`paypal_plan_id`
- `cancel/route.ts` — POST cancel via `cancelSubscription()`, set grace period
- `trial-reminder/route.ts` — cron: day-7 + day-13 trial nudge emails (`trial_day7_sent`/`trial_day13_sent` flags), secured by `CRON_SECRET`
- `trial-expire/route.ts` — cron: set `subscription_status='expired'` for trials past `trial_ends_at`, secured by `CRON_SECRET`
- `subscription-reminder/route.ts` — cron: payment reminder emails, secured by `CRON_SECRET`

**Super-admin:**

- `app/api/super-admin/orgs/route.ts` — GET list all orgs with subscription state (super_admin only)

**Billing UI:**

- `app/(user)/settings/billing/page.tsx` — plan details, upgrade/downgrade, invoice history with signed-URL PDF downloads, cancel subscription

**Room management UI** (`app/(org-admin)/rooms/page.tsx`):

- Room cards grid with status badges (Active / Maintenance / Inactive)
- Modals: Add/Edit Room, Booking Settings (buffer, ghost-buster, limits), Availability Rule Builder (day toggles + time range + US holiday block), Blackout Dates (list/add/delete with recurring RRULE support), Maintenance Mode (toggle + date range + reason)
- Photo upload via `POST /api/rooms/[id]/photo`
- Tier limit banner when at room cap

---

### Phase 8 — Calendar & Booking UI (complete)

**Calendar pages:**

- `app/(user)/calendar/page.tsx` — SSR-safe shell (`dynamic(..., { ssr: false })`)
- `app/(user)/calendar/calendar-client.tsx` — FullCalendar v6 (dayGrid + timeGrid + interaction plugins), month/week/day views, user timezone via `date-fns-tz`, custom nav toolbar, room filter, Export button

**Calendar display rules:**

- My bookings: solid blue (`event-mine`)
- Others' bookings: light blue (`event-confirmed`)
- Blocked/blackout/maintenance: light red (`event-blocked`, `display:'background'`)
- Buffer zones: gray background (`display:'background'`, `backgroundColor:'#E5E7EB'`)

**New Reservation modal:** react-hook-form + Zod, fields: Room, Title, Notes, Date, Start/End Time (local). Converts local → UTC via `fromZonedTime` before `POST /api/reservations`.

**Reservation view modal:** edit title/notes inline, cancel with confirmation dialog, Add to Calendar (.ics), Copy (pre-fills new booking modal).

**ICS export:** single event (`createEvent`) + bulk upcoming (`createEvents`), `startInputType: 'utc'` for Google Calendar/Outlook compatibility, client-side only.

**API routes:**

- `app/api/reservations/route.ts` — GET (all org members, returns reservations + blackouts + maintenanceWindows with `nano_buffer_mins` per reservation); POST (full validation chain: min_notice, max_advance, max_duration, availability rules, blackout overlap, nano-buffer, max-per-day, atomic RPC `create_reservation_with_locks`, confirmation email)
- `app/api/reservations/[id]/route.ts` — PUT edit title/notes (owner or admin); DELETE cancel with `cancel_notice_hours` check (users only; admins bypass), notifies + emails booker if admin-cancelled
- `app/api/calendar/rooms/route.ts` — GET active non-maintenance rooms for all org members; includes `waitlist_enabled` field

**DB migration (`supabase/migrations/20240101000023_phase8.sql`):**

- Updated `create_reservation_with_locks` RPC to accept `p_status text DEFAULT 'confirmed'`; inserts notification with type based on status

**Email templates added** (`lib/email/auth-templates.ts`):

- `bookingConfirmationTemplate(userName, bookingTitle, roomName, startTime, endTime, isPending)`
- `bookingCancellationTemplate(userName, bookingTitle, roomName, startTime, cancelledByAdmin)`

---

### Phase 9 — Recurring Reservations, Waitlist, Approval & Check-in (complete)

**Recurring reservations:**

- `generateRecurringInstances(base, rule)` — produces instance list from a frequency rule (daily / weekly / custom day-of-week with `count` or `until` end)
- Each instance shares a `recurring_group_id` UUID so the series can be cancelled together
- DST shift detection (`detectDstShift()`) warns when a recurring series crosses a DST boundary
- Cancel series: DELETE `?cancel_series=true` cancels all future instances with the same `recurring_group_id`

**Waitlist:**

- Rooms have `waitlist_enabled` boolean (toggle in Booking Settings modal)
- When a booking conflicts and `waitlist_enabled`, POST `/api/reservations` with `waitlist: true` creates a `status='waitlisted'` reservation
- `advance_expired_waitlist()` RPC: expires holds past `waitlist_expires_at`, promotes next waiter to a 30-minute hold window
- `process_waitlist_slot(locationId, startTime, endTime)` RPC: called after every cancellation/release to promote the next waiter
- `confirm_from_waitlist(reservationId)` RPC: atomically confirms a waitlisted hold; returns `WAITLIST_EXPIRED` or `BOOKING_CONFLICT` on failure
- `/api/reservations/[id]/confirm-waitlist/route.ts` — POST: calls the RPC, handles error codes

**Approval workflow:**

- Rooms have `approval_required` boolean
- Bookings on approval-required rooms get `status='pending'` instead of `confirmed`
- `app/(org-admin)/approvals/page.tsx` — lists all pending reservations; Approve button → `POST /api/reservations/[id]/approve`; Reject button → dialog with reason → `POST /api/reservations/[id]/reject`
- `/api/reservations/[id]/approve/route.ts` — admin-only; sets `status='confirmed'`, sends in-app notification + `approvalStatusTemplate` email
- `/api/reservations/[id]/reject/route.ts` — admin-only; sets `status='cancelled'`, sends notification + email with reason

**Check-in:**

- `/api/reservations/[id]/checkin/route.ts` — POST: owner or admin; validates 10-minute pre-start window; sets `checked_in=true`, `checked_in_at=now()`
- `app/checkin/page.tsx` — public page at `/checkin?reservation_id=xxx`; loads reservation, shows booking details, check-in button (10-min window guard)
- Calendar `QrModal`: generates QR code via `QRCodeSVG` pointing to `/checkin?reservation_id=...`

**Calendar UI updates** (`calendar-client.tsx`):

- `NewBookingModal`: on 409 + `waitlist_enabled`, shows orange "Join Waitlist" prompt; re-submits with `waitlist: true`
- `ReservationModal`: check-in button (green, 10 min before start), waitlist hold banner (orange countdown to `waitlist_expires_at`), confirm-waitlist button, cancel-series dialog, QR code button
- `WaitlistConfirmModal`: shown when URL has `?activate_waitlist=<id>` — calls confirm-waitlist then refreshes calendar
- `RecurringSection`: frequency picker (daily/weekly/custom), day-of-week toggles, end by count or date, DST warning badge
- Event classes: `event-pending` / `event-pending-mine` (dashed amber border), `event-waitlisted` / `event-waitlisted-mine` (orange), buffer zones as gray background events with tooltip "N-minute buffer — room resetting"

**DB migration (`supabase/migrations/20240101000024_phase9.sql`):**

- Adds `waitlisted` to reservations status check constraint
- Adds `waitlist_expires_at timestamptz` to reservations
- Adds `waitlist_enabled boolean NOT NULL DEFAULT false` to locations
- Indexes: `idx_reservations_waitlisted`, `idx_reservations_waitlist_expires`, `idx_reservations_recurring_group`, `idx_reservations_pending_org`
- RPCs: `activate_next_waitlist`, `process_waitlist_slot`, `advance_expired_waitlist`, `confirm_from_waitlist`

**Email templates added** (`lib/email/auth-templates.ts`):

- `waitlistAvailableTemplate(userName, bookingTitle, roomName, startTime, bookNowUrl)`
- `approvalStatusTemplate(userName, bookingTitle, roomName, startTime, approved, reason?)`
- `recurringSeriesTemplate(userName, bookingTitle, roomName, instances)`

---

### Phase 10 — Cron Jobs & Scheduled Automation (complete)

All cron routes are in `app/api/cron/`. They use raw `Response.json()` (not `withErrorHandling`) and are authenticated via `verifyCronSecret(req)` from `lib/auth/cron.ts` (checks `Authorization: Bearer <CRON_SECRET>`).

**Cron routes:**

- `nano-pulse/route.ts` — daily: finds profiles inactive >30 days (`last_active_at < now()-30d`, `hibernate_status='active'`); sets `hibernate_status='hibernated'`, flags future reservations, emails `hibernationNoticeTemplate`, logs to `activity_log`
- `ghost-buster/route.ts` — every 5 min: fetches `ghost_buster_enabled=true` locations; finds confirmed+unchecked-in reservations past the ghost window; calls `release_ghost_reservation()` RPC, emails `ghostBusterReleaseTemplate`, calls `process_waitlist_slot()` to promote next waiter
- `send-reminders/route.ts` — daily at 9am: 24h reminder window (`start_time` between `now()+23h` and `now()+25h`); respects `email_reminders=true` and `reminder_timing IN ('24h','both')`; sets `reminder_sent=true`
- `send-reminders-1h/route.ts` — hourly: 1h reminder window (`start_time` between `now()+50min` and `now()+70min`); respects `reminder_timing IN ('1h','both')`; sets `reminder_1h_sent=true`
- `waitlist-notify/route.ts` — every 15 min: calls `advance_expired_waitlist()` RPC; finds active holds set within last 20 min (`waitlist_expires_at > now()`, recently set); emails `waitlistAvailableTemplate` with `bookNowUrl = /calendar?activate_waitlist=<id>`
- `trial-reminders/route.ts` — daily at 10am: day-7 reminder (`trial_starts_at <= now()-7d`, `trial_day7_sent=false`); day-13 reminder (`trial_starts_at <= now()-13d`, `trial_day13_sent=false`); expires ended trials → `subscription_status='inactive'`; uses `admin.auth.admin.getUserById()` to get email (NOT profiles table)
- `subscription-reminders/route.ts` — daily at 10am: expires grace periods (`subscription_status='grace'`, `grace_period_ends_at < now()` → `expired`); sends 7d/3d/1d renewal reminders using ±0.5d windows around `subscription_expires_at`
- `weekly-digest/route.ts` — Mondays at 8am: orgs with `subscription_status IN ('active','trial')`; compiles 5 stats (new bookings, cancellations, ghost no-shows via `activity_log.action='reservation.ghost_released'`, pending count, new users); sends `weeklyDigestTemplate` to all org_admins
- `notification-cleanup/route.ts` — daily at 3am: deletes `notifications` older than 30 days
- `data-retention-purge/route.ts` — weekly Sundays at 4am: deletes cancelled reservations >2 years old (uses `.or()` for null `cancelled_at` fallback to `created_at`); deletes `activity_log` entries >1 year old

**Email templates added** (`lib/email/auth-templates.ts`):

- `hibernationNoticeTemplate(userName, orgName)`
- `ghostBusterReleaseTemplate(userName, bookingTitle, roomName, startTime)`
- `bookingReminderTemplate(userName, bookingTitle, roomName, startTime, endTime, window: '24h' | '1h')`
- `weeklyDigestTemplate(orgName, weekLabel, stats)` — stats table with 5 metrics

**Vercel cron configuration** (`vercel.json`):

```json
{
  "crons": [
    { "path": "/api/cron/nano-pulse", "schedule": "0 2 * * *" },
    { "path": "/api/cron/ghost-buster", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/send-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/send-reminders-1h", "schedule": "0 * * * *" },
    { "path": "/api/cron/waitlist-notify", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/trial-reminders", "schedule": "0 10 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 10 * * *" },
    { "path": "/api/cron/weekly-digest", "schedule": "0 8 * * 1" },
    { "path": "/api/cron/notification-cleanup", "schedule": "0 3 * * *" },
    { "path": "/api/cron/data-retention-purge", "schedule": "0 4 * * 0" }
  ]
}
```

---

### Phase 11 — God Mode, Audit Trail & Admin Panels (complete)

#### 1. God Mode Override

- **Calendar UI** (`app/(user)/calendar/calendar-client.tsx`): "God Mode Override" toggle in `NewBookingModal` for `org_admin`/`super_admin` roles. Toggle opens an inline confirmation dialog requiring a typed reason (≥10 chars). When confirmed, submits to `/api/reservations/god-mode` instead of the normal endpoint. Active god-mode turns the Book button red ("Book (God Mode)"). `🛡` shield prefix shown on calendar events with `god_mode_override=true`.
- **API route** `POST /api/reservations/god-mode`: admin-only; cancels all conflicting `pending`/`confirmed` reservations (`cancellation_reason='Admin priority override'`), auto-waitlists each displaced user for the same slot, emails them via `godModeDisplacedTemplate`, creates the new `god_mode_override=true` booking, logs to `activity_log`.
- **Email templates** in `lib/email/auth-templates.ts`: `godModeDisplacedTemplate`, `auditTamperAlertTemplate`

#### 2. Super Admin God Mode Audit Report

- **Page** `app/(super-admin)/god-mode-audit/page.tsx` — filterable table across all orgs; columns: Date, Org, Admin, Room, Booking Title, Reason, Users Displaced; CSV export
- **Layout** `app/(super-admin)/layout.tsx` — sticky header with God Mode Audit and Marketing links
- **API route** `GET /api/super-admin/god-mode-audit?org_id=&from=&to=`

#### 3. Activity Log Viewer (Org Admin)

- **Page** `app/(org-admin)/activity-log/page.tsx` — filterable table: action type, date range; paginated (50/page); read-only
- **API route** `GET /api/org/activity-log?page=&action=&actor=&from=&to=`
- "Activity Log" link added to `app/(org-admin)/layout.tsx` nav

#### 4. Hash Chain Tamper Detection

- **Table** `audit_chain` in migration `20240101000025_phase11.sql`; RLS service-role only
- **Cron route** `app/api/cron/audit-chain/route.ts` — nightly SHA-256 chain over `activity_log`; sets `tamper_detected=true` and emails Super Admin on mismatch
- Added to `vercel.json`: `{ "path": "/api/cron/audit-chain", "schedule": "0 1 * * *" }`

#### 5. Org-Wide Announcement

`POST /api/org/announce` + UI in `app/(org-admin)/org-settings/page.tsx` — complete.

#### 6. Super Admin Marketing Panel

- **Page** `app/(super-admin)/marketing/page.tsx` — lists org admins with `master_admin_email_optin=true`; CSV export; No-Sale Policy reminder
- **API route** `GET /api/super-admin/marketing-opt-ins`

#### DB migration (`supabase/migrations/20240101000025_phase11.sql`)

- `reservations`: `god_mode_override boolean NOT NULL DEFAULT false`, `god_mode_reason text`, `god_mode_by uuid FK → profiles`, `original_booker_id uuid FK → profiles`, `title_fts tsvector GENERATED`
- `audit_chain` table with RLS (service-role only; super_admin reads via admin client)
- Indexes: `idx_reservations_god_mode` (partial, `god_mode_override=true`), `idx_audit_chain_org`, `idx_reservations_title_fts` (GIN)

**Profile API:** `GET /api/user/profile` added (returns `id, full_name, timezone, role, email_reminders, reminder_timing`); previously only `PATCH` existed.

---

### Phase 12 — Notifications UI, Push & Global Search (complete)

#### 1. In-App Notification Center

- **Component** `components/features/notifications/notification-bell.tsx` — Bell icon with red unread badge (capped at 99+); click opens slide-out panel; each notification shows icon (by type), title, 2-line body, relative timestamp, unread highlight; click marks read + navigates to `action_url`; "Mark all read" button; load-more pagination (25/page); 30s polling for unread count
- **API routes** `app/api/notifications/` — `GET` (list + unread count), `PATCH [id]` (mark read), `POST mark-all-read`
- Wired into all three layouts: user, org-admin, super-admin

#### 2. PWA Push Notifications

- **`lib/push/send.ts`** — `sendPushToUser(userId, payload)`: fetches user's push subscriptions, calls `web-push` for each, auto-deletes stale endpoints (410/404 responses)
- **`public/sw.js`** — service worker: handles `push` event (shows notification), `notificationclick` (opens action URL)
- **Service worker registration** in `app/(user)/settings/page.tsx`: permission request → VAPID key fetch → `navigator.serviceWorker.register('/sw.js')` → subscribe → `POST /api/user/push-subscription`; unsubscribe on toggle-off
- **Payload format**: `{ title, body, icon: '/icon-192.png', url: action_url }`

#### 3. Global Search

- **Component** `components/features/search/global-search.tsx` — Cmd+K / Ctrl+K trigger; 300ms debounce; results grouped by Reservations / Rooms / Users with icons; super admin org filter dropdown (self-fetches org list via `/api/super-admin/orgs`); Esc to close
- **API route** `app/api/search/route.ts` — FTS via `title_fts` (reservations), `name_fts` (locations), `full_name_fts` (profiles); RLS-scoped by `org_id`; super admin can search across all orgs; users section admin-only; email enriched via `auth.admin.listUsers()`
- Wired into all three layouts; super-admin layout passes `isSuperAdmin`

#### FTS indexes (from migration 00016)

- `reservations.title_fts` GIN index
- `locations.name_fts` GIN index
- `profiles.full_name_fts` GIN index

---

### Phase 13 — Reporting Suite (complete)

All reports live at `app/(org-admin)/reports/page.tsx` — a single tabbed client page accessible to both `org_admin` and `super_admin`. Super admins get an org selector dropdown on every tab (auto-detected via `/api/super-admin/orgs`). All Excel exports use SheetJS (`xlsx` package) with formatted headers (blue fill, bold white text), frozen header rows, and explicit column widths. "Reports" link added to both `app/(org-admin)/layout.tsx` and `app/(super-admin)/layout.tsx`.

**API routes** (`app/api/reports/`):

- `monthly-reservations/route.ts` — `GET ?month=YYYY-MM&org_id=`: all reservations in the month with booker name, canceller name, room name, god-mode flag
- `user-history/route.ts` — `GET ?user_id=&org_id=`: all reservations for a specific user (up to 500); also returns org user list for the selector dropdown
- `utilization/route.ts` — `GET ?org_id=`: per-room booked vs available hours over the next 30 days, derived from `availability_rules` and confirmed/pending reservations
- `peak-hours/route.ts` — `GET ?org_id=`: 24×7 grid (hour-of-day × Mon–Sun) of booking counts from the last 90 days
- `ghost-buster/route.ts` — `GET ?month=YYYY-MM&org_id=`: ghost-released reservations from `activity_log` where `action='reservation.ghost_released'`, grouped by room

**Org data export** (`app/api/org/export/route.ts`):

- `GET`: org admin only; rate-limited 1 per 24h per org (key `org:<orgId>`); returns a ZIP (built with the existing `lib/zip.ts` helper) containing `reservations.csv`, `users.csv`, `rooms.csv`, `blackouts.csv`, `README.txt`

**Tab details:**

| Tab          | Visualisation                                                                         | Excel export    |
| ------------ | ------------------------------------------------------------------------------------- | --------------- |
| Monthly      | Table: Date, Time, Room, Booked By, Title, Status, Cancelled By, Reason, God Mode     | ✓ formatted     |
| User History | Table: same columns per-user; user selector dropdown                                  | ✓ formatted     |
| Utilization  | CSS bar chart, colour-coded by threshold (<25% gray, <50% blue, <75% amber, ≥75% red) | ✓ formatted     |
| Peak Hours   | 24×7 heatmap grid with 5-shade blue intensity + legend                                | ✓ formatted     |
| Ghost Buster | Expandable accordion per room showing individual no-shows                             | ✓ formatted     |
| Data Export  | One-click ZIP download with rate-limit feedback                                       | ZIP (CSV files) |

---

## What Remains to Build

All phases 1–13 are complete. The app is feature-complete.

---

## Architecture Reference

### Multi-tenant Model

Every user belongs to an `organization`. Data isolation enforced by Postgres RLS — anon-key clients never see rows outside the user's `org_id`. The `profiles` table joins `auth.users` to application data (role, org, TOS, 2FA, lockout).

Three roles: `user`, `org_admin`, `super_admin`. Super admin has `org_id = NULL` and sees all orgs.

### Supabase Clients (`lib/supabase/`)

- `createSessionClient()` — async, reads/writes cookies, respects RLS. Use in Server Components and API routes.
- `createAdminClient()` — service-role key, bypasses RLS. Use only in trusted server contexts (auth routes, cron, webhooks).
- `createBrowserClient()` — singleton browser client, anon key + cookie session. Use in Client Components.

After login, the API route returns session tokens and the client page calls `supabase.auth.setSession()` to hydrate cookies before redirecting.

### API Route Pattern

Every route must be wrapped with `withErrorHandling` from `lib/api-response/handler.ts`:

```ts
// success: { success: true, data: T }
// failure: { success: false, error: { code, message, requestId, details? } }
```

Throw `AppError` subclasses to produce typed HTTP errors. Unhandled exceptions are caught, reported to Sentry, and returned as 500.

### Environment Validation

Import `env` from `@/lib/env`. Never read `process.env` directly. The Zod schema requires 27 variables — see `.env.example`.

### UI Components

shadcn/ui primitives in `components/ui/`. Feature components in `components/features/<domain>/`. Layout components in `components/layout/`.

Fonts: `Plus_Jakarta_Sans` (heading, CSS var `--font-jakarta`) and `Inter` (body, CSS var `--font-inter`). Brand color: `#4F7EFA`.

### Key Domain Tables

| Table                | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| `organizations`      | Tenants; subscription status/tier, seat limits, trial tracking |
| `profiles`           | User data, role, 2FA config, lockout, hibernate status         |
| `locations`          | Bookable spaces per org; capacity, buffer, ghost-buster config |
| `reservations`       | Bookings; created via `create_reservation_with_locks` RPC      |
| `availability_rules` | Per-location open hours (day_of_week array + time range)       |
| `blackout_dates`     | Org-level blocked periods                                      |
| `invitations`        | Pending email invites with token hash                          |
| `notifications`      | In-app bell notifications per user                             |
| `push_subscriptions` | VAPID web-push endpoint registrations                          |
| `invoices`           | PayPal billing records with PDF storage                        |
| `activity_log`       | Audit trail per org                                            |
| `email_otp_codes`    | Short-lived OTP codes (service-role only)                      |
| `tos_versions`       | ToS version lookup (public read)                               |
| `processed_webhooks` | Webhook idempotency (service-role only)                        |

Regenerate `types/supabase.ts` whenever the schema changes: `npx supabase gen types typescript --local > types/supabase.ts`

### External Services

| Service              | Purpose                                                   | Config vars                                                                                                                              |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Resend               | Transactional email                                       | `RESEND_API_KEY`                                                                                                                         |
| PayPal               | Subscription billing (Starter / Growth)                   | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_STARTER_PLAN_ID`, `PAYPAL_GROWTH_PLAN_ID`, `PAYPAL_ENVIRONMENT` |
| Upstash Redis        | Rate limiting (sliding-window)                            | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                                                                     |
| Cloudflare Turnstile | Bot protection after 3 failed logins                      | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                                                                                 |
| Sentry               | Error tracking + performance                              | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`                                                                                                        |
| VAPID                | Web push notifications                                    | `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_EMAIL`                                                                          |
| Cron secret          | Secures `/api/billing/*` and `/api/cron/*` cron endpoints | `CRON_SECRET`                                                                                                                            |

### Local Supabase

`supabase/config.toml` — Postgres 17, local studio on :54323, inbucket email testing on :54324.

---

## Coding Conventions

These are hard rules. Every file must follow them.

- **Naming:** files=kebab-case, React components=PascalCase, functions=camelCase verb-first, constants=SCREAMING_SNAKE_CASE, booleans prefix `is`/`has`/`can`/`should`
- **TypeScript:** No `any` — use `unknown` + type guards. No `@ts-ignore` — use `@ts-expect-error` with explanation. `exactOptionalPropertyTypes=true`, `noUncheckedIndexedAccess=true`.
- **Async:** Always `async/await` — never `.then()` chains.
- **API routes:** Every route must be wrapped with `withErrorHandling()`. Throw `AppError` subclasses, never raw errors.
- **Env vars:** Always import from `@/lib/env`. Never `process.env`.
- **Comments:** None except for non-obvious WHY (hidden constraints, subtle invariants, workarounds). Never describe WHAT the code does.
- **Error handling:** No fallbacks or validation for scenarios that can't happen. Only validate at system boundaries.
- **No premature abstraction:** Three similar lines is better than a helper that doesn't earn its weight.
