'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

// ─── Types ───────────────────────────────────────────────────────────────────

type Profile = {
  id: string
  full_name: string
  email: string
  timezone: string
  role: 'user' | 'org_admin' | 'super_admin'
  org_id: string | null
  totp_enabled: boolean
  two_fa_method: 'totp' | 'email_otp'
  email_reminders: boolean
  reminder_timing: '24h' | '1h' | 'both' | null
}

type SupabaseSession = {
  id: string
  created_at: string
  updated_at: string
  user_agent: string | null
  ip: string | null
  not_after: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Singapore',
      'Australia/Sydney',
      'Pacific/Auckland',
    ]
  }
}

function parseDevice(ua: string | null): string {
  if (!ua) return 'Unknown device'
  if (ua.includes('iPhone')) return 'iPhone'
  if (ua.includes('iPad')) return 'iPad'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'Mac'
  if (ua.includes('Linux')) return 'Linux'
  return 'Unknown device'
}

function parseBrowser(ua: string | null): string {
  if (!ua) return 'Browser'
  if (ua.includes('Edg/') || ua.includes('Edge/')) return 'Edge'
  if (ua.includes('Chrome') && !ua.includes('Chromium')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  return 'Browser'
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i)
  return output
}

// ─── Sub-form schemas ─────────────────────────────────────────────────────────

const nameSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
})

const emailSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
  currentPassword: z.string().min(1, 'Current password is required'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/\d/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// ─── Inline feedback component ────────────────────────────────────────────────

function Feedback({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <p className={`text-sm ${ok ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
      {msg}
    </p>
  )
}

// ─── Main settings page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') ?? 'profile'

  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  // Sessions state
  const [sessions, setSessions] = useState<SupabaseSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  // Push state
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSaving, setPushSaving] = useState(false)
  const [pushMsg, setPushMsg] = useState<{ ok: boolean; msg: string } | null>(null)

  // Timezone state
  const [timezone, setTimezone] = useState('')
  const [tzSearch, setTzSearch] = useState('')
  const [tzSaving, setTzSaving] = useState(false)
  const [tzMsg, setTzMsg] = useState<{ ok: boolean; msg: string } | null>(null)
  const allTimezones = getTimezones()
  const filteredTzs = tzSearch
    ? allTimezones.filter((t) => t.toLowerCase().includes(tzSearch.toLowerCase()))
    : allTimezones

  // Email reminders state
  const [emailReminders, setEmailReminders] = useState(false)
  const [reminderTiming, setReminderTiming] = useState<'24h' | '1h' | 'both'>('24h')
  const [reminderSaving, setReminderSaving] = useState(false)
  const [reminderMsg, setReminderMsg] = useState<{ ok: boolean; msg: string } | null>(null)

  // GDPR state
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState<{ ok: boolean; msg: string } | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  // ─── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient()
    void supabase
      .from('profiles')
      .select(
        'id, full_name, email, timezone, role, org_id, totp_enabled, two_fa_method, email_reminders, reminder_timing',
      )
      .single()
      .then(({ data }) => {
        if (data) {
          const p = data as Profile
          setProfile(p)
          setTimezone(p.timezone ?? '')
          setEmailReminders(p.email_reminders ?? false)
          setReminderTiming((p.reminder_timing as '24h' | '1h' | 'both') ?? '24h')
        }
        setProfileLoading(false)
      })
  }, [])

  // ─── Check push subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setPushSupported(true)
    void navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        setPushEnabled(!!sub)
      }),
    )
  }, [])

  // ─── Load sessions when tab is sessions ────────────────────────────────────
  function loadSessions() {
    setSessionsLoading(true)
    void fetch('/api/auth/sessions')
      .then((r) => r.json())
      .then((json: { data?: { sessions?: SupabaseSession[] } }) => {
        setSessions(json?.data?.sessions ?? [])
      })
      .finally(() => setSessionsLoading(false))
  }

  // ─── Profile name form ──────────────────────────────────────────────────────
  const {
    register: regName,
    handleSubmit: submitName,
    formState: { errors: nameErrors, isSubmitting: nameSaving },
    setError: setNameError,
  } = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    values: { full_name: profile?.full_name ?? '' },
  })

  const [nameMsg, setNameMsg] = useState<{ ok: boolean; msg: string } | null>(null)

  const onNameSubmit = submitName(async (data) => {
    setNameMsg(null)
    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: data.full_name }),
    })
    const json = (await res.json()) as { error?: { message?: string } }
    if (!res.ok) {
      setNameError('root', { message: json?.error?.message ?? 'Failed to update name.' })
      return
    }
    setProfile((p) => (p ? { ...p, full_name: data.full_name } : p))
    setNameMsg({ ok: true, msg: 'Name updated.' })
  })

  // ─── Change email form ──────────────────────────────────────────────────────
  const {
    register: regEmail,
    handleSubmit: submitEmail,
    formState: { errors: emailErrors, isSubmitting: emailSaving },
    setError: setEmailError,
    reset: resetEmail,
  } = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) })

  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; msg: string } | null>(null)

  const onEmailSubmit = submitEmail(async (data) => {
    setEmailMsg(null)
    const res = await fetch('/api/auth/change-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = (await res.json()) as { error?: { message?: string } }
    if (!res.ok) {
      setEmailError('root', { message: json?.error?.message ?? 'Failed to send verification.' })
      return
    }
    resetEmail()
    setEmailMsg({
      ok: true,
      msg: 'Verification emails sent. Check both inboxes to confirm the change.',
    })
  })

  // ─── Change password form ───────────────────────────────────────────────────
  const {
    register: regPw,
    handleSubmit: submitPw,
    formState: { errors: pwErrors, isSubmitting: pwSaving },
    setError: setPwError,
    reset: resetPw,
  } = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) })

  const [pwMsg, setPwMsg] = useState<{ ok: boolean; msg: string } | null>(null)

  const onPwSubmit = submitPw(async (data) => {
    setPwMsg(null)
    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = (await res.json()) as { error?: { message?: string } }
    if (!res.ok) {
      setPwError('root', { message: json?.error?.message ?? 'Failed to change password.' })
      return
    }
    resetPw()
    setPwMsg({ ok: true, msg: 'Password changed successfully.' })
  })

  // ─── Timezone save ──────────────────────────────────────────────────────────
  async function handleTzSave() {
    setTzSaving(true)
    setTzMsg(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      })
      const json = (await res.json()) as { error?: { message?: string } }
      if (!res.ok) {
        setTzMsg({ ok: false, msg: json?.error?.message ?? 'Failed to save timezone.' })
        return
      }
      setProfile((p) => (p ? { ...p, timezone } : p))
      setTzMsg({ ok: true, msg: 'Timezone updated.' })
    } finally {
      setTzSaving(false)
    }
  }

  // ─── Reminder prefs save ────────────────────────────────────────────────────
  async function handleReminderSave() {
    setReminderSaving(true)
    setReminderMsg(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_reminders: emailReminders,
          reminder_timing: emailReminders ? reminderTiming : null,
        }),
      })
      const json = (await res.json()) as { error?: { message?: string } }
      if (!res.ok) {
        setReminderMsg({ ok: false, msg: json?.error?.message ?? 'Failed to save preferences.' })
        return
      }
      setReminderMsg({ ok: true, msg: 'Preferences saved.' })
    } finally {
      setReminderSaving(false)
    }
  }

  // ─── Push notification toggle ───────────────────────────────────────────────
  async function handlePushToggle(enabled: boolean) {
    setPushSaving(true)
    setPushMsg(null)
    try {
      if (enabled) {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setPushMsg({
            ok: false,
            msg: 'Notification permission denied. Enable it in your browser settings.',
          })
          return
        }

        const keyRes = await fetch('/api/user/push-key')
        const keyJson = (await keyRes.json()) as { data?: { publicKey?: string } }
        const publicKey = keyJson?.data?.publicKey
        if (!publicKey) {
          setPushMsg({ ok: false, msg: 'Failed to load push configuration.' })
          return
        }

        await navigator.serviceWorker.register('/sw.js')
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as Uint8Array<ArrayBuffer>,
        })

        const subJson = sub.toJSON()
        await fetch('/api/user/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            p256dh: subJson.keys?.p256dh ?? '',
            auth_key: subJson.keys?.auth ?? '',
            user_agent: navigator.userAgent,
          }),
        })

        setPushEnabled(true)
        setPushMsg({ ok: true, msg: 'Push notifications enabled.' })
      } else {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await fetch('/api/user/push-subscription', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
        }
        setPushEnabled(false)
        setPushMsg({ ok: true, msg: 'Push notifications disabled.' })
      }
    } catch {
      setPushMsg({ ok: false, msg: 'Failed to update push notifications.' })
    } finally {
      setPushSaving(false)
    }
  }

  // ─── Revoke single session ──────────────────────────────────────────────────
  async function handleRevokeSession(id: string) {
    setRevokingId(id)
    try {
      const res = await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSessions((s) => s.filter((sess) => sess.id !== id))
        // If the delete response indicates current session was revoked, redirect to login
        const json = (await res.json()) as { data?: { revoked?: boolean } }
        if (json?.data?.revoked) {
          // Check if we still have a session
          const supabase = createBrowserClient()
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (!session) router.push('/login')
        }
      }
    } finally {
      setRevokingId(null)
    }
  }

  // ─── Revoke all sessions ────────────────────────────────────────────────────
  async function handleRevokeAll() {
    if (!confirm('This will sign you out of all devices, including this one. Continue?')) return
    await fetch('/api/auth/sessions', { method: 'DELETE' })
    router.push('/login')
  }

  // ─── Data export ────────────────────────────────────────────────────────────
  async function handleExport() {
    setExportLoading(true)
    try {
      const res = await fetch('/api/user/export')
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } }
        alert(json?.error?.message ?? 'Export failed. Please try again later.')
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = /filename="(.+?)"/.exec(cd)
      const filename = match?.[1] ?? 'nanospaces-export.zip'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportLoading(false)
    }
  }

  // ─── Account deletion request ────────────────────────────────────────────────
  async function handleDeleteRequest() {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    setDeleteLoading(true)
    setDeleteMsg(null)
    try {
      const res = await fetch('/api/user/delete-request', { method: 'POST' })
      const json = (await res.json()) as { error?: { message?: string } }
      if (!res.ok) {
        setDeleteMsg({
          ok: false,
          msg: json?.error?.message ?? 'Failed to submit deletion request.',
        })
        return
      }
      setDeleteMsg({
        ok: true,
        msg: 'Your deletion request has been submitted. Your data will be removed within 30 days.',
      })
      setDeleteConfirm(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (profileLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-bold text-[var(--text-primary)]">
        Account Settings
      </h1>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6 w-full justify-start gap-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="sessions" onClick={loadSessions}>
            Sessions
          </TabsTrigger>
          <TabsTrigger value="data">Data & Privacy</TabsTrigger>
        </TabsList>

        {/* ─── Profile tab ─────────────────────────────────────────────────── */}
        <TabsContent value="profile">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-heading mb-1 text-base font-semibold text-[var(--text-primary)]">
              Display name
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              This name appears in bookings and notifications.
            </p>

            <form onSubmit={onNameSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  {...regName('full_name')}
                  aria-invalid={!!nameErrors.full_name}
                />
                {nameErrors.full_name && (
                  <p className="text-xs text-[var(--color-danger)]">
                    {nameErrors.full_name.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={nameSaving}>
                  {nameSaving ? 'Saving…' : 'Save name'}
                </Button>
                {nameMsg && <Feedback {...nameMsg} />}
                {nameErrors.root && (
                  <Feedback ok={false} msg={nameErrors.root.message ?? 'Error'} />
                )}
              </div>
            </form>

            <Separator className="my-6" />

            <div>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-[var(--text-primary)]">Email address</span>
                <br />
                {profile?.email}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                To change your email, go to the Security tab.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ─── Security tab ─────────────────────────────────────────────────── */}
        <TabsContent value="security" className="space-y-4">
          {/* Change email */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-heading mb-1 text-base font-semibold text-[var(--text-primary)]">
              Change email address
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Verification links will be sent to both your current and new address.
            </p>

            <form onSubmit={onEmailSubmit} noValidate className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="newEmail">New email address</Label>
                <Input
                  id="newEmail"
                  type="email"
                  autoComplete="email"
                  {...regEmail('newEmail')}
                  aria-invalid={!!emailErrors.newEmail}
                />
                {emailErrors.newEmail && (
                  <p className="text-xs text-[var(--color-danger)]">
                    {emailErrors.newEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emailCurrentPw">Current password</Label>
                <Input
                  id="emailCurrentPw"
                  type="password"
                  autoComplete="current-password"
                  {...regEmail('currentPassword')}
                  aria-invalid={!!emailErrors.currentPassword}
                />
                {emailErrors.currentPassword && (
                  <p className="text-xs text-[var(--color-danger)]">
                    {emailErrors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" disabled={emailSaving}>
                  {emailSaving ? 'Sending…' : 'Send verification'}
                </Button>
                {emailMsg && <Feedback {...emailMsg} />}
                {emailErrors.root && (
                  <Feedback ok={false} msg={emailErrors.root.message ?? 'Error'} />
                )}
              </div>
            </form>
          </div>

          {/* Change password */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-heading mb-1 text-base font-semibold text-[var(--text-primary)]">
              Change password
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Minimum 12 characters with uppercase, lowercase, and a number. New password is checked
              against known breach databases.
            </p>

            <form onSubmit={onPwSubmit} noValidate className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="currentPw">Current password</Label>
                <Input
                  id="currentPw"
                  type="password"
                  autoComplete="current-password"
                  {...regPw('currentPassword')}
                  aria-invalid={!!pwErrors.currentPassword}
                />
                {pwErrors.currentPassword && (
                  <p className="text-xs text-[var(--color-danger)]">
                    {pwErrors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPw">New password</Label>
                <Input
                  id="newPw"
                  type="password"
                  autoComplete="new-password"
                  {...regPw('newPassword')}
                  aria-invalid={!!pwErrors.newPassword}
                />
                {pwErrors.newPassword && (
                  <p className="text-xs text-[var(--color-danger)]">
                    {pwErrors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPw">Confirm new password</Label>
                <Input
                  id="confirmPw"
                  type="password"
                  autoComplete="new-password"
                  {...regPw('confirmPassword')}
                  aria-invalid={!!pwErrors.confirmPassword}
                />
                {pwErrors.confirmPassword && (
                  <p className="text-xs text-[var(--color-danger)]">
                    {pwErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" disabled={pwSaving}>
                  {pwSaving ? 'Saving…' : 'Change password'}
                </Button>
                {pwMsg && <Feedback {...pwMsg} />}
                {pwErrors.root && <Feedback ok={false} msg={pwErrors.root.message ?? 'Error'} />}
              </div>
            </form>
          </div>

          {/* 2FA */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-heading mb-1 text-base font-semibold text-[var(--text-primary)]">
              Two-factor authentication
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Currently using:{' '}
              <strong className="font-medium text-[var(--text-primary)]">
                {profile?.two_fa_method === 'totp'
                  ? 'Authenticator app (TOTP)'
                  : 'Email one-time code'}
              </strong>
            </p>

            <div className="flex flex-wrap gap-2">
              {profile?.two_fa_method !== 'totp' && (
                <Link href={`/setup-totp?next=${encodeURIComponent('/settings?tab=security')}`}>
                  <Button variant="outline" size="sm">
                    Switch to authenticator app
                  </Button>
                </Link>
              )}
              {profile?.two_fa_method !== 'email_otp' && (
                <Link
                  href={`/setup-email-otp?next=${encodeURIComponent('/settings?tab=security')}`}
                >
                  <Button variant="outline" size="sm">
                    Switch to email OTP
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ─── Preferences tab ──────────────────────────────────────────────── */}
        <TabsContent value="preferences" className="space-y-4">
          {/* Timezone */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-heading mb-1 text-base font-semibold text-[var(--text-primary)]">
              Timezone
            </h2>
            <p className="mb-4 text-sm text-gray-500">Used for scheduling and booking reminders.</p>

            <div className="space-y-2">
              <Label htmlFor="tz-search-settings">Search</Label>
              <Input
                id="tz-search-settings"
                type="text"
                placeholder="Search timezones…"
                value={tzSearch}
                onChange={(e) => setTzSearch(e.target.value)}
              />
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                size={5}
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

            <div className="mt-4 flex items-center gap-3">
              <Button onClick={() => void handleTzSave()} disabled={tzSaving}>
                {tzSaving ? 'Saving…' : 'Save timezone'}
              </Button>
              {tzMsg && <Feedback {...tzMsg} />}
            </div>
          </div>

          {/* Email reminders */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-heading mb-1 text-base font-semibold text-[var(--text-primary)]">
              Email reminders
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Receive email reminders before your bookings.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-reminders">Enable booking reminders</Label>
                <Switch
                  id="email-reminders"
                  checked={emailReminders}
                  onCheckedChange={setEmailReminders}
                />
              </div>

              {emailReminders && (
                <div className="space-y-1.5">
                  <Label htmlFor="reminder-timing">Reminder timing</Label>
                  <select
                    id="reminder-timing"
                    className="input-brand w-full"
                    value={reminderTiming}
                    onChange={(e) => setReminderTiming(e.target.value as '24h' | '1h' | 'both')}
                  >
                    <option value="24h">24 hours before</option>
                    <option value="1h">1 hour before</option>
                    <option value="both">Both (24 hours and 1 hour before)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button onClick={() => void handleReminderSave()} disabled={reminderSaving}>
                {reminderSaving ? 'Saving…' : 'Save preferences'}
              </Button>
              {reminderMsg && <Feedback {...reminderMsg} />}
            </div>
          </div>

          {/* Push notifications */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-heading mb-1 text-base font-semibold text-[var(--text-primary)]">
              Push notifications
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {pushSupported
                ? 'Receive browser push notifications for booking confirmations and reminders.'
                : 'Push notifications are not supported in this browser.'}
            </p>

            {pushSupported && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="push-toggle">Enable push notifications</Label>
                  <Switch
                    id="push-toggle"
                    checked={pushEnabled}
                    disabled={pushSaving}
                    onCheckedChange={(enabled) => void handlePushToggle(enabled)}
                  />
                </div>
                {pushMsg && <Feedback {...pushMsg} />}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Sessions tab ─────────────────────────────────────────────────── */}
        <TabsContent value="sessions">
          <div className="rounded-xl border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                  Active sessions
                </h2>
                <p className="text-sm text-gray-500">
                  All devices currently signed in to your account.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                onClick={() => void handleRevokeAll()}
              >
                Sign out everywhere
              </Button>
            </div>

            {sessionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                No active sessions found.{' '}
                <button
                  className="text-[var(--brand-primary)] hover:underline"
                  onClick={loadSessions}
                >
                  Refresh
                </button>
              </p>
            ) : (
              <div className="divide-y">
                {sessions.map((sess) => (
                  <div key={sess.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {parseBrowser(sess.user_agent)} on {parseDevice(sess.user_agent)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {sess.ip ? `${sess.ip} · ` : ''}
                        Last active{' '}
                        {new Date(sess.updated_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={revokingId === sess.id}
                      onClick={() => void handleRevokeSession(sess.id)}
                    >
                      {revokingId === sess.id ? 'Revoking…' : 'Revoke'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Data & Privacy tab ───────────────────────────────────────────── */}
        <TabsContent value="data" className="space-y-4">
          {/* Export */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-heading mb-1 text-base font-semibold text-[var(--text-primary)]">
              Export your data
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Download a ZIP archive containing your profile, all reservations, and activity log as
              JSON and CSV. Limited to once per 24 hours.
            </p>
            <Button onClick={() => void handleExport()} disabled={exportLoading} variant="outline">
              {exportLoading ? 'Preparing…' : 'Export my data'}
            </Button>
          </div>

          {/* Delete account */}
          <div className="rounded-xl border border-red-100 bg-white p-6">
            <h2 className="font-heading mb-1 text-base font-semibold text-red-600">
              Delete account
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Submits a deletion request to your organization administrator. Your data will be
              removed within 30 days after approval. This action cannot be undone.
            </p>

            {deleteMsg ? (
              <Feedback {...deleteMsg} />
            ) : deleteConfirm ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Are you sure? Your data will be permanently deleted within 30 days.
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => void handleDeleteRequest()}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Submitting…' : 'Yes, request deletion'}
                  </Button>
                  <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => void handleDeleteRequest()}
              >
                Request account deletion
              </Button>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Read our{' '}
            <Link href="/privacy" className="text-[var(--brand-primary)] hover:underline">
              Privacy Policy
            </Link>{' '}
            to learn how we handle your data.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
