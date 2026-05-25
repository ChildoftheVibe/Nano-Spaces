# CLAUDE.md

Guidance for continuing development on Nano Spaces. All 15 phases are complete — the app is production-ready and live at `nanospaces.app`.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server on :3000
npm run build        # Production build
npm run start        # Start production server

# Code quality
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run typecheck    # tsc --noEmit
npm run format       # Prettier write

# Testing
npm run test              # vitest run tests/unit
npm run test:integration  # INTEGRATION=true vitest run tests/integration
npm run test:smoke        # vitest run tests/smoke
npm run test:e2e          # playwright test (builds + starts prod server first)
npm run coverage          # vitest run tests/unit --coverage

# Supabase (requires `supabase start` first)
npx supabase start
npx supabase db reset       # Reset DB + apply all migrations + seed
npx supabase migration new <name>
npx supabase gen types typescript --local > types/supabase.ts
./scripts/test-migrations.sh
```

Pre-commit hook runs `lint-staged`: ESLint + Prettier on staged `.ts/.tsx/.js/.jsx/.json/.css/.md` files.

---

## What This App Is

Nano Spaces is a production-ready **multi-tenant space-booking PWA**. Organizations sign up, invite users, and their users book shared rooms/buildings via a calendar UI. Billing is per-org on monthly PayPal subscriptions (Starter / Growth tiers).

**Stack:** Next.js 14 (App Router) · TypeScript strict · Supabase (Postgres + Auth + Storage) · Tailwind CSS · shadcn/ui · GSAP · Sentry · Vercel deployment target.

---

## What Was Built (Phase Summary)

All 15 phases complete. Key non-obvious facts per phase:

**Phase 1 — Infrastructure:** TypeScript strict with `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`. `lib/errors/AppError.ts` hierarchy (ValidationError 400, AuthError 401, RateLimitError 429, NotFoundError 404, ConflictError/BookingConflictError 409, TierLimitError 402, ExternalServiceError 502). `lib/retry.ts` immediately re-throws on 4xx. Sentry strips `email` + `full_name` PII.

**Phase 2 — Database Schema:** 25 migration files in `supabase/migrations/` (00001–00025). Run `npx supabase db reset` to apply all. Seed password: `NanoSeed2024!`.

| Seed user    | Email                                                            | Role                  |
| ------------ | ---------------------------------------------------------------- | --------------------- |
| Super admin  | `superadmin@nanospaces.app`                                      | `super_admin`         |
| Acme admin   | `alice.admin@acmecorp.example`                                   | `org_admin` (starter) |
| Acme users   | `bob.smith@`, `carol.jones@`, `dave.hibernated@acmecorp.example` | `user`                |
| Globex admin | `grace.admin@globex.example`                                     | `org_admin` (growth)  |

**Phase 3 — Auth System:** Stateless `ns_2fa` cookie format: `base64url(userId):expireMs:HMAC` (Web Crypto, 8h TTL). Middleware enforces: login → 2FA enroll → 2FA verify → TOS accept → role/subscription checks. Rate limits (Upstash Redis, fails open):

| Key              | Limit | Window |
| ---------------- | ----- | ------ |
| `login`          | 10    | 15 min |
| `twoFaVerify`    | 5     | 10 min |
| `otpSend`        | 3     | 10 min |
| `forgotPassword` | 3     | 60 min |
| `inviteSend`     | 20    | 60 min |
| `export`         | 1     | 24 h   |
| `default`        | 100   | 1 min  |

**Phase 4 — Onboarding & Settings:** `lib/tos.ts` exports `CURRENT_TOS_VERSION = '1.0'` — bump + insert new `tos_versions` row to trigger re-acceptance for all users. 4-step onboarding wizard; 5-tab settings page.

**Phase 5 — Org Management & Invitations:** `lib/tiers/index.ts` — `checkRoomLimit`, `checkAdminLimit`, `checkUserLimit` return `{ allowed, current, limit }`, throw `TierLimitError` if `!allowed`. Storage: `org-logos` (public read, 2MB), `invoices` (private, signed-URL only).

**Phase 6–7 — Billing:** PayPal subscriptions via `lib/paypal/`. Webhook at `/api/paypal/webhook` verifies signature + idempotency via `processed_webhooks`. PDF invoices via `pdf-lib` stored in `invoices` bucket. `PLAN_TIER_MAP` maps PayPal plan ID → tier.

**Phase 8 — Calendar & Booking:** FullCalendar v6, SSR disabled. Times stored UTC, displayed in user timezone via `date-fns-tz`. `create_reservation_with_locks` RPC used for atomic booking. ICS export uses `startInputType: 'utc'` for Google/Outlook compatibility.

**Phase 9 — Recurring, Waitlist, Approval, Check-in:** Recurring instances share `recurring_group_id`. Waitlisted bookings use 30-min hold windows promoted by `process_waitlist_slot()` RPC after every cancellation. Check-in valid only within 10-min pre-start window. `/checkin?reservation_id=` is a public page.

**Phase 10 — Cron Jobs:** All cron routes in `app/api/cron/`. Authenticated via `verifyCronSecret` (Bearer `CRON_SECRET`). Use raw `Response.json()`, not `withErrorHandling`. Trial cron uses `admin.auth.admin.getUserById()` to get email — NOT the `profiles` table. Schedules in `vercel.json`.

**Phase 11 — God Mode & Audit:** God Mode (`POST /api/reservations/god-mode`) displaces conflicting bookings, auto-waitlists displaced users, requires ≥10 char reason. **Restricted to `super_admin` only** — both the API and the calendar UI toggle. `audit_chain` table holds SHA-256 chain over `activity_log`; nightly cron emails super admin on tamper detection.

**Phase 12 — Notifications & Search:** Notification bell polls every 30s. `sendPushToUser` auto-deletes stale push endpoints (410/404). Global search via FTS: `title_fts` (reservations), `name_fts` (locations), `full_name_fts` (profiles). Cmd+K / Ctrl+K trigger.

**Phase 13 — Reports:** Single tabbed page at `app/(org-admin)/reports/`. Excel exports via SheetJS (`xlsx`). Org data export at `GET /api/org/export` — ZIP with 4 CSVs, rate-limited 1/24h per org. Reports: Monthly, User History, Utilization, Peak Hours (24×7 heatmap), Ghost Buster.

**Phase 14 — Testing:** Vitest unit tests (92 tests, 80% coverage thresholds). Integration tests skipped unless `INTEGRATION=true`. Playwright E2E across 5 projects (chromium, firefox, webkit, mobile-iphone, mobile-pixel) with axe-core a11y checks. k6 load tests in `tests/load/`. Smoke tests via `SMOKE_URL` env var. Playwright runs against a pre-compiled production server (`npm run build && npm run start`) — never the dev server — to avoid on-demand compilation timeouts.

**Phase 15 — Production Readiness:** Per-request CSP nonce generated in middleware, threaded via `x-nonce` header. PWA manifest + service worker with stale-while-revalidate (network-only for `/api/` and `/_next/`). `GET /api/health` pings DB, Storage, Redis, email; returns 200 or 503. Shepherd.js tour dynamically imported. Operational docs in `docs/` (secret rotation, incident response, disaster recovery with RTO < 4h / RPO < 24h).

**External go-live steps:** Vercel deploy + custom domain, Supabase production project + env vars, status page (statuspage.io or Betterstack), PayPal live mode test, securityheaders.com scan.

---

## Production State (post-launch changes)

### Bug fixes shipped to production

**TOTP verification always returned false (`lib/auth/totp.ts`):** otplib v13 changed `verifySync` return shape from `{ isValid: boolean }` to `{ valid: boolean }`. The original code checked `'isValid' in result` which was never true, making 2FA enrollment impossible for every user. Fixed to check `'valid'` first, then fall back to `'isValid'` for forward compatibility.

**2FA back-button loop (middleware):** After completing 2FA, the browser kept `/verify-2fa` in history. Navigating back would re-render the form because `/verify-2fa` was not in any middleware route list (not auth, not protected, not public-bypass), so middleware always let it render. Fixed: middleware now checks for a valid `ns_2fa` cookie when an authenticated user lands on `/verify-2fa` — if valid, redirects forward to the `next` param or `/calendar`; if invalid, lets the page render normally.

**Nav links broken on all org-admin pages:** All links in `app/(org-admin)/layout.tsx` used `/org-admin/rooms`, `/org-admin/users`, etc. Next.js route groups (`(org-admin)`) do not appear in the URL — the actual paths are `/rooms`, `/users`, `/approvals`, `/reports`, `/activity-log`, `/org-settings`. Same error existed in `app/(super-admin)/layout.tsx`, `app/api/org/onboarding-checklist/route.ts`, `lib/email/auth-templates.ts`, and `app/(org-admin)/users/page.tsx`. All corrected.

**Navbar missing on `/calendar` and `/settings`:** These pages live in the `(user)` route group, so they always used the `(user)` layout — which only showed Calendar/Settings/Billing links. Org admins had no way to navigate to Rooms, Users, Approvals, etc. from those pages. Fixed: `app/(user)/layout.tsx` now reads the session role server-side and renders the full org-admin nav for `org_admin` and `super_admin` users.

**God mode accessible to org admins:** Both the `/api/reservations/god-mode` API and the calendar UI god mode toggle accepted `org_admin` role. Restricted both to `super_admin` only.

### Login page design

The login page (`app/(auth)/login/page.tsx`) and shared auth layout (`components/layout/auth-card.tsx`) were redesigned using the `high-end-visual-design` skill:

- **AuthCard** (`components/layout/auth-card.tsx`): dark split layout — left brand panel with GSAP blur-fade entrance, animated ambient CSS orbs (`orb-drift-a/b/c`), fixed SVG feTurbulence grain overlay at 3.5% opacity. Right panel is `bg-[#07070c]` when `dark` prop is set, `bg-white` otherwise. `dark?: boolean` prop defaults false.
- **Login page**: Double-Bezel inputs (outer shell `rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08] p-[5px]`, inner core `rounded-[calc(1rem-5px)]`). Pill submit button with Button-in-Button arrow icon. GSAP stagger mount on `.form-el` elements (delay 0.5s). All contrast values ≥ `white/50` for WCAG AA compliance on `#07070c` background.
- **"Welcome back"** eyebrow shown only for returning visitors via `localStorage` key `ns_has_visited`.
- **Terms of Service** and **Privacy Policy** links in a subdued footer row.

### Super-admin org management

Full org management UI and APIs added post-launch:

**New pages:**

- `app/(super-admin)/orgs/page.tsx` — dark command-center redesign: stat tiles with GSAP count-up scrub, infinite marquee ticker, staggered row entrances, Add Org modal with glassmorphism entrance/exit animation.
- `app/(super-admin)/orgs/[id]/page.tsx` — org detail: users table, rooms table, reservation count, delete org button.

**New API routes:**

- `GET/POST /api/super-admin/orgs` — list with search/pagination, create org atomically.
- `GET/DELETE /api/super-admin/orgs/[id]` — full org detail (org + users + rooms + reservationCount), cascading delete with auth user cleanup.
- `GET /api/super-admin/orgs/[id]/calendar` — org reservation feed.
- `GET /api/super-admin/orgs/[id]/rooms` — org rooms list.
- `GET/DELETE /api/super-admin/orgs/[id]/rooms/[roomId]` — room detail and delete.
- `GET /api/super-admin/orgs/[id]/users` — org users list.
- `GET/PATCH/DELETE /api/super-admin/orgs/[id]/users/[userId]` — user detail and management.

### Design skills

13 skills available in `.agents/skills/` — use them when building or redesigning UI components:

| Skill                        | Use for                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| `high-end-visual-design`     | Apple/Linear-tier dark UI, Double-Bezel components, GSAP motion |
| `gpt-taste`                  | Dark command-center / dashboard redesigns                       |
| `design-taste-frontend`      | Default taste skill for general UI                              |
| `redesign-existing-projects` | Auditing and upgrading existing pages                           |
| `minimalist-ui`              | Clean, airy white-space-heavy layouts                           |
| `impeccable`                 | Full agency-grade multi-pass critique + rebuild                 |
| `soft-skill`                 | Soft, warm consumer product aesthetic                           |
| `stitch-design-taste`        | Stitch-specific design patterns                                 |
| `industrial-brutalist-ui`    | Bold typographic brutalist style                                |
| `brandkit`                   | Brand identity and token generation                             |
| `image-to-code`              | Screenshot/mockup to component                                  |
| `imagegen-frontend-web`      | AI image generation for web                                     |
| `imagegen-frontend-mobile`   | AI image generation for mobile                                  |

GSAP (`gsap@^3.15.0`) is installed and used for animations. Import directly: `import gsap from 'gsap'`.

### Production database bootstrap

The seed file only populates the **local** Supabase instance. For a fresh production project the following must be done manually (or via a migration):

1. Insert `tos_versions` v1.0 row — required for `profiles.tos_version_accepted` FK.
2. Create the super admin `auth.users` row **and** a matching `auth.identities` row for the `email` provider. GoTrue requires identities; inserting only into `auth.users` will cause `"Scan error on confirmation_token: converting NULL to string"` at login time. All token fields (`confirmation_token`, `recovery_token`, etc.) must be `''` not `NULL`.
3. Create the `profiles` row with `org_id = NULL`, `role = 'super_admin'`.

### Production super admin account

| Field      | Value                                                          |
| ---------- | -------------------------------------------------------------- |
| Email      | `superadmin@nanospaces.app`                                    |
| 2FA method | `email_otp` (code sent to the super admin inbox on each login) |
| TOTP       | disabled (`totp_secret = NULL`)                                |

Login flow: email + password → `/verify-2fa?method=email_otp` → click **Send code** → enter 6-digit code from inbox.

### Resend domain

`nanospaces.app` is verified in Resend. Emails send from `noreply@nanospaces.app`. If the domain ever needs re-verification, check DNS for SPF, DKIM, and DMARC records required by Resend.

---

## Architecture Reference

### Route Groups & URL Structure

Next.js route groups (`(group-name)`) do not appear in the URL. The app has four groups:

| Group           | URL prefix                                                                            | Who can access              |
| --------------- | ------------------------------------------------------------------------------------- | --------------------------- |
| `(auth)`        | none — `/login`, `/signup`, etc.                                                      | unauthenticated             |
| `(user)`        | none — `/calendar`, `/settings`                                                       | all authenticated users     |
| `(org-admin)`   | none — `/rooms`, `/users`, `/approvals`, `/reports`, `/activity-log`, `/org-settings` | `org_admin` + `super_admin` |
| `(super-admin)` | none — `/orgs`, `/god-mode-audit`, `/marketing`                                       | `super_admin` only          |

**Critical:** never use `/org-admin/...` or `/super-admin/...` as hrefs — those paths do not exist. The route group name is for filesystem organization only.

### Middleware Route Protection (`middleware.ts`)

```
ORG_ADMIN_PREFIXES  = ['/activity-log', '/approvals', '/org-settings', '/reports', '/rooms', '/users']
SUPER_ADMIN_PREFIXES = ['/god-mode-audit', '/marketing', '/orgs']
PROTECTED_PREFIXES  = ['/calendar', '/settings', ...ORG_ADMIN_PREFIXES, ...SUPER_ADMIN_PREFIXES]
AUTH_ROUTES         = ['/login', '/forgot-password', '/reset-password', '/signup']
TOS_EXEMPT          = ['/onboarding', '/accept-tos']
PUBLIC_BYPASS       = ['/auth/callback', '/auth/oauth-signup']
```

Middleware enforcement order per request:

1. `PUBLIC_BYPASS` → pass through immediately
2. `AUTH_ROUTES` + authenticated → redirect to `/calendar`
3. `/verify-2fa` + authenticated + valid `ns_2fa` cookie → redirect to `next` param or `/calendar` (prevents back-button loop)
4. Not `PROTECTED` → pass through
5. Not authenticated → redirect to `/login?next=<pathname>`
6. `PROTECTED` but 2FA not enrolled → redirect to `/onboarding`
7. `PROTECTED` + no valid `ns_2fa` cookie → redirect to `/verify-2fa`
8. TOS not accepted (and not `TOS_EXEMPT`) → redirect to `/onboarding`
9. TOS version outdated → redirect to `/accept-tos`
10. `SUPER_ADMIN` route + not `super_admin` → redirect to `/unauthorized`
11. `ORG_ADMIN` route + not `org_admin`/`super_admin` → redirect to `/unauthorized`
12. Subscription/trial checks → redirect to `/paywall`

### Role-Aware Navigation

`app/(user)/layout.tsx` is a **server component** that reads the session role on every request. It renders two different navs:

- **`org_admin` / `super_admin`**: Calendar → Rooms → Users → Approvals → Reports → Activity → Org Settings → Settings
- **`user`**: Calendar → Settings → Billing

The `(org-admin)/layout.tsx` nav is only seen when on org-admin pages and links to the same corrected paths.

### Multi-tenant Model

Every user belongs to an `organization`. RLS on all tables — anon-key clients never see rows outside their `org_id`. Three roles: `user`, `org_admin`, `super_admin`. Super admin has `org_id = NULL`.

### Supabase Clients (`lib/supabase/`)

- `createSessionClient()` — async, reads/writes cookies, respects RLS. Use in Server Components and API routes.
- `createAdminClient()` — service-role key, bypasses RLS. Use only in trusted server contexts (auth routes, cron, webhooks).
- `createBrowserClient()` — singleton browser client. Use in Client Components.

After login, the API returns session tokens and the client calls `supabase.auth.setSession()` before redirecting.

### API Route Pattern

Every route must be wrapped with `withErrorHandling` from `lib/api-response/handler.ts`:

```ts
// success: { success: true, data: T }
// failure: { success: false, error: { code, message, requestId, details? } }
```

Throw `AppError` subclasses for typed HTTP errors. Unhandled exceptions → Sentry → 500.

**Exception:** cron routes use raw `Response.json()`, not `withErrorHandling`.

### Environment Validation

Import `env` from `@/lib/env`. Never read `process.env` directly. Zod schema requires 27 variables — see `.env.example`.

### UI Components

shadcn/ui primitives in `components/ui/`. Feature components in `components/features/<domain>/`. Layout in `components/layout/`.

Fonts: `Plus_Jakarta_Sans` (heading, `--font-jakarta`) and `Inter` (body, `--font-inter`). Brand color: `#4F7EFA`.

**Auth pages** use `<AuthCard dark>` from `components/layout/auth-card.tsx`. The `dark` prop switches the right panel to `bg-[#07070c]` and uses white text. Other pages use the light variant (default).

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
| `audit_chain`        | SHA-256 tamper-detection chain over activity_log               |
| `email_otp_codes`    | Short-lived OTP codes (service-role only)                      |
| `tos_versions`       | ToS version lookup (public read)                               |
| `processed_webhooks` | Webhook idempotency (service-role only)                        |

Regenerate types: `npx supabase gen types typescript --local > types/supabase.ts`

### External Services

| Service              | Purpose                                | Config vars                                                                                                                              |
| -------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Resend               | Transactional email                    | `RESEND_API_KEY`                                                                                                                         |
| PayPal               | Subscription billing                   | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_STARTER_PLAN_ID`, `PAYPAL_GROWTH_PLAN_ID`, `PAYPAL_ENVIRONMENT` |
| Upstash Redis        | Rate limiting                          | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                                                                     |
| Cloudflare Turnstile | Bot protection (after 3 failed logins) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                                                                                 |
| Sentry               | Error tracking + performance           | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`                                                                                                        |
| VAPID                | Web push notifications                 | `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_EMAIL`                                                                          |
| Cron secret          | Secures `/api/cron/*`                  | `CRON_SECRET`                                                                                                                            |

Local Supabase: Postgres 17, studio on `:54323`, inbucket email on `:54324`.

---

## Coding Conventions

Hard rules — every file must follow them.

- **Naming:** files=kebab-case, components=PascalCase, functions=camelCase verb-first, constants=SCREAMING_SNAKE_CASE, booleans prefix `is`/`has`/`can`/`should`
- **TypeScript:** No `any` — use `unknown` + type guards. No `@ts-ignore` — use `@ts-expect-error` with explanation. `exactOptionalPropertyTypes=true`, `noUncheckedIndexedAccess=true`.
- **Async:** Always `async/await` — never `.then()` chains.
- **API routes:** Every route wrapped with `withErrorHandling()`. Throw `AppError` subclasses, never raw errors.
- **Env vars:** Always import from `@/lib/env`. Never `process.env`.
- **Comments:** None except for non-obvious WHY. Never describe WHAT the code does.
- **Error handling:** No fallbacks for impossible scenarios. Only validate at system boundaries.
- **No premature abstraction:** Three similar lines is better than a helper that doesn't earn its weight.
- **Route group URLs:** Never use the group name in hrefs. `(org-admin)/rooms` → href `/rooms`, not `/org-admin/rooms`.
