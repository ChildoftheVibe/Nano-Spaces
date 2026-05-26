'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SkeletonCard } from '@/components/ui/skeleton'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

interface RoomSummary {
  id: string
  name: string
  type: 'room' | 'building'
  description: string | null
  notes: string | null
  capacity: number | null
  photo_url: string | null
  is_active: boolean
  in_maintenance: boolean
  maintenance_from: string | null
  maintenance_to: string | null
  maintenance_note: string | null
  max_booking_duration_mins: number | null
  max_bookings_per_user_per_day: number | null
  min_notice_hours: number | null
  cancel_notice_hours: number | null
  max_advance_days: number | null
  approval_required: boolean
  nano_buffer_mins: number | null
  ghost_buster_enabled: boolean
  ghost_buster_mins: number | null
  waitlist_enabled: boolean
  upcomingCount: number
}

interface AvailabilityRule {
  id?: string
  day_of_week: number[]
  open_time: string
  close_time: string
  block_holidays: boolean
}

interface BlackoutDate {
  id: string
  title: string
  start_time: string
  end_time: string
  is_recurring: boolean
  recur_rule: string | null
}

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; room: RoomSummary }
  | { type: 'settings'; room: RoomSummary }
  | { type: 'availability'; room: RoomSummary }
  | { type: 'blackout'; room: RoomSummary }
  | { type: 'maintenance'; room: RoomSummary }

function apiError(json: unknown): string {
  const j = json as { error?: { message?: string } }
  return j.error?.message ?? 'Something went wrong.'
}

