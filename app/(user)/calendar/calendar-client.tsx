'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, EventClickArg, DatesSetArg } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  QrCode,
  CheckCircle,
  AlertTriangle,
  Shield,
} from 'lucide-react'
import { fromZonedTime } from 'date-fns-tz'
import { createEvent, createEvents } from 'ics'
import type { EventAttributes } from 'ics'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  id: string
  name: string
  type: 'room' | 'building'
  capacity: number | null
  min_notice_hours: number
  cancel_notice_hours: number
  max_advance_days: number
  max_booking_duration_mins: number | null
  nano_buffer_mins: number
  approval_required: boolean
  waitlist_enabled?: boolean
}

interface CalReservation {
  id: string
  title: string
  notes: string | null
  location_id: string
  room_name: string
  booked_by: string | null
  booker_name: string
  start_time: string
  end_time: string
  status: string
  is_mine: boolean
  nano_buffer_mins: number
  recurring_group_id: string | null
  checked_in: boolean
  waitlist_expires_at: string | null
  god_mode_override: boolean
}

interface BlackoutDate {
  id: string
  title: string
  location_id: string | null
  start_time: string
  end_time: string
}

interface MaintenanceWindow {
  id: string
  room_name: string
  maintenance_from: string
  maintenance_to: string
  maintenance_note: string | null
}

type View = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

type ModalState =
  | { type: 'none' }
  | { type: 'new'; date?: string; startTime?: string; prefill?: Partial<BookingFormData> }
  | { type: 'view'; reservation: CalReservation }
  | { type: 'qr'; reservation: CalReservation }
  | { type: 'waitlist_confirm'; reservationId: string }

// ─── Booking form schema ───────────────────────────────────────────────────────

const recurringSchema = z
  .object({
    frequency: z.enum(['daily', 'weekly', 'specific_days']),
    days_of_week: z.array(z.number()).optional(),
    end_type: z.enum(['date', 'count']),
    end_date: z.string().optional(),
    occurrences: z.number().min(1).max(52).optional(),
  })
  .optional()

const bookingSchema = z
  .object({
    location_id: z.string().min(1, 'Select a room'),
    title: z.string().min(1, 'Title is required').max(200),
    notes: z.string().max(1000).optional(),
    date: z.string().min(1, 'Date is required'),
    start_time_local: z.string().min(1, 'Start time is required'),
    end_time_local: z.string().min(1, 'End time is required'),
    is_recurring: z.boolean().optional(),
    recurring: recurringSchema,
  })
  .refine((d) => d.end_time_local > d.start_time_local, {
    message: 'End time must be after start time',
    path: ['end_time_local'],
  })

type BookingFormData = z.infer<typeof bookingSchema>

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── DST detection ────────────────────────────────────────────────────────────

function detectDstShift(startIso: string, durationDays: number, tz: string): boolean {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
    const start = new Date(startIso)
    const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000)
    const startParts = fmt.formatToParts(start)
    const endParts = fmt.formatToParts(end)
    const startTz = startParts.find((p) => p.type === 'timeZoneName')?.value ?? ''
    const endTz = endParts.find((p) => p.type === 'timeZoneName')?.value ?? ''
    return startTz !== endTz
  } catch {
    return false
  }
}

// ─── ICS helpers ──────────────────────────────────────────────────────────────

function toDateArray(iso: string): [number, number, number, number, number] {
  const d = new Date(iso)
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ]
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function buildIcsAttrs(r: CalReservation): EventAttributes {
  return {
    title: r.title,
    start: toDateArray(r.start_time),
    startInputType: 'utc',
    end: toDateArray(r.end_time),
    endInputType: 'utc',
    location: r.room_name,
    ...(r.notes != null ? { description: r.notes } : {}),
    organizer: { name: 'Nano Spaces', email: 'noreply@nanospaces.app' },
  }
}

function downloadSingleIcs(r: CalReservation) {
  createEvent(buildIcsAttrs(r), (err, value) => {
    if (!err) triggerDownload(`booking-${r.id.slice(0, 8)}.ics`, value)
  })
}

