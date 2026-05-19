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

Phases are listed in order. All phases through Phase 6 are complete unless marked otherwise. Use this when deciding what to build next.

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

21 migration files in `supabase/migrations/`. Applied in order `00001–00021`. Run `npx supabase db reset` to apply all.

| #     | File                        | What it creates                                                                                           |
| ----- | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| 00001 | `create_tos_versions`       | `tos_versions` lookup table                                                                               |
| 00002 | `create_organizations`      | `organizations` + slug-immutability trigger                                                               |
| 00003 | `create_profiles`           | `profiles` (1:1 with `auth.users`)                                                                        |
| 00004 | `create_locations`          | `locations` (bookable rooms/buildings)                                                                    |
| 00005 | `create_availability_rules` | `availability_rules` (open-hours per location)                                                            |
| 00006 | `create_blackout_dates`     | `blackout_dates` (org-level blocked periods)                                                              |
| 00007 | `create_reservations`       | `reservations` (bookings)                                                                                 |
| 00008 | `create_invitations`        | `invitations` (pending email invites)                                                                     |
| 00009 | `create_notifications`      | `notifications` (in-app bell)                                                                             |
| 00010 | `create_push_subscriptions` | `push_subscriptions` (VAPID web-push)                                                                     |
| 00011 | `create_invoices`           | `invoices` (PayPal billing records)                                                                       |
| 00012 | `create_activity_log`       | `activity_log` (audit trail)                                                                              |
| 00013 | `create_processed_webhooks` | `processed_webhooks` (webhook idempotency)                                                                |
| 00014 | `enable_rls_and_helpers`    | RLS on all tables; `auth_org_id()` + `auth_role()` helpers                                                |
| 00015 | `create_rls_policies`       | Per-table `org_isolation` + `super_admin_all` policies                                                    |
| 00016 | `create_indexes`            | Performance indexes across all tables                                                                     |
| 00017 | `create_rpc_functions`      | `create_reservation_with_locks`, `release_ghost_reservation` RPCs                                         |
| 00018 | `rls_remaining_tables`      | RLS on `tos_versions` (public read) + `processed_webhooks` (service-role only)                            |
| 00019 | `auth_additions`            | `totp_secret` column on profiles; `email_otp_codes` table                                                 |
| 00020 | `phase5`                    | `email_signature` on organizations; `org-logos` storage bucket                                            |
| 00021 | `phase6`                    | `trial_day7_sent`/`trial_day13_sent` on organizations; `invoices` storage bucket; billing + trial indexes |

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

- `layout.tsx` — sticky header nav: Calendar · Users · Org Settings · My Settings
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

**Scaffolded (empty, to be implemented):**

- `app/api/billing/subscribe/` — POST initiate PayPal subscription
- `app/api/billing/cancel/` — POST cancel subscription
- `app/api/billing/subscription-reminder/` — cron endpoint for payment reminders
- `app/api/billing/trial-reminder/` — cron endpoint for day-7 and day-13 trial emails
- `app/api/billing/trial-expire/` — cron endpoint to expire trials
- `app/api/cron/` — general cron job endpoints
- `app/api/super-admin/orgs/` — super-admin org management API

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
- `app/api/calendar/rooms/route.ts` — GET active non-maintenance rooms for all org members

**DB migration (`supabase/migrations/20240101000023_phase8.sql`):**

- Updated `create_reservation_with_locks` RPC to accept `p_status text DEFAULT 'confirmed'`; inserts notification with type based on status

**Email templates added** (`lib/email/auth-templates.ts`):

- `bookingConfirmationTemplate(userName, bookingTitle, roomName, startTime, endTime, isPending)`
- `bookingCancellationTemplate(userName, bookingTitle, roomName, startTime, cancelledByAdmin)`

---

## What Remains to Build

The following phase is **not yet started**.

### Phase 9 — Push Notifications & Real-time

1. Service worker + push subscription registration (VAPID keys already in env)
2. Push to users on booking confirmation, cancellation, ghost-buster release
3. In-app notification bell using `notifications` table (already seeded via RPC)

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