function StatusBadge({ room }: { room: RoomSummary }) {
  if (!room.is_active)
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
        Inactive
      </span>
    )
  if (room.in_maintenance)
    return (
      <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
        Maintenance
      </span>
    )
  return (
    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      Active
    </span>
  )
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white dark:bg-[#12131A] shadow-xl ring-1 ring-black/[0.08] dark:ring-white/[0.07]">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07] px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 dark:text-white/40 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/70"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ---- ADD / EDIT ROOM ----
function RoomFormModal({
  room,
  onClose,
  onSaved,
}: {
  room: RoomSummary | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(room?.name ?? '')
  const [type, setType] = useState<'room' | 'building'>(room?.type ?? 'room')
  const [description, setDescription] = useState(room?.description ?? '')
  const [notes, setNotes] = useState(room?.notes ?? '')
  const [capacity, setCapacity] = useState(room?.capacity?.toString() ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const save = async () => {
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setBusy(true)
    setError(null)

    const body: Record<string, unknown> = { name: name.trim(), type }
    if (description.trim()) body.description = description.trim()
    if (notes.trim()) body.notes = notes.trim()
    if (capacity && !isNaN(Number(capacity))) body.capacity = Number(capacity)

    let roomId = room?.id

    if (!room) {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(apiError(json))
        setBusy(false)
        return
      }
      roomId = (json as { data?: { room?: { id?: string } } }).data?.room?.id
    } else {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(apiError(json))
        setBusy(false)
        return
      }
    }

    if (photo && roomId) {
      const fd = new FormData()
      fd.append('photo', photo)
      const photoRes = await fetch(`/api/rooms/${roomId}/photo`, { method: 'POST', body: fd })
      if (!photoRes.ok) {
        const pj = await photoRes.json().catch(() => ({}))
        setError(apiError(pj))
        setBusy(false)
        return
      }
    }

    setBusy(false)
    onSaved()
  }

  const removePhoto = async () => {
    if (!room) return
    await fetch(`/api/rooms/${room.id}/photo`, { method: 'DELETE' })
    onSaved()
  }

  const displayPhoto = photoPreview ?? room?.photo_url ?? null

  return (
    <ModalShell title={room ? 'Edit Room' : 'Add Room'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="room-name">Name *</Label>
          <Input
            id="room-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Conference Room A"
          />
        </div>

        <div>
          <Label>Type</Label>
          <div className="mt-1 flex gap-4">
            {(['room', 'building'] as const).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="room-type"
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="accent-[var(--brand-primary)]"
                />
                <span className="text-sm capitalize dark:text-white/80">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="room-cap">Capacity</Label>
          <Input
            id="room-cap"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="e.g. 12"
          />
        </div>

        <div>
          <Label htmlFor="room-desc">Description</Label>
          <textarea
            id="room-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full resize-none rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA5D0C] placeholder:text-gray-400 dark:placeholder:text-white/25"
            placeholder="Short description shown to users"
          />
        </div>

        <div>
          <Label htmlFor="room-notes">Admin Notes</Label>
          <textarea
            id="room-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full resize-none rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA5D0C] placeholder:text-gray-400 dark:placeholder:text-white/25"
            placeholder="Internal notes (not shown to users)"
          />
        </div>

        <div>
          <Label>Photo</Label>
          <div className="mt-1 flex items-center gap-3">
            {displayPhoto && (
              <Image
                src={displayPhoto}
                alt="Room preview"
                width={96}
                height={64}
                unoptimized
                className="rounded-md object-cover"
              />
            )}
            <Button variant="outline" size="sm" onClick={() => photoRef.current?.click()}>
              {photo ? 'Change' : room?.photo_url ? 'Replace' : 'Upload'}
            </Button>
            {room?.photo_url && !photo && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--color-danger)]"
                onClick={() => void removePhoto()}
              >
                Remove
              </Button>
            )}
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-white/35">
            JPEG, PNG, or WebP — max 5 MB
          </p>
        </div>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}

// ---- SETTINGS ----
function SettingsModal({
  room,
  onClose,
  onSaved,
}: {
  room: RoomSummary
  onClose: () => void
  onSaved: () => void
}) {
  const [maxDuration, setMaxDuration] = useState(room.max_booking_duration_mins?.toString() ?? '')
  const [maxPerDay, setMaxPerDay] = useState(room.max_bookings_per_user_per_day?.toString() ?? '')
  const [minNotice, setMinNotice] = useState(room.min_notice_hours?.toString() ?? '0')
  const [cancelNotice, setCancelNotice] = useState(room.cancel_notice_hours?.toString() ?? '0')
  const [maxAdvance, setMaxAdvance] = useState(room.max_advance_days?.toString() ?? '60')
  const [approvalRequired, setApprovalRequired] = useState(room.approval_required)
  const [bufferMins, setBufferMins] = useState(room.nano_buffer_mins?.toString() ?? '0')
  const [ghostBusterEnabled, setGhostBusterEnabled] = useState(room.ghost_buster_enabled)
  const [ghostBusterMins, setGhostBusterMins] = useState(room.ghost_buster_mins?.toString() ?? '15')
  const [waitlistEnabled, setWaitlistEnabled] = useState(room.waitlist_enabled)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    const body: Record<string, unknown> = {
      approval_required: approvalRequired,
      nano_buffer_mins: Number(bufferMins) || 0,
      ghost_buster_enabled: ghostBusterEnabled,
      ghost_buster_mins: Number(ghostBusterMins) || 15,
      min_notice_hours: Number(minNotice) || 0,
      cancel_notice_hours: Number(cancelNotice) || 0,
      max_advance_days: Number(maxAdvance) || 60,
      waitlist_enabled: waitlistEnabled,
    }
    if (maxDuration) body.max_booking_duration_mins = Number(maxDuration)
    if (maxPerDay) body.max_bookings_per_user_per_day = Number(maxPerDay)

    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(apiError(json))
      setBusy(false)
      return
    }
    setBusy(false)
    onSaved()
  }

  return (
    <ModalShell title={`Settings — ${room.name}`} onClose={onClose}>
      <div className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-[var(--text-primary)]">Booking Limits</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="max-dur">Max duration (mins)</Label>
              <Input
                id="max-dur"
                type="number"
                min={15}
                max={1440}
                value={maxDuration}
                onChange={(e) => setMaxDuration(e.target.value)}
                placeholder="No limit"
              />
            </div>
            <div>
              <Label htmlFor="max-day">Max per user per day</Label>
              <Input
                id="max-day"
                type="number"
                min={1}
                max={99}
                value={maxPerDay}
                onChange={(e) => setMaxPerDay(e.target.value)}
                placeholder="No limit"
              />
            </div>
            <div>
              <Label htmlFor="min-notice">Min notice (hours)</Label>
              <Input
                id="min-notice"
                type="number"
                min={0}
                max={168}
                value={minNotice}
                onChange={(e) => setMinNotice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cancel-notice">Cancel notice (hours)</Label>
              <Input
                id="cancel-notice"
                type="number"
                min={0}
                max={168}
                value={cancelNotice}
                onChange={(e) => setCancelNotice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="max-advance">Max advance (days)</Label>
              <Input
                id="max-advance"
                type="number"
                min={1}
                max={365}
                value={maxAdvance}
                onChange={(e) => setMaxAdvance(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Approval Required</p>
            <p className="text-xs text-gray-500">
              Bookings need admin approval before confirmation
            </p>
          </div>
          <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-[var(--text-primary)]">
            Buffer &amp; Ghost Buster
          </legend>
          <div>
            <Label htmlFor="buffer">Buffer between bookings (mins)</Label>
            <Input
              id="buffer"
              type="number"
              min={0}
              max={60}
              value={bufferMins}
              onChange={(e) => setBufferMins(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Ghost Buster</p>
              <p className="text-xs text-gray-500 dark:text-white/40">
                Auto-cancel if check-in not confirmed
              </p>
            </div>
            <Switch checked={ghostBusterEnabled} onCheckedChange={setGhostBusterEnabled} />
          </div>
          {ghostBusterEnabled && (
            <div>
              <Label htmlFor="ghost-mins">Cancel after (mins)</Label>
              <Input
                id="ghost-mins"
                type="number"
                min={5}
                max={120}
                value={ghostBusterMins}
                onChange={(e) => setGhostBusterMins(e.target.value)}
              />
            </div>
          )}
        </fieldset>

        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Waitlist</p>
            <p className="text-xs text-gray-500">
              Allow users to join a waitlist when a slot is fully booked
            </p>
          </div>
          <Switch checked={waitlistEnabled} onCheckedChange={setWaitlistEnabled} />
        </div>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}

// ---- AVAILABILITY ----
function AvailabilityModal({
  room,
  onClose,
  onSaved,
}: {
  room: RoomSummary
  onClose: () => void
  onSaved: (flagged: number) => void
}) {
  const [rules, setRules] = useState<AvailabilityRule[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/rooms/${room.id}/availability`)
      .then((r) => r.json())
      .then((j: unknown) => {
        const data = (j as { data?: { rules?: AvailabilityRule[] } }).data
        const loaded = data?.rules ?? []
        setRules(
          loaded.length > 0
            ? loaded.map((r) => ({
                ...r,
                open_time: r.open_time.slice(0, 5),
                close_time: r.close_time.slice(0, 5),
              }))
            : [
                {
                  day_of_week: [1, 2, 3, 4, 5],
                  open_time: '09:00',
                  close_time: '17:00',
                  block_holidays: false,
                },
              ],
        )
      })
      .catch(() => setRules([]))
  }, [room.id])

  const updateRule = (i: number, patch: Partial<AvailabilityRule>) => {
    setRules((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : prev))
  }

  const toggleDay = (ruleIdx: number, day: number) => {
    setRules((prev) =>
      prev
        ? prev.map((r, idx) => {
            if (idx !== ruleIdx) return r
            const days = r.day_of_week.includes(day)
              ? r.day_of_week.filter((d) => d !== day)
              : [...r.day_of_week, day].sort((a, b) => a - b)
            return { ...r, day_of_week: days }
          })
        : prev,
    )
  }

  const addRule = () => {
    setRules((prev) => [
      ...(prev ?? []),
      {
        day_of_week: [1, 2, 3, 4, 5],
        open_time: '09:00',
        close_time: '17:00',
        block_holidays: false,
      },
    ])
  }

  const removeRule = (i: number) => {
    setRules((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev))
  }

  const save = async () => {
    if (!rules) return
    for (const r of rules) {
      if (r.day_of_week.length === 0) {
        setError('Each rule must have at least one day.')
        return
      }
      if (r.open_time >= r.close_time) {
        setError('Open time must be before close time.')
        return
      }
    }
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/rooms/${room.id}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(apiError(json))
      setBusy(false)
      return
    }
    const flagged = (json as { data?: { flagged?: number } }).data?.flagged ?? 0
    setBusy(false)
    onSaved(flagged)
  }

  if (rules === null) {
    return (
      <ModalShell title={`Availability — ${room.name}`} onClose={onClose}>
        <p className="text-sm text-gray-400 dark:text-white/35">Loading…</p>
      </ModalShell>
    )
  }

  return (
    <ModalShell title={`Availability — ${room.name}`} onClose={onClose}>
      <div className="space-y-4">
        {rules.map((rule, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--text-primary)]">Rule {i + 1}</p>
              {rules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRule(i)}
                  className="text-xs text-[var(--color-danger)] hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-xs text-gray-500">Days</p>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d, di) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i, di)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      rule.day_of_week.includes(di)
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/[0.10]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Open</Label>
                <Input
                  type="time"
                  value={rule.open_time}
                  onChange={(e) => updateRule(i, { open_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Close</Label>
                <Input
                  type="time"
                  value={rule.close_time}
                  onChange={(e) => updateRule(i, { close_time: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id={`block-holidays-${i}`}
                checked={rule.block_holidays}
                onCheckedChange={(v) => updateRule(i, { block_holidays: v })}
              />
              <Label htmlFor={`block-holidays-${i}`} className="cursor-pointer text-sm">
                Block US federal holidays
              </Label>
            </div>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addRule} className="w-full">
          + Add Rule
        </Button>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}

// ---- BLACKOUT DATES ----
function BlackoutModal({
  room,
  onClose,
  onChanged,
}: {
  room: RoomSummary
  onClose: () => void
  onChanged: () => void
}) {
  const [blackouts, setBlackouts] = useState<BlackoutDate[] | null>(null)
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurRule, setRecurRule] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBlackouts = useCallback(async () => {
    const res = await fetch(`/api/rooms/${room.id}/blackouts`)
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      setBlackouts((json as { data?: { blackouts?: BlackoutDate[] } }).data?.blackouts ?? [])
    }
  }, [room.id])

  useEffect(() => {
    void fetchBlackouts()
  }, [fetchBlackouts])

  const add = async () => {
    if (!title.trim() || !startTime || !endTime) {
      setError('Title, start, and end are required.')
      return
    }
    setAdding(true)
    setError(null)
    const body: Record<string, unknown> = {
      title: title.trim(),
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      is_recurring: isRecurring,
    }
    if (isRecurring && recurRule.trim()) body.recur_rule = recurRule.trim()

    const res = await fetch(`/api/rooms/${room.id}/blackouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(apiError(json))
      setAdding(false)
      return
    }
    setTitle('')
    setStartTime('')
    setEndTime('')
    setIsRecurring(false)
    setRecurRule('')
    setAdding(false)
    await fetchBlackouts()
    onChanged()
  }

  const remove = async (blackoutId: string) => {
    const res = await fetch(`/api/rooms/${room.id}/blackouts/${blackoutId}`, { method: 'DELETE' })
    if (res.ok) {
      setBlackouts((prev) => prev?.filter((b) => b.id !== blackoutId) ?? prev)
      onChanged()
    }
  }

  return (
    <ModalShell title={`Blackout Dates — ${room.name}`} onClose={onClose}>
      <div className="space-y-4">
        {blackouts === null ? (
          <p className="text-sm text-gray-400 dark:text-white/35">Loading…</p>
        ) : blackouts.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-white/35">No blackout dates.</p>
        ) : (
          <ul className="space-y-2">
            {blackouts.map((b) => (
              <li
                key={b.id}
                className="flex items-start justify-between rounded-lg border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{b.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(b.start_time).toLocaleString()} —{' '}
                    {new Date(b.end_time).toLocaleString()}
                    {b.is_recurring && ' · Recurring'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(b.id)}
                  className="ml-3 text-xs text-[var(--color-danger)] hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">Add Blackout</p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="bo-title">Title</Label>
              <Input
                id="bo-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Holiday closure"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bo-start">Start</Label>
                <Input
                  id="bo-start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bo-end">End</Label>
                <Input
                  id="bo-end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="bo-recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
              <Label htmlFor="bo-recurring" className="cursor-pointer text-sm">
                Recurring
              </Label>
            </div>
            {isRecurring && (
              <div>
                <Label htmlFor="bo-rule">Recurrence rule (RRULE)</Label>
                <Input
                  id="bo-rule"
                  value={recurRule}
                  onChange={(e) => setRecurRule(e.target.value)}
                  placeholder="FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25"
                />
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => void add()} disabled={adding}>
            {adding ? 'Adding…' : 'Add Blackout'}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}

// ---- MAINTENANCE ----
function MaintenanceModal({
  room,
  onClose,
  onSaved,
}: {
  room: RoomSummary
  onClose: () => void
  onSaved: (flagged: number) => void
}) {
  const [enabled, setEnabled] = useState(room.in_maintenance)
  const [from, setFrom] = useState(
    room.maintenance_from ? new Date(room.maintenance_from).toISOString().slice(0, 16) : '',
  )
  const [to, setTo] = useState(
    room.maintenance_to ? new Date(room.maintenance_to).toISOString().slice(0, 16) : '',
  )
  const [note, setNote] = useState(room.maintenance_note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (enabled && (!from || !to)) {
      setError('From and To are required.')
      return
    }
    setBusy(true)
    setError(null)

    const body = enabled
      ? {
          enabled: true as const,
          maintenance_from: new Date(from).toISOString(),
          maintenance_to: new Date(to).toISOString(),
          ...(note.trim() ? { maintenance_note: note.trim() } : {}),
        }
      : { enabled: false as const }

    const res = await fetch(`/api/rooms/${room.id}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(apiError(json))
      setBusy(false)
      return
    }
    const flagged = (json as { data?: { flagged?: number } }).data?.flagged ?? 0
    setBusy(false)
    onSaved(flagged)
  }

  return (
    <ModalShell title={`Maintenance — ${room.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Maintenance Mode</p>
            <p className="text-xs text-gray-500">
              Blocks new bookings and flags existing reservations
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="maint-from">From</Label>
                <Input
                  id="maint-from"
                  type="datetime-local"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="maint-to">To</Label>
                <Input
                  id="maint-to"
                  type="datetime-local"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="maint-note">Reason (shown to affected users)</Label>
              <textarea
                id="maint-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA5D0C] placeholder:text-gray-400 dark:placeholder:text-white/25"
                placeholder="HVAC maintenance, electrical work, etc."
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}

// ---- ROOM CARD ----
function RoomCard({
  room,
  onAction,
}: {
  room: RoomSummary
  onAction: (
    action: 'edit' | 'settings' | 'availability' | 'blackout' | 'maintenance' | 'delete',
    room: RoomSummary,
  ) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="relative flex flex-col rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] shadow-sm transition-shadow hover:shadow-md">
      <div className="relative h-36 overflow-hidden rounded-t-xl bg-gray-100 dark:bg-white/[0.04]">
        {room.photo_url ? (
          <Image src={room.photo_url} alt={room.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl text-gray-200 dark:text-white/10">
            {room.type === 'building' ? '🏢' : '🚪'}
          </div>
        )}
        <div className="absolute right-2 top-2">
          <StatusBadge room={room} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-heading font-semibold text-[var(--text-primary)]">
              {room.name}
            </p>
            <p className="text-xs capitalize text-gray-500 dark:text-white/40">
              {room.type}
              {room.capacity !== null ? ` · ${room.capacity} cap` : ''}
            </p>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded p-1 text-gray-400 dark:text-white/40 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/70"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border dark:border-white/[0.08] bg-white dark:bg-[#12131A] py-1 shadow-lg">
                {(
                  [
                    { action: 'edit', label: 'Edit Room' },
                    { action: 'settings', label: 'Booking Settings' },
                    { action: 'availability', label: 'Availability' },
                    { action: 'blackout', label: 'Blackout Dates' },
                    { action: 'maintenance', label: 'Maintenance' },
                  ] as const
                ).map(({ action, label }) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onAction(action, room)
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/[0.05] dark:text-white/80"
                  >
                    {label}
                  </button>
                ))}
                <hr className="my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onAction('delete', room)
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-[var(--color-danger)] hover:bg-red-50"
                >
                  Deactivate
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500 dark:text-white/40">
          {room.upcomingCount} upcoming booking{room.upcomingCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}

// ---- PAGE ----
export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [tierLimitReached, setTierLimitReached] = useState(false)
  const [roomLimit, setRoomLimit] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const fetchRooms = useCallback(async () => {
    const res = await fetch('/api/rooms')
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      const d = (
        json as {
          data?: {
            rooms?: RoomSummary[]
            tierLimitReached?: boolean
            roomLimit?: number | null
          }
        }
      ).data
      setRooms(d?.rooms ?? [])
      setTierLimitReached(d?.tierLimitReached ?? false)
      setRoomLimit(d?.roomLimit ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchRooms()
  }, [fetchRooms])

  const handleAction = async (
    action: 'edit' | 'settings' | 'availability' | 'blackout' | 'maintenance' | 'delete',
    room: RoomSummary,
  ) => {
    if (action === 'delete') {
      if (!confirm(`Deactivate "${room.name}"? It will no longer be available for bookings.`))
        return
      const res = await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Room deactivated.')
        await fetchRooms()
      }
      return
    }
    if (action === 'edit') {
      setModal({ type: 'edit', room })
    } else if (action === 'settings') {
      setModal({ type: 'settings', room })
    } else if (action === 'availability') {
      setModal({ type: 'availability', room })
    } else if (action === 'blackout') {
      setModal({ type: 'blackout', room })
    } else {
      setModal({ type: 'maintenance', room })
    }
  }

  const closeModal = () => setModal({ type: 'none' })

  const afterSave = async (msg?: string) => {
    closeModal()
    await fetchRooms()
    if (msg) showToast(msg)
  }

  const activeCount = rooms.filter((r) => r.is_active).length

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 h-8 w-24 animate-pulse rounded-lg bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">Rooms</h1>
          {roomLimit !== null && (
            <p className="mt-1 text-sm text-gray-500">
              {activeCount} / {roomLimit} active
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {toast && <p className="text-sm text-gray-600">{toast}</p>}
          <Button
            onClick={() => setModal({ type: 'add' })}
            disabled={tierLimitReached}
            title={tierLimitReached ? `Room limit reached (${roomLimit ?? 0})` : undefined}
          >
            Add Room
          </Button>
        </div>
      </div>

      {tierLimitReached && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          You&apos;ve reached your plan&apos;s room limit ({roomLimit}). Upgrade to add more rooms.
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="mb-3 text-4xl">🚪</p>
          <p className="font-heading text-lg font-semibold text-[var(--text-primary)]">
            No rooms yet
          </p>
          <p className="mt-1 text-sm text-gray-500">Add your first room to get started.</p>
          <Button className="mt-4" onClick={() => setModal({ type: 'add' })}>
            Add Room
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onAction={(action, r) => void handleAction(action, r)}
            />
          ))}
        </div>
      )}

      {modal.type === 'add' && (
        <RoomFormModal
          room={null}
          onClose={closeModal}
          onSaved={() => void afterSave('Room created.')}
        />
      )}
      {modal.type === 'edit' && (
        <RoomFormModal
          room={modal.room}
          onClose={closeModal}
          onSaved={() => void afterSave('Room updated.')}
        />
      )}
      {modal.type === 'settings' && (
        <SettingsModal
          room={modal.room}
          onClose={closeModal}
          onSaved={() => void afterSave('Settings saved.')}
        />
      )}
      {modal.type === 'availability' && (
        <AvailabilityModal
          room={modal.room}
          onClose={closeModal}
          onSaved={(flagged) =>
            void afterSave(
              flagged > 0
                ? `Saved. ${flagged} reservation${flagged !== 1 ? 's' : ''} flagged.`
                : 'Availability saved.',
            )
          }
        />
      )}
      {modal.type === 'blackout' && (
        <BlackoutModal room={modal.room} onClose={closeModal} onChanged={() => void fetchRooms()} />
      )}
      {modal.type === 'maintenance' && (
        <MaintenanceModal
          room={modal.room}
          onClose={closeModal}
          onSaved={(flagged) =>
            void afterSave(
              flagged > 0
                ? `Maintenance set. ${flagged} reservation${flagged !== 1 ? 's' : ''} flagged.`
                : 'Maintenance updated.',
            )
          }
        />
      )}
    </div>
  )
}
