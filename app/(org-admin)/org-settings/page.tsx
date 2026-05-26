'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const settingsSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(100),
  primary_timezone: z.string().min(1, 'Timezone is required'),
  email_signature: z.string().max(500).optional(),
})

type SettingsForm = z.infer<typeof settingsSchema>

interface OrgData {
  id: string
  display_name: string
  name: string
  slug: string
  logo_url: string | null
  primary_timezone: string
  email_signature: string | null
  subscription_tier: string
  tier_room_limit: number
  tier_admin_limit: number
  tier_user_limit: number | null
}

const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
    ]
  }
})()

export default function OrgSettingsPage() {
  const [org, setOrg] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [announcement, setAnnouncement] = useState('')
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false)
  const [announcementStatus, setAnnouncementStatus] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsForm>({ resolver: zodResolver(settingsSchema) })

  useEffect(() => {
    fetch('/api/org/settings')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.org) {
          const o = json.data.org as OrgData
          setOrg(o)
          setLogoPreview(o.logo_url)
          reset({
            display_name: o.display_name,
            primary_timezone: o.primary_timezone,
            email_signature: o.email_signature ?? '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [reset])

  const onSave = async (data: SettingsForm) => {
    setSaveStatus('saving')
    const res = await fetch('/api/org/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: data.display_name,
        primary_timezone: data.primary_timezone,
        email_signature: data.email_signature || null,
      }),
    })
    if (res.ok) {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } else {
      setSaveStatus('error')
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError(null)

    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo must be 2MB or smaller.')
      return
    }

    const preview = URL.createObjectURL(file)
    setLogoPreview(preview)
    setLogoUploading(true)

    const formData = new FormData()
    formData.append('logo', file)

    const res = await fetch('/api/org/logo', { method: 'POST', body: formData })
    setLogoUploading(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setLogoError((json as { error?: { message?: string } }).error?.message ?? 'Upload failed.')
      setLogoPreview(org?.logo_url ?? null)
    }
  }

  const sendAnnouncement = async () => {
    if (!announcement.trim()) return
    setSendingAnnouncement(true)
    setAnnouncementStatus(null)

    const res = await fetch('/api/org/announce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: announcement }),
    })

    if (res.ok) {
      const json = await res.json()
      const count = (json as { data?: { sent?: number } }).data?.sent ?? 0
      setAnnouncementStatus(`Sent to ${count} member${count !== 1 ? 's' : ''}.`)
      setAnnouncement('')
    } else {
      setAnnouncementStatus('Failed to send announcement.')
    }
    setSendingAnnouncement(false)
  }

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-12 text-sm text-gray-500">Loading…</div>
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-heading mb-8 text-2xl font-bold text-gray-900 dark:text-white">
        Org Settings
      </h1>

      {/* General settings */}
      <section className="mb-8 rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] p-6">
        <h2 className="mb-5 text-base font-semibold text-gray-900">General</h2>

        <form onSubmit={(e) => void handleSubmit(onSave)(e)} className="space-y-4">
          <div>
            <Label htmlFor="display_name">Display Name</Label>
            <Input id="display_name" {...register('display_name')} className="mt-1" />
            {errors.display_name && (
              <p className="mt-1 text-xs text-[var(--color-danger)]">
                {errors.display_name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={org?.slug ?? ''} disabled className="mt-1 bg-gray-50" />
            <p className="mt-1 text-xs text-gray-400">Slug cannot be changed after creation.</p>
          </div>

          <div>
            <Label htmlFor="primary_timezone">Primary Timezone</Label>
            <select
              id="primary_timezone"
              {...register('primary_timezone')}
              className="mt-1 block w-full rounded-md border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.04] dark:text-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="email_signature">Email Signature</Label>
            <textarea
              id="email_signature"
              {...register('email_signature')}
              rows={3}
              placeholder="Added to org announcement emails…"
              className="mt-1 block w-full rounded-md border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.04] dark:text-white/80 dark:placeholder:text-white/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] resize-none"
            />
            {errors.email_signature && (
              <p className="mt-1 text-xs text-[var(--color-danger)]">
                {errors.email_signature.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={!isDirty || saveStatus === 'saving'} className="w-full">
            {saveStatus === 'saving'
              ? 'Saving…'
              : saveStatus === 'saved'
                ? 'Saved!'
                : 'Save Changes'}
          </Button>
          {saveStatus === 'error' && (
            <p className="text-xs text-[var(--color-danger)]">Failed to save. Please try again.</p>
          )}
        </form>
      </section>

      {/* Logo upload */}
      <section className="mb-8 rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] p-6">
        <h2 className="mb-5 text-base font-semibold text-gray-900">Organisation Logo</h2>
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-gray-400 dark:text-white/30">No logo</span>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handleLogoChange(e)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
            >
              {logoUploading ? 'Uploading…' : 'Upload Logo'}
            </Button>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-white/30">
              JPEG, PNG, or WebP — max 2MB
            </p>
            {logoError && <p className="mt-1 text-xs text-[var(--color-danger)]">{logoError}</p>}
          </div>
        </div>
      </section>

      {/* Subscription info */}
      <section className="mb-8 rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Plan</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 dark:bg-white/[0.04] p-3">
            <p className="text-xs text-gray-500 dark:text-white/45">Tier</p>
            <p className="font-medium capitalize">{org?.subscription_tier ?? '—'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-white/[0.04] p-3">
            <p className="text-xs text-gray-500 dark:text-white/45">Rooms limit</p>
            <p className="font-medium">{org?.tier_room_limit ?? 'Unlimited'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-white/[0.04] p-3">
            <p className="text-xs text-gray-500 dark:text-white/45">Admins limit</p>
            <p className="font-medium">{org?.tier_admin_limit ?? 'Unlimited'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-white/[0.04] p-3">
            <p className="text-xs text-gray-500 dark:text-white/45">Users limit</p>
            <p className="font-medium">{org?.tier_user_limit ?? 'Unlimited'}</p>
          </div>
        </div>
      </section>

      {/* Announcement composer */}
      <section className="rounded-xl border bg-white p-6">
        <h2 className="mb-2 text-base font-semibold text-gray-900">Send Announcement</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-white/45">
          Send a message to all active members of your organisation.
        </p>
        <textarea
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Write your announcement…"
          className="mb-3 block w-full rounded-md border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.04] dark:text-white/80 dark:placeholder:text-white/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] resize-none"
        />
        {announcementStatus && (
          <p className="mb-3 text-sm text-gray-600 dark:text-white/60">{announcementStatus}</p>
        )}
        <Button
          onClick={() => void sendAnnouncement()}
          disabled={!announcement.trim() || sendingAnnouncement}
          className="w-full"
        >
          {sendingAnnouncement ? 'Sending…' : 'Send to All Members'}
        </Button>
      </section>
    </div>
  )
}