function downloadBulkIcs(reservations: CalReservation[]) {
  const attrs: EventAttributes[] = reservations.map(buildIcsAttrs)
  createEvents(attrs, (err, value) => {
    if (!err) triggerDownload('nano-spaces-bookings.ics', value)
  })
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-blue-50 text-blue-700',
    pending: 'bg-yellow-50 text-yellow-700',
    flagged: 'bg-red-50 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
    waitlisted: 'bg-orange-50 text-orange-700',
  }
  const cls = styles[status] ?? 'bg-gray-100 text-gray-500'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {status}
    </span>
  )
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`max-h-[90vh] w-full ${wide ? 'max-w-lg' : 'max-w-md'} overflow-y-auto rounded-2xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Recurring form section ────────────────────────────────────────────────────

function RecurringSection({
  control,
  register,
  watch,
  setValue,
}: {
  control: ReturnType<typeof useForm<BookingFormData>>['control']
  register: ReturnType<typeof useForm<BookingFormData>>['register']
  watch: ReturnType<typeof useForm<BookingFormData>>['watch']
  setValue: ReturnType<typeof useForm<BookingFormData>>['setValue']
}) {
  const isRecurring = useWatch({ control, name: 'is_recurring' })
  const frequency = useWatch({ control, name: 'recurring.frequency' }) ?? 'weekly'
  const endType = useWatch({ control, name: 'recurring.end_type' }) ?? 'count'
  const days = (useWatch({ control, name: 'recurring.days_of_week' }) as number[] | undefined) ?? []
  const startDate = watch('date')
  const startIso = startDate ? new Date(startDate + 'T12:00:00').toISOString() : ''

  const hasDst =
    isRecurring && startIso
      ? detectDstShift(
          startIso,
          endType === 'count' ? 84 : 365,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        )
      : false

  const toggleDay = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d]
    setValue('recurring.days_of_week', next)
  }

  if (!isRecurring) return null

  return (
    <div className="mt-1 space-y-4 rounded-xl border border-purple-100 bg-purple-50/30 p-4">
      {hasDst && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This series may cross a DST transition. Booking times will shift by ±1 hour on the
            transition date.
          </span>
        </div>
      )}

      <div>
        <Label className="text-xs font-medium text-gray-700">Repeat</Label>
        <div className="mt-1.5 flex gap-1">
          {(['daily', 'weekly', 'specific_days'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setValue('recurring.frequency', f)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                frequency === f
                  ? 'border-[#4F7EFA] bg-[#4F7EFA] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#4F7EFA]/50'
              }`}
            >
              {f === 'specific_days' ? 'Custom' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {frequency === 'specific_days' && (
        <div>
          <Label className="text-xs font-medium text-gray-700">Days of week</Label>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {DOW_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  days.includes(i)
                    ? 'border-[#4F7EFA] bg-[#4F7EFA] text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-[#4F7EFA]/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs font-medium text-gray-700">Ends</Label>
        <div className="mt-1.5 flex gap-1">
          {(['count', 'date'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue('recurring.end_type', t)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                endType === t
                  ? 'border-[#4F7EFA] bg-[#4F7EFA] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#4F7EFA]/50'
              }`}
            >
              {t === 'count' ? 'After N times' : 'On date'}
            </button>
          ))}
        </div>
      </div>

      {endType === 'count' ? (
        <div>
          <Label htmlFor="rec-count" className="text-xs font-medium text-gray-700">
            Occurrences (max 52)
          </Label>
          <Input
            id="rec-count"
            type="number"
            min={1}
            max={52}
            defaultValue={4}
            {...register('recurring.occurrences', { valueAsNumber: true })}
            className="mt-1"
          />
        </div>
      ) : (
        <div>
          <Label htmlFor="rec-end-date" className="text-xs font-medium text-gray-700">
            End date
          </Label>
          <Input
            id="rec-end-date"
            type="date"
            {...register('recurring.end_date')}
            className="mt-1"
          />
        </div>
      )}
    </div>
  )
}

// ─── New Booking Modal ────────────────────────────────────────────────────────

function NewBookingModal({
  rooms,
  userTimezone,
  defaultDate,
  defaultStartTime,
  prefill,
  isAdmin,
  onClose,
  onBooked,
}: {
  rooms: Room[]
  userTimezone: string
  defaultDate?: string
  defaultStartTime?: string
  prefill?: Partial<BookingFormData>
  isAdmin?: boolean
  onClose: () => void
  onBooked: (msg: string) => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      location_id: prefill?.location_id ?? '',
      title: prefill?.title ?? '',
      notes: prefill?.notes ?? '',
      date: prefill?.date ?? defaultDate ?? new Date().toISOString().slice(0, 10),
      start_time_local: prefill?.start_time_local ?? defaultStartTime ?? '09:00',
      end_time_local: prefill?.end_time_local ?? '10:00',
      is_recurring: false,
      recurring: { frequency: 'weekly', end_type: 'count', occurrences: 4 },
    },
  })

  const selectedRoomId = watch('location_id')
  const isRecurring = watch('is_recurring')
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)
  const [showWaitlistPrompt, setShowWaitlistPrompt] = useState(false)
  const [pendingBody, setPendingBody] = useState<Record<string, unknown> | null>(null)
  const [godModeActive, setGodModeActive] = useState(false)
  const [showGodModeDialog, setShowGodModeDialog] = useState(false)
  const [godModeReason, setGodModeReason] = useState('')
  const [godModeDialogReason, setGodModeDialogReason] = useState('')
  const [godModeReasonError, setGodModeReasonError] = useState<string | null>(null)

  const submitBooking = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      if (res.status === 409 && selectedRoom?.waitlist_enabled && !body['waitlist']) {
        setShowWaitlistPrompt(true)
        setPendingBody(body)
        return
      }
      const msg = (json as { error?: { message?: string } }).error?.message ?? 'Booking failed.'
      setError('root', { message: msg })
      return
    }

    setShowWaitlistPrompt(false)
    setPendingBody(null)
    const resData = (
      json as { data?: { reservationIds?: string[]; skipped?: number; status?: string } }
    ).data
    if (resData?.reservationIds) {
      const created = resData.reservationIds.length
      const skipped = resData.skipped ?? 0
      onBooked(
        `${created} recurring booking${created !== 1 ? 's' : ''} created${skipped > 0 ? ` (${skipped} skipped due to conflicts)` : ''}.`,
      )
    } else if (resData?.status === 'waitlisted') {
      onBooked('Added to waitlist. You will be notified when a slot opens.')
    } else {
      onBooked(
        resData?.status === 'pending' ? 'Booking submitted for approval.' : 'Booking created.',
      )
    }
  }

  const onSubmit = async (data: BookingFormData) => {
    const startIso = fromZonedTime(
      new Date(`${data.date}T${data.start_time_local}`),
      userTimezone,
    ).toISOString()
    const endIso = fromZonedTime(
      new Date(`${data.date}T${data.end_time_local}`),
      userTimezone,
    ).toISOString()

    const body: Record<string, unknown> = {
      location_id: data.location_id,
      title: data.title,
      notes: data.notes || undefined,
      start_time: startIso,
      end_time: endIso,
    }

    if (godModeActive) {
      const res = await fetch('/api/reservations/god-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, god_mode_reason: godModeReason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError('root', {
          message:
            (json as { error?: { message?: string } }).error?.message ?? 'God Mode booking failed.',
        })
        return
      }
      const resData = (json as { data?: { displacedCount?: number } }).data
      onBooked(
        `God Mode booking created.${resData?.displacedCount ? ` ${resData.displacedCount} existing booking(s) displaced.` : ''}`,
      )
      return
    }

    if (data.is_recurring && data.recurring) {
      body.recurring = data.recurring
    }

    await submitBooking(body)
  }

  return (
    <ModalShell title="New Booking" onClose={onClose} wide>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
        {selectedRoom?.min_notice_hours ? (
          <div className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
            Requires {selectedRoom.min_notice_hours}h advance notice · Cancellations need{' '}
            {selectedRoom.cancel_notice_hours}h notice
            {selectedRoom.approval_required && ' · Requires admin approval'}
          </div>
        ) : !selectedRoomId ? (
          <div className="rounded-lg bg-gray-50 px-4 py-2.5 text-xs text-gray-500">
            Select a room to see booking requirements.
          </div>
        ) : null}

        <div>
          <Label htmlFor="nb-room" className="text-sm font-medium text-gray-700">
            Room *
          </Label>
          <select
            id="nb-room"
            {...register('location_id')}
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7EFA]"
          >
            <option value="">Select a room…</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.capacity ? ` (cap. ${r.capacity})` : ''}
                {r.approval_required ? ' — approval required' : ''}
              </option>
            ))}
          </select>
          {errors.location_id && (
            <p className="mt-1 text-xs text-red-500">{errors.location_id.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="nb-title" className="text-sm font-medium text-gray-700">
            Title *
          </Label>
          <Input
            id="nb-title"
            {...register('title')}
            placeholder="Team meeting"
            className="mt-1.5"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        <div>
          <Label htmlFor="nb-notes" className="text-sm font-medium text-gray-700">
            Notes
          </Label>
          <textarea
            id="nb-notes"
            {...register('notes')}
            rows={2}
            maxLength={1000}
            className="mt-1.5 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7EFA]"
            placeholder="Optional notes…"
          />
        </div>

        <div>
          <Label htmlFor="nb-date" className="text-sm font-medium text-gray-700">
            Date *
          </Label>
          <Input id="nb-date" type="date" {...register('date')} className="mt-1.5" />
          {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="nb-start" className="text-sm font-medium text-gray-700">
              Start *
            </Label>
            <Input id="nb-start" type="time" {...register('start_time_local')} className="mt-1.5" />
            {errors.start_time_local && (
              <p className="mt-1 text-xs text-red-500">{errors.start_time_local.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="nb-end" className="text-sm font-medium text-gray-700">
              End *
            </Label>
            <Input id="nb-end" type="time" {...register('end_time_local')} className="mt-1.5" />
            {errors.end_time_local && (
              <p className="mt-1 text-xs text-red-500">{errors.end_time_local.message}</p>
            )}
          </div>
        </div>

        {/* Recurring toggle */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <Switch
            id="nb-recurring"
            checked={isRecurring ?? false}
            onCheckedChange={(v) => setValue('is_recurring', v)}
          />
          <Label
            htmlFor="nb-recurring"
            className="cursor-pointer text-sm font-medium text-gray-700"
          >
            Repeat this booking
          </Label>
        </div>

        <RecurringSection control={control} register={register} watch={watch} setValue={setValue} />

        {/* God Mode Override — org_admin / super_admin only */}
        {isAdmin && (
          <div
            className={`rounded-lg border px-4 py-3 ${godModeActive ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <Switch
                id="nb-godmode"
                checked={godModeActive}
                onCheckedChange={(v) => {
                  if (v) {
                    setShowGodModeDialog(true)
                  } else {
                    setGodModeActive(false)
                    setGodModeReason('')
                    setGodModeDialogReason('')
                  }
                }}
              />
              <Label
                htmlFor="nb-godmode"
                className={`flex cursor-pointer items-center gap-1.5 text-sm font-medium ${godModeActive ? 'text-red-700' : 'text-gray-700'}`}
              >
                <Shield className="h-3.5 w-3.5" />
                God Mode Override
              </Label>
              {godModeActive && (
                <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Active
                </span>
              )}
            </div>
            {godModeActive && godModeReason && (
              <p className="mt-2 truncate text-xs text-red-600">Reason: {godModeReason}</p>
            )}
          </div>
        )}

        {/* God Mode confirmation dialog */}
        {showGodModeDialog && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-red-800">
              <Shield className="h-4 w-4" />
              Confirm God Mode Override
            </p>
            <p className="mt-1 text-xs text-red-700">
              This will displace any conflicting confirmed reservations and bypass all booking
              rules. All displaced users will be notified and auto-added to the waitlist.
            </p>
            <div className="mt-3">
              <Label className="text-xs text-red-700">
                Reason <span className="text-red-500">(required, min 10 characters)</span>
              </Label>
              <textarea
                value={godModeDialogReason}
                onChange={(e) => setGodModeDialogReason(e.target.value)}
                rows={2}
                maxLength={500}
                className="mt-1 w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="Explain why this override is necessary…"
              />
              {godModeReasonError && (
                <p className="mt-1 text-xs text-red-600">{godModeReasonError}</p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  if (godModeDialogReason.trim().length < 10) {
                    setGodModeReasonError('Reason must be at least 10 characters.')
                    return
                  }
                  setGodModeActive(true)
                  setGodModeReason(godModeDialogReason.trim())
                  setShowGodModeDialog(false)
                  setGodModeReasonError(null)
                }}
              >
                Confirm Override
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowGodModeDialog(false)
                  setGodModeDialogReason('')
                  setGodModeReasonError(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {showWaitlistPrompt && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <p className="font-semibold">This slot is fully booked.</p>
            <p className="mt-0.5 text-xs">
              Waitlist is available for this room. Join the queue and you will be notified if a spot
              opens.
            </p>
            <div className="mt-2.5 flex gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={isSubmitting}
                onClick={() => void submitBooking({ ...pendingBody!, waitlist: true })}
              >
                Join Waitlist
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowWaitlistPrompt(false)
                  setPendingBody(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showWaitlistPrompt && errors.root && (
          <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
            {errors.root.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || showWaitlistPrompt || showGodModeDialog}
            className={godModeActive ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isSubmitting
              ? 'Booking…'
              : godModeActive
                ? 'Book (God Mode)'
                : isRecurring
                  ? 'Create Series'
                  : 'Book'}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}

// ─── Reservation Detail Modal ─────────────────────────────────────────────────

function ReservationModal({
  reservation,
  onClose,
  onCancelled,
  onEdited,
  onCopy,
  onShowQr,
  onCheckedIn,
}: {
  reservation: CalReservation
  onClose: () => void
  onCancelled: () => void
  onEdited: () => void
  onCopy: (r: CalReservation) => void
  onShowQr: (r: CalReservation) => void
  onCheckedIn: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(reservation.title)
  const [editNotes, setEditNotes] = useState(reservation.notes ?? '')
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showCancelSeries, setShowCancelSeries] = useState(false)

  const now = new Date()
  const startTime = new Date(reservation.start_time)
  const tenMinBefore = new Date(startTime.getTime() - 10 * 60 * 1000)
  const endTime = new Date(reservation.end_time)
  const canCheckIn =
    reservation.is_mine &&
    reservation.status === 'confirmed' &&
    !reservation.checked_in &&
    now >= tenMinBefore &&
    now <= endTime

  const waitlistHoldActive =
    reservation.status === 'waitlisted' &&
    reservation.waitlist_expires_at != null &&
    new Date(reservation.waitlist_expires_at) > now

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

  const saveEdit = async () => {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/reservations/${reservation.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, notes: editNotes || null }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((json as { error?: { message?: string } }).error?.message ?? 'Update failed.')
      setBusy(false)
      return
    }
    setBusy(false)
    setEditing(false)
    onEdited()
  }

  const doCancel = async (cancelSeries = false) => {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/reservations/${reservation.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancel_series: cancelSeries }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((json as { error?: { message?: string } }).error?.message ?? 'Cancellation failed.')
      setBusy(false)
      return
    }
    onCancelled()
  }

  const doCheckIn = async () => {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/reservations/${reservation.id}/checkin`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((json as { error?: { message?: string } }).error?.message ?? 'Check-in failed.')
      setBusy(false)
      return
    }
    onCheckedIn()
  }

  const doConfirmWaitlist = async () => {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/reservations/${reservation.id}/confirm-waitlist`, {
      method: 'POST',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((json as { error?: { message?: string } }).error?.message ?? 'Confirmation failed.')
      setBusy(false)
      return
    }
    onEdited()
    onClose()
  }

  const canEdit = reservation.is_mine && ['pending', 'confirmed'].includes(reservation.status)
  const canCancel = reservation.is_mine && ['pending', 'confirmed'].includes(reservation.status)

  return (
    <ModalShell title="Booking Details" onClose={onClose}>
      <div className="space-y-4">
        {editing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-700">Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Notes</Label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7EFA]"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void saveEdit()} disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Waitlist hold banner */}
            {waitlistHoldActive && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                <p className="font-semibold">Your waitlist spot is available!</p>
                <p className="mt-0.5 text-xs">
                  Hold expires{' '}
                  {new Date(reservation.waitlist_expires_at!).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  . Confirm within 30 minutes.
                </p>
                <Button
                  size="sm"
                  className="mt-2 bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={busy}
                  onClick={() => void doConfirmWaitlist()}
                >
                  {busy ? 'Confirming…' : 'Confirm Booking'}
                </Button>
              </div>
            )}

            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading font-semibold text-gray-900">{reservation.title}</h3>
                <StatusBadge status={reservation.status} />
                {reservation.recurring_group_id && (
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                    Recurring
                  </span>
                )}
                {reservation.checked_in && (
                  <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    Checked in
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">🚪 {reservation.room_name}</p>
              <p className="text-sm text-gray-600">
                🕐 {formatTime(reservation.start_time)} — {formatTime(reservation.end_time)}
              </p>
              <p className="text-sm text-gray-600">👤 {reservation.booker_name}</p>
              {reservation.notes && (
                <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                  {reservation.notes}
                </p>
              )}
            </div>

            {/* Check-in button */}
            {canCheckIn && (
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                disabled={busy}
                onClick={() => void doCheckIn()}
              >
                <CheckCircle className="h-4 w-4" />
                {busy ? 'Checking in…' : 'Check In Now'}
              </Button>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-600">{error}</p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
              {canCancel && !showCancelSeries && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  disabled={busy}
                  onClick={() => {
                    if (reservation.recurring_group_id) {
                      setShowCancelSeries(true)
                    } else {
                      if (confirm('Cancel this booking?')) void doCancel(false)
                    }
                  }}
                >
                  {busy ? 'Cancelling…' : 'Cancel Booking'}
                </Button>
              )}
              {showCancelSeries && (
                <div className="w-full rounded-xl border border-red-100 bg-red-50 p-3">
                  <p className="mb-2.5 text-xs text-red-700 font-medium">
                    Cancel just this instance or the entire series?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-100"
                      disabled={busy}
                      onClick={() => void doCancel(false)}
                    >
                      This only
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={busy}
                      onClick={() => void doCancel(true)}
                    >
                      Entire series
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowCancelSeries(false)}>
                      Keep
                    </Button>
                  </div>
                </div>
              )}
              {['pending', 'confirmed'].includes(reservation.status) && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadSingleIcs(reservation)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Add to Calendar
                  </Button>
                  {reservation.is_mine && reservation.status === 'confirmed' && (
                    <Button size="sm" variant="outline" onClick={() => onShowQr(reservation)}>
                      <QrCode className="mr-1.5 h-3.5 w-3.5" />
                      Check-in QR
                    </Button>
                  )}
                </>
              )}
              {reservation.is_mine && (
                <Button size="sm" variant="ghost" onClick={() => onCopy(reservation)}>
                  Copy Booking
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  )
}

// ─── QR Code Modal ────────────────────────────────────────────────────────────

function QrModal({ reservation, onClose }: { reservation: CalReservation; onClose: () => void }) {
  const checkinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/checkin?reservation_id=${reservation.id}`
      : `/checkin?reservation_id=${reservation.id}`

  return (
    <ModalShell title="Check-in QR Code" onClose={onClose}>
      <div className="flex flex-col items-center gap-5">
        <p className="text-center text-sm text-gray-500">Scan this code to check in at the room.</p>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <QRCodeSVG value={checkinUrl} size={200} includeMargin />
        </div>
        <div className="w-full rounded-xl bg-gray-50 p-3 text-center">
          <p className="font-heading text-sm font-semibold text-gray-800">{reservation.title}</p>
          <p className="mt-0.5 text-xs text-gray-500">{reservation.room_name}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {new Date(reservation.start_time).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    </ModalShell>
  )
}

// ─── Waitlist Confirm Modal ────────────────────────────────────────────────────

function WaitlistConfirmModal({
  reservationId,
  onClose,
  onConfirmed,
}: {
  reservationId: string
  onClose: () => void
  onConfirmed: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/reservations/${reservationId}/confirm-waitlist`, {
      method: 'POST',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((json as { error?: { message?: string } }).error?.message ?? 'Confirmation failed.')
      setBusy(false)
      return
    }
    onConfirmed()
  }

  return (
    <ModalShell title="Confirm Waitlist Booking" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <p className="font-semibold">Your waitlist spot is available!</p>
          <p className="mt-1 text-xs">
            Click below to confirm your booking. You have a 30-minute window.
          </p>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? 'Confirming…' : 'Confirm Booking'}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}

// ─── Main Calendar Client ─────────────────────────────────────────────────────

export default function CalendarClient() {
  const calendarRef = useRef<FullCalendar>(null)
  const [userTimezone, setUserTimezone] = useState('UTC')
  const [userRole, setUserRole] = useState<string>('user')
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState('')
  const [currentView, setCurrentView] = useState<View>('dayGridMonth')
  const [viewTitle, setViewTitle] = useState('')
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [toast, setToast] = useState<string | null>(null)
  const [upcomingReservations, setUpcomingReservations] = useState<CalReservation[]>([])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 5000)
  }

  // Handle activate_waitlist URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const waitlistId = params.get('activate_waitlist')
    if (waitlistId) {
      setModal({ type: 'waitlist_confirm', reservationId: waitlistId })
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('activate_waitlist')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // Initial data load
  useEffect(() => {
    const isMobile = window.innerWidth < 768
    setCurrentView(isMobile ? 'timeGridWeek' : 'dayGridMonth')

    Promise.all([
      fetch('/api/user/profile').then((r) => r.json()),
      fetch('/api/calendar/rooms').then((r) => r.json()),
    ]).then(([profileJson, roomsJson]) => {
      const profile = (profileJson as { data?: { profile?: { timezone?: string; role?: string } } })
        .data?.profile
      setUserTimezone(profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
      setUserRole(profile?.role ?? 'user')
      setRooms((roomsJson as { data?: { rooms?: Room[] } }).data?.rooms ?? [])
    })
  }, [])

  // Fetch upcoming reservations for bulk ICS export
  const fetchUpcoming = useCallback(async () => {
    const start = new Date().toISOString()
    const end = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(`/api/reservations?start=${start}&end=${end}`)
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      const all = (json as { data?: { reservations?: CalReservation[] } }).data?.reservations ?? []
      setUpcomingReservations(all.filter((r) => r.is_mine && r.status !== 'waitlisted'))
    }
  }, [])

  useEffect(() => {
    void fetchUpcoming()
  }, [fetchUpcoming])

  // FullCalendar events source
  const fetchCalendarEvents = useCallback(
    async (
      info: { start: Date; end: Date },
      successCallback: (events: EventInput[]) => void,
      failureCallback: (error: Error) => void,
    ) => {
      try {
        const params = new URLSearchParams({
          start: info.start.toISOString(),
          end: info.end.toISOString(),
        })
        const res = await fetch(`/api/reservations?${params.toString()}`)
        const json = await res.json().catch(() => ({}))

        if (!res.ok) {
          failureCallback(new Error('Failed to load events'))
          return
        }

        const data = (
          json as {
            data?: {
              reservations?: CalReservation[]
              blackouts?: BlackoutDate[]
              maintenanceWindows?: MaintenanceWindow[]
            }
          }
        ).data

        const events: EventInput[] = []

        for (const r of data?.reservations ?? []) {
          if (selectedRoom && r.location_id !== selectedRoom) continue

          let className: string
          if (r.status === 'flagged') {
            className = 'event-blocked'
          } else if (r.status === 'waitlisted') {
            className = r.is_mine ? 'event-waitlisted-mine' : 'event-waitlisted'
          } else if (r.status === 'pending') {
            className = r.is_mine ? 'event-pending-mine' : 'event-pending'
          } else {
            className = r.is_mine ? 'event-mine' : 'event-confirmed'
          }

          const baseTitle =
            r.status === 'waitlisted'
              ? `⏳ ${r.title}`
              : r.status === 'pending'
                ? `⌛ ${r.title}`
                : r.checked_in
                  ? `✓ ${r.title}`
                  : r.title
          const title = r.god_mode_override ? `🛡 ${baseTitle}` : baseTitle

          events.push({
            id: r.id,
            title,
            start: r.start_time,
            end: r.end_time,
            classNames: [className],
            extendedProps: { type: 'reservation', reservation: r },
          })

          // Buffer zone after reservation (exclude waitlisted)
          if (r.nano_buffer_mins > 0 && r.status !== 'waitlisted') {
            const bufEnd = new Date(
              new Date(r.end_time).getTime() + r.nano_buffer_mins * 60 * 1000,
            ).toISOString()
            events.push({
              id: `buffer-${r.id}`,
              start: r.end_time,
              end: bufEnd,
              display: 'background',
              backgroundColor: '#E5E7EB',
              classNames: ['event-buffer'],
              overlap: false,
              editable: false,
              extendedProps: { type: 'buffer', buffer_mins: r.nano_buffer_mins },
            })
          }
        }

        for (const b of data?.blackouts ?? []) {
          if (selectedRoom && b.location_id && b.location_id !== selectedRoom) continue
          events.push({
            id: `blackout-${b.id}`,
            title: `🔒 ${b.title}`,
            start: b.start_time,
            end: b.end_time,
            classNames: ['event-blocked'],
            display: 'background',
            overlap: false,
            editable: false,
            extendedProps: { type: 'blackout' },
          })
        }

        for (const m of data?.maintenanceWindows ?? []) {
          events.push({
            id: `maint-${m.id}`,
            title: `🔧 ${m.room_name}${m.maintenance_note ? `: ${m.maintenance_note}` : ''}`,
            start: m.maintenance_from,
            end: m.maintenance_to,
            classNames: ['event-blocked'],
            display: 'background',
            overlap: false,
            editable: false,
            extendedProps: { type: 'maintenance' },
          })
        }

        successCallback(events)
      } catch (e) {
        failureCallback(e instanceof Error ? e : new Error('Unknown error'))
      }
    },
    [selectedRoom],
  )

  const handleDateClick = (info: DateClickArg) => {
    if (info.view.type === 'dayGridMonth') {
      calendarRef.current?.getApi().gotoDate(info.date)
      calendarRef.current?.getApi().changeView('timeGridWeek')
      setCurrentView('timeGridWeek')
      return
    }
    const date = info.date
    const pad = (n: number) => n.toString().padStart(2, '0')
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    const startTime = `${pad(date.getHours())}:${pad(date.getMinutes())}`
    const endHour = date.getHours() + 1
    const endTime = `${pad(endHour > 23 ? 23 : endHour)}:${pad(date.getMinutes())}`
    setModal({
      type: 'new',
      date: dateStr,
      startTime,
      prefill: { start_time_local: startTime, end_time_local: endTime },
    })
  }

  const handleEventClick = (info: EventClickArg) => {
    const props = info.event.extendedProps
    if (props['type'] === 'reservation') {
      setModal({ type: 'view', reservation: props['reservation'] as CalReservation })
    }
  }

  const handleDatesSet = (info: DatesSetArg) => {
    setViewTitle(info.view.title)
    setCurrentView(info.view.type as View)
  }

  const changeView = (v: View) => {
    calendarRef.current?.getApi().changeView(v)
    setCurrentView(v)
  }

  const handleBooked = (msg: string) => {
    setModal({ type: 'none' })
    showToast(msg)
    calendarRef.current?.getApi().refetchEvents()
    void fetchUpcoming()
  }

  const handleCancelled = () => {
    setModal({ type: 'none' })
    showToast('Booking cancelled.')
    calendarRef.current?.getApi().refetchEvents()
    void fetchUpcoming()
  }

  const handleEdited = () => {
    showToast('Booking updated.')
    calendarRef.current?.getApi().refetchEvents()
    void fetchUpcoming()
  }

  const handleCheckedIn = () => {
    setModal({ type: 'none' })
    showToast('Checked in successfully!')
    calendarRef.current?.getApi().refetchEvents()
  }

  const handleCopy = (r: CalReservation) => {
    setModal({
      type: 'new',
      prefill: {
        location_id: r.location_id,
        title: r.title,
        notes: r.notes ?? '',
      },
    })
  }

  const VIEW_LABELS: Record<View, string> = {
    dayGridMonth: 'Month',
    timeGridWeek: 'Week',
    timeGridDay: 'Day',
  }

  return (
    <>
      <style>{`
        .fc { font-family: Inter, sans-serif; font-size: 14px; }
        .fc-toolbar-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 700; }
        .fc-col-header-cell { background: #EFF1F5; text-transform: uppercase; font-size: 11px; letter-spacing: 0.06em; font-weight: 600; padding: 8px 0; }
        .fc-day-today { background: #EEF3FF !important; }
        .fc-day-today .fc-daygrid-day-number { background: #4F7EFA; color: #fff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
        .fc-event { border-radius: 6px; border: none !important; padding: 3px 8px; font-size: 12px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.08); cursor: pointer; }
        .event-confirmed { background: #EEF3FF !important; color: #2D5DD6 !important; }
        .event-mine { background: #4F7EFA !important; color: #fff !important; }
        .event-pending { background: #FEFCE8 !important; color: #A16207 !important; border: 1.5px dashed #D97706 !important; }
        .event-pending-mine { background: #FEF3C7 !important; color: #92400E !important; border: 1.5px dashed #D97706 !important; }
        .event-waitlisted { background: #FFF7ED !important; color: #C2410C !important; opacity: 0.7; }
        .event-waitlisted-mine { background: #FFEDD5 !important; color: #9A3412 !important; }
        .event-blocked { background: #FEF2F2 !important; color: #F0544F !important; cursor: not-allowed !important; }
        .event-buffer { opacity: 0.4; cursor: default; }
        .event-buffer:hover::after { content: attr(data-tooltip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #1F2937; color: #fff; font-size: 11px; padding: 4px 8px; border-radius: 4px; white-space: nowrap; pointer-events: none; z-index: 100; }
        .fc-timegrid-slot { cursor: pointer; height: 24px; }
        .fc-daygrid-day:hover { background: #F5F7FF; transition: background 0.1s; }
        .fc-timegrid-now-indicator-line { border-color: #4F7EFA; }
        .fc-button { display: none !important; }
        .fc-scrollgrid { border-radius: 8px; overflow: hidden; }
      `}</style>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().prev()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="min-w-[180px] text-center font-heading text-lg font-bold text-gray-900">
              {viewTitle}
            </h2>
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().next()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().today()}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              Today
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View switcher */}
            <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white">
              {(['dayGridMonth', 'timeGridWeek', 'timeGridDay'] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => changeView(v)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    currentView === v ? 'bg-[#4F7EFA] text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>

            {/* Room filter */}
            <select
              value={selectedRoom}
              onChange={(e) => {
                setSelectedRoom(e.target.value)
                setTimeout(() => calendarRef.current?.getApi().refetchEvents(), 0)
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4F7EFA]"
            >
              <option value="">All rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Export */}
            {upcomingReservations.length > 0 && (
              <button
                type="button"
                onClick={() => downloadBulkIcs(upcomingReservations)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                title="Export all upcoming bookings"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            )}

            {/* Toast */}
            {toast && (
              <span className="rounded-lg bg-gray-800/90 px-3 py-1.5 text-sm font-medium text-white">
                {toast}
              </span>
            )}

            {/* Book button */}
            <Button onClick={() => setModal({ type: 'new' })} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Book
            </Button>
          </div>
        </div>

        {/* FullCalendar */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            timeZone={userTimezone}
            headerToolbar={false}
            height="auto"
            contentHeight={640}
            events={fetchCalendarEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            nowIndicator
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
            dayMaxEvents={4}
            eventDidMount={(info) => {
              if (info.event.extendedProps['type'] === 'buffer') {
                const mins = info.event.extendedProps['buffer_mins'] as number
                info.el.setAttribute('title', `${mins}-minute buffer — room resetting`)
              }
            }}
          />
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#4F7EFA]" />
            My booking
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#EEF3FF]" />
            Others
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-amber-500 bg-amber-50" />
            Pending approval
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-100" />
            Waitlisted
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#FEF2F2]" />
            Blocked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#E5E7EB]" />
            Buffer
          </span>
        </div>
      </div>

      {/* Modals */}
      {modal.type === 'new' && (
        <NewBookingModal
          rooms={rooms}
          userTimezone={userTimezone}
          isAdmin={['org_admin', 'super_admin'].includes(userRole)}
          {...(modal.date !== undefined ? { defaultDate: modal.date } : {})}
          {...(modal.startTime !== undefined ? { defaultStartTime: modal.startTime } : {})}
          {...(modal.prefill !== undefined ? { prefill: modal.prefill } : {})}
          onClose={() => setModal({ type: 'none' })}
          onBooked={handleBooked}
        />
      )}
      {modal.type === 'view' && (
        <ReservationModal
          reservation={modal.reservation}
          onClose={() => setModal({ type: 'none' })}
          onCancelled={handleCancelled}
          onEdited={handleEdited}
          onCopy={handleCopy}
          onShowQr={(r) => setModal({ type: 'qr', reservation: r })}
          onCheckedIn={handleCheckedIn}
        />
      )}
      {modal.type === 'qr' && (
        <QrModal reservation={modal.reservation} onClose={() => setModal({ type: 'none' })} />
      )}
      {modal.type === 'waitlist_confirm' && (
        <WaitlistConfirmModal
          reservationId={modal.reservationId}
          onClose={() => setModal({ type: 'none' })}
          onConfirmed={() => {
            setModal({ type: 'none' })
            showToast('Booking confirmed from waitlist!')
            calendarRef.current?.getApi().refetchEvents()
            void fetchUpcoming()
          }}
        />
      )}
    </>
  )
}
