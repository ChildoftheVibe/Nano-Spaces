'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type Profile = {
  id: string
  timezone: string
  role: 'user' | 'org_admin' | 'super_admin'
  org_id: string | null
  totp_enabled: boolean
  tos_accepted_at: string | null
}

function getTimezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Toronto',
      'America/Vancouver',
      'America/Sao_Paulo',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Amsterdam',
      'Europe/Moscow',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Singapore',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Pacific/Auckland',
      'Pacific/Honolulu',
    ]
  }
}

const DETECTED_TZ: string = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/New_York'
  }
})()

const STEP_LABELS: Record<number, string> = {
  1: 'Timezone',
  2: '2FA',
  3: 'Terms',
  4: 'Preferences',
}

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlStep = parseInt(searchParams.get('step') ?? '1', 10)

  const [step, setStep] = useState<number>(urlStep)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 — timezone
  const [timezone, setTimezone] = useState(DETECTED_TZ)
  const [tzSearch, setTzSearch] = useState('')
  const allTimezones = getTimezones()
  const filteredTzs = tzSearch
    ? allTimezones.filter((tz) => tz.toLowerCase().includes(tzSearch.toLowerCase()))
    : allTimezones

  // Step 3 — ToS scroll gate
  const tosRef = useRef<HTMLDivElement>(null)
  const [tosScrolled, setTosScrolled] = useState(false)
  const [tosChecked, setTosChecked] = useState(false)

  // Step 4 — email prefs (admin only)
  const [emailOptIn, setEmailOptIn] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient()
    void supabase
      .from('profiles')
      .select('id, timezone, role, org_id, totp_enabled, tos_accepted_at')
      .single()
      .then(({ data }) => {
        if (data) {
          const p = data as Profile
          setProfile(p)
          if (p.timezone) setTimezone(p.timezone)
        }
        setLoading(false)
      })
  }, [])

  const needsTwoFa = profile ? !profile.totp_enabled : true
  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'super_admin'
  const activeSteps = [1, ...(needsTwoFa ? [2] : []), 3, ...(isAdmin ? [4] : [])]
  const currentDotIndex = activeSteps.indexOf(step)

  function advanceFrom(current: number): void {
    if (current === 1) {
      setStep(needsTwoFa ? 2 : 3)
      return
    }
    if (current === 2) {
      setStep(3)
      return
    }
    if (current === 3) {
      if (isAdmin) {
        setStep(4)
      } else {
        router.push('/calendar')
      }
      return
    }
    router.push('/calendar')
  }

  async function handleTimezoneNext() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } }
        setError(json?.error?.message ?? 'Failed to save timezone.')
        return
      }
      advanceFrom(1)
    } finally {
      setSaving(false)
    }
  }

  function handle2faChoice(method: 'totp' | 'email_otp') {
    const next = encodeURIComponent('/onboarding?step=3')
    router.push(method === 'totp' ? `/setup-totp?next=${next}` : `/setup-email-otp?next=${next}`)
  }

  async function handleTosAccept() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/accept-tos', { method: 'POST' })
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } }
        setError(json?.error?.message ?? 'Failed to accept Terms of Service.')
        return
      }
      advanceFrom(3)
    } finally {
      setSaving(false)
    }
  }

  async function handleEmailPrefs() {
    setSaving(true)
    try {
      await fetch('/api/org/email-optin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opted_in: emailOptIn }),
      })
      router.push('/calendar')
    } finally {
      setSaving(false)
    }
  }

  function handleTosScroll() {
    const el = tosRef.current
    if (!el || tosScrolled) return
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 20) {
      setTosScrolled(true)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] px-4 py-12">
      <div className="mb-6 text-center">
        <span className="font-heading text-2xl font-bold text-[var(--text-primary)]">
          Nano Spaces
        </span>
        <p className="mt-1 text-sm text-gray-500">{"Let's get your account set up"}</p>
      </div>

      {/* Step progress indicator */}
      <div className="mb-8 flex items-end gap-0">
        {activeSteps.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step === s
                    ? 'bg-[var(--brand-primary)] text-white'
                    : currentDotIndex > i
                      ? 'bg-[var(--color-success)] text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {currentDotIndex > i ? '✓' : i + 1}
              </div>
              <span className="text-[10px] text-gray-400">{STEP_LABELS[s]}</span>
            </div>
            {i < activeSteps.length - 1 && <div className="mx-2 mb-4 h-0.5 w-10 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="auth-card w-full max-w-[540px]">
        {/* ─── Step 1: Timezone ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="font-heading mb-1 text-xl font-semibold text-[var(--text-primary)]">
              Your timezone
            </h2>
            <p className="mb-5 text-sm text-gray-500">
              We detected{' '}
              <strong className="font-medium text-[var(--text-primary)]">
                {DETECTED_TZ.replace(/_/g, ' ')}
              </strong>{' '}
              as your timezone. Confirm or change it below.
            </p>

            <div className="mb-5 space-y-2">
              <Label htmlFor="tz-search">Timezone</Label>
              <input
                id="tz-search"
                type="text"
                className="input-brand w-full"
                placeholder="Search timezones…"
                value={tzSearch}
                onChange={(e) => setTzSearch(e.target.value)}
              />
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                size={6}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {filteredTzs.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Selected: <strong className="font-medium">{timezone.replace(/_/g, ' ')}</strong>
              </p>
            </div>

            {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

            <Button className="w-full" onClick={() => void handleTimezoneNext()} disabled={saving}>
              {saving ? 'Saving…' : 'Confirm timezone'}
            </Button>
          </div>
        )}

        {/* ─── Step 2: 2FA method ───────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="font-heading mb-1 text-xl font-semibold text-[var(--text-primary)]">
              Set up two-factor authentication
            </h2>
            <p className="mb-5 text-sm text-gray-500">
              Choose how you&rsquo;d like to verify your identity each time you sign in.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handle2faChoice('totp')}
                className="flex w-full items-start gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-[var(--brand-primary)] hover:shadow-sm"
              >
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xl">
                  🔐
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Authenticator app{' '}
                    <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-[var(--brand-primary)]">
                      Recommended
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Use Google Authenticator, Authy, or 1Password to generate time-based codes. More
                    secure than email.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handle2faChoice('email_otp')}
                className="flex w-full items-start gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-[var(--brand-primary)] hover:shadow-sm"
              >
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xl">
                  ✉️
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Email one-time code
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Receive a 6-digit code to your email address each time you sign in.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Terms of Service ─────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 className="font-heading mb-1 text-xl font-semibold text-[var(--text-primary)]">
              Terms of Service
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Please read through our Terms of Service and accept to continue.
            </p>

            <div
              ref={tosRef}
              onScroll={handleTosScroll}
              className="mb-3 h-56 overflow-y-auto rounded-lg border bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed"
            >
              <p className="mb-3 font-semibold text-[var(--text-primary)]">
                Terms of Service — Version 1.0
              </p>
              <p className="mb-3">
                By accessing or using Nano Spaces, you agree to be bound by these Terms of Service
                and all applicable laws and regulations.
              </p>
              <p className="mb-3">
                <strong>1. Use of the Service.</strong> You may use Nano Spaces only for lawful
                purposes. You may not share your credentials, attempt unauthorized access, or use
                the service to transmit harmful or fraudulent content.
              </p>
              <p className="mb-3">
                <strong>2. Accounts and Security.</strong> You are responsible for the security of
                your account. Two-factor authentication is required. Notify us immediately of any
                security breach or unauthorized use.
              </p>
              <p className="mb-3">
                <strong>3. Data and Privacy.</strong> Your use is governed by our Privacy Policy.
                Your organization&rsquo;s data is isolated using row-level security. We do not sell
                your personal data. You may export or request deletion of your data at any time.
              </p>
              <p className="mb-3">
                <strong>4. Service Availability.</strong> The Service is provided &ldquo;as
                is.&rdquo; We strive for high availability but do not guarantee uninterrupted
                access.
              </p>
              <p className="mb-3">
                <strong>5. Limitation of Liability.</strong> To the maximum extent permitted by
                applicable law, Nano Spaces shall not be liable for indirect or consequential
                damages. Our total liability shall not exceed amounts paid in the preceding three
                months.
              </p>
              <p className="mb-3">
                <strong>6. Changes.</strong> We may update these Terms. For material changes, we
                will notify users and require re-acceptance before continued use.
              </p>
              <p>
                Read the full{' '}
                <Link
                  href="/terms"
                  className="text-[var(--brand-primary)] underline"
                  target="_blank"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  className="text-[var(--brand-primary)] underline"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            {!tosScrolled && (
              <p className="mb-3 text-xs text-amber-600">
                ↓ Scroll to the bottom to enable the accept button
              </p>
            )}

            <label
              className={`mb-5 flex cursor-pointer items-start gap-3 ${
                !tosScrolled ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[var(--brand-primary)]"
                checked={tosChecked}
                disabled={!tosScrolled}
                onChange={(e) => setTosChecked(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the{' '}
                <Link
                  href="/terms"
                  className="text-[var(--brand-primary)] hover:underline"
                  target="_blank"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  className="text-[var(--brand-primary)] hover:underline"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

            <Button
              className="w-full"
              disabled={!tosChecked || saving}
              onClick={() => void handleTosAccept()}
            >
              {saving ? 'Saving…' : 'I Accept'}
            </Button>
          </div>
        )}

        {/* ─── Step 4: Email preferences (admin only) ───────────────────────── */}
        {step === 4 && (
          <div>
            <h2 className="font-heading mb-1 text-xl font-semibold text-[var(--text-primary)]">
              Email preferences
            </h2>
            <p className="mb-5 text-sm text-gray-500">
              As an organization administrator, choose whether to receive product updates. You can
              change this at any time in Settings.
            </p>

            <div className="mb-6 rounded-xl border-2 border-gray-200 p-4 transition-colors hover:border-gray-300">
              <label htmlFor="email-optin" className="flex cursor-pointer items-center gap-3">
                <input
                  id="email-optin"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 accent-[var(--brand-primary)]"
                  checked={emailOptIn}
                  onChange={(e) => setEmailOptIn(e.target.checked)}
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Product updates and announcements
                </span>
              </label>
              <p className="mt-1 pl-7 text-xs text-gray-500">
                Occasional emails about new features, improvements, and important platform news.
              </p>
            </div>

            <Button className="w-full" onClick={() => void handleEmailPrefs()} disabled={saving}>
              {saving ? 'Saving…' : 'Complete setup'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
