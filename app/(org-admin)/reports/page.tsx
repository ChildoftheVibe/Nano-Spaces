'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import {
  BarChart3,
  Download,
  FileText,
  Users,
  Ghost,
  Thermometer,
  Database,
  Calendar,
} from 'lucide-react'
import * as XLSX from 'xlsx'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Org {
  id: string
  display_name: string
}

interface MonthlyReservation {
  id: string
  title: string
  start_time: string
  end_time: string
  status: string
  checked_in: boolean
  god_mode: boolean
  god_mode_reason: string
  cancellation_reason: string
  booked_by_name: string
  cancelled_by_name: string
  room_name: string
}

interface UserHistoryReservation {
  id: string
  title: string
  room_name: string
  start_time: string
  end_time: string
  status: string
  checked_in: boolean
  notes: string
  cancellation_reason: string
  cancelled_by_name: string
  god_mode: boolean
}

interface OrgUser {
  id: string
  full_name: string | null
}

interface UtilizationRoom {
  room_id: string
  room_name: string
  booked_hours: number
  available_hours: number
  utilization_pct: number
}

interface GhostBusterRoom {
  room_id: string
  room_name: string
  count: number
  entries: Array<{
    id: string
    created_at: string
    booking_title: string
    booker_name: string
    start_time: string
  }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function downloadXlsx(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function applyHeaderStyle(ws: XLSX.WorkSheet, range: string) {
  const ref = XLSX.utils.decode_range(range)
  for (let c = ref.s.c; c <= ref.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (!ws[addr]) continue
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4F7EFA' } },
      alignment: { horizontal: 'center' },
    }
  }
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((w) => ({ wch: w }))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OrgSelector({
  orgs,
  value,
  onChange,
}: {
  orgs: Org[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-200 dark:border-white/[0.07] px-3 py-1.5 text-sm text-gray-700 dark:text-white/70 bg-white dark:bg-white/[0.04]"
    >
      <option value="">All orgs</option>
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.display_name}
        </option>
      ))}
    </select>
  )
}

// ─── Tab: Monthly Reservations ────────────────────────────────────────────────

function MonthlyReportTab({ isSuperAdmin, orgs }: { isSuperAdmin: boolean; orgs: Org[] }) {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [orgId, setOrgId] = useState('')
  const [data, setData] = useState<MonthlyReservation[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month })
      if (isSuperAdmin && orgId) params.set('org_id', orgId)
      const res = await fetch(`/api/reports/monthly-reservations?${params}`)
      const json = (await res.json()) as {
        success: boolean
        data: { reservations: MonthlyReservation[] }
      }
      if (json.success) setData(json.data.reservations)
    } finally {
      setLoading(false)
    }
  }, [month, orgId, isSuperAdmin])

  useEffect(() => {
    void load()
  }, [load])

  const exportXlsx = () => {
    const rows = data.map((r) => ({
      Date: r.start_time ? format(new Date(r.start_time), 'yyyy-MM-dd') : '',
      'Start Time': r.start_time ? format(new Date(r.start_time), 'HH:mm') : '',
      'End Time': r.end_time ? format(new Date(r.end_time), 'HH:mm') : '',
      Room: r.room_name,
      'Booked By': r.booked_by_name,
      Title: r.title,
      Status: r.status,
      'Checked In': r.checked_in ? 'Yes' : 'No',
      'Cancelled By': r.cancelled_by_name,
      'Cancellation Reason': r.cancellation_reason,
      'God Mode': r.god_mode ? 'Yes' : 'No',
      'God Mode Reason': r.god_mode_reason,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    setColWidths(ws, [12, 10, 10, 20, 20, 24, 12, 10, 20, 24, 10, 24])
    applyHeaderStyle(ws, ws['!ref'] ?? 'A1')

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Reservations')
    downloadXlsx(wb, `monthly-reservations-${month}.xlsx`)
  }

  const statusColor: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    waitlisted: 'bg-orange-100 text-orange-700',
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-gray-200 dark:border-white/[0.07] px-3 py-1.5 text-sm text-gray-700 dark:text-white/70 dark:bg-white/[0.04]"
        />
        {isSuperAdmin && <OrgSelector orgs={orgs} value={orgId} onChange={setOrgId} />}
        <button
          onClick={exportXlsx}
          disabled={data.length === 0}
          className="ml-auto flex items-center gap-1.5 rounded-md border dark:border-white/[0.07] px-3 py-1.5 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Export Excel
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 dark:text-white/35">Loading…</div>
      ) : (
        <div className="rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] overflow-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 dark:bg-white/[0.04] border-b dark:border-white/[0.06]">
              <tr>
                {[
                  'Date',
                  'Time',
                  'Room',
                  'Booked By',
                  'Title',
                  'Status',
                  'Cancelled By',
                  'Reason',
                  'God Mode',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-white/45 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-white/45 whitespace-nowrap">
                    {r.start_time ? format(new Date(r.start_time), 'MMM d') : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-white/45 whitespace-nowrap">
                    {r.start_time ? format(new Date(r.start_time), 'HH:mm') : '—'}–
                    {r.end_time ? format(new Date(r.end_time), 'HH:mm') : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-white/70 whitespace-nowrap">
                    {r.room_name}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-white/70 whitespace-nowrap">
                    {r.booked_by_name}
                  </td>
                  <td className="px-3 py-2 text-gray-800 dark:text-white/80 max-w-[180px]">
                    <p className="truncate" title={r.title}>
                      {r.title || '—'}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[r.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-white/60 text-xs">
                    {r.cancelled_by_name || '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs max-w-[140px]">
                    <p className="truncate" title={r.cancellation_reason}>
                      {r.cancellation_reason || '—'}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.god_mode ? (
                      <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                        Yes
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-white/20">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400 dark:text-white/35">
              No reservations for this period.
            </p>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-gray-400">{data.length} reservations</p>
    </div>
  )
}

// ─── Tab: User History ────────────────────────────────────────────────────────

function UserHistoryTab({ isSuperAdmin, orgs }: { isSuperAdmin: boolean; orgs: Org[] }) {
  const [orgId, setOrgId] = useState('')
  const [users, setUsers] = useState<OrgUser[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [data, setData] = useState<UserHistoryReservation[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch user list when org changes
  useEffect(() => {
    const fetchUsers = async () => {
      const params = new URLSearchParams({ user_id: 'placeholder' })
      if (isSuperAdmin && orgId) params.set('org_id', orgId)
      // We use user-history to also get the users list (with placeholder user_id it will 400)
      // Better: fetch users list separately
      const res = await fetch(
        `/api/reports/user-history?user_id=00000000-0000-0000-0000-000000000000${isSuperAdmin && orgId ? `&org_id=${orgId}` : ''}`,
      )
      const json = (await res.json()) as {
        success: boolean
        data: { users: OrgUser[] }
      }
      if (json.success) setUsers(json.data.users)
    }
    void fetchUsers()
  }, [orgId, isSuperAdmin])

  const load = useCallback(async () => {
    if (!selectedUser) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ user_id: selectedUser })
      if (isSuperAdmin && orgId) params.set('org_id', orgId)
      const res = await fetch(`/api/reports/user-history?${params}`)
      const json = (await res.json()) as {
        success: boolean
        data: { reservations: UserHistoryReservation[]; users: OrgUser[] }
      }
      if (json.success) {
        setData(json.data.reservations)
        if (json.data.users.length) setUsers(json.data.users)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedUser, orgId, isSuperAdmin])

  useEffect(() => {
    void load()
  }, [load])

  const exportXlsx = () => {
    const user = users.find((u) => u.id === selectedUser)
    const rows = data.map((r) => ({
      Date: r.start_time ? format(new Date(r.start_time), 'yyyy-MM-dd') : '',
      'Start Time': r.start_time ? format(new Date(r.start_time), 'HH:mm') : '',
      'End Time': r.end_time ? format(new Date(r.end_time), 'HH:mm') : '',
      Room: r.room_name,
      Title: r.title,
      Status: r.status,
      'Checked In': r.checked_in ? 'Yes' : 'No',
      Notes: r.notes,
      'Cancellation Reason': r.cancellation_reason,
      'Cancelled By': r.cancelled_by_name,
      'God Mode': r.god_mode ? 'Yes' : 'No',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    setColWidths(ws, [12, 10, 10, 20, 24, 12, 10, 24, 24, 20, 10])
    applyHeaderStyle(ws, ws['!ref'] ?? 'A1')

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Booking History')
    const name = (user?.full_name ?? 'user').replace(/\s+/g, '-').toLowerCase()
    downloadXlsx(wb, `booking-history-${name}-${format(new Date(), 'yyyyMMdd')}.xlsx`)
  }

  const statusColor: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    waitlisted: 'bg-orange-100 text-orange-700',
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {isSuperAdmin && <OrgSelector orgs={orgs} value={orgId} onChange={setOrgId} />}
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="rounded-md border border-gray-200 dark:border-white/[0.07] px-3 py-1.5 text-sm text-gray-700 dark:text-white/70 bg-white dark:bg-white/[0.04] min-w-[200px]"
        >
          <option value="">Select a user…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.id}
            </option>
          ))}
        </select>
        <button
          onClick={exportXlsx}
          disabled={data.length === 0}
          className="ml-auto flex items-center gap-1.5 rounded-md border dark:border-white/[0.07] px-3 py-1.5 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Export Excel
        </button>
      </div>

      {!selectedUser ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          Select a user to view their booking history.
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-gray-400 dark:text-white/35">Loading…</div>
      ) : (
        <div className="rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] overflow-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-white/[0.04] border-b dark:border-white/[0.06]">
              <tr>
                {['Date', 'Time', 'Room', 'Title', 'Status', 'Checked In', 'Notes'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-white/45 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-white/45 whitespace-nowrap">
                    {r.start_time ? format(new Date(r.start_time), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-white/45 whitespace-nowrap">
                    {r.start_time ? format(new Date(r.start_time), 'HH:mm') : '—'}–
                    {r.end_time ? format(new Date(r.end_time), 'HH:mm') : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-white/70 whitespace-nowrap">
                    {r.room_name}
                  </td>
                  <td className="px-3 py-2 text-gray-800 max-w-[160px]">
                    <p className="truncate" title={r.title}>
                      {r.title || '—'}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[r.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.checked_in ? (
                      <span className="text-green-600 text-xs font-medium">Yes</span>
                    ) : (
                      <span className="text-gray-300 text-xs">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs max-w-[160px]">
                    <p className="truncate" title={r.notes}>
                      {r.notes || '—'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400 dark:text-white/35">
              No bookings found.
            </p>
          )}
        </div>
      )}
      {data.length > 0 && <p className="mt-2 text-xs text-gray-400">{data.length} bookings</p>}
    </div>
  )
}

// ─── Tab: Utilization ─────────────────────────────────────────────────────────

function UtilizationTab({ isSuperAdmin, orgs }: { isSuperAdmin: boolean; orgs: Org[] }) {
  const [orgId, setOrgId] = useState('')
  const [data, setData] = useState<UtilizationRoom[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && orgId) params.set('org_id', orgId)
      const res = await fetch(`/api/reports/utilization?${params}`)
      const json = (await res.json()) as {
        success: boolean
        data: { rooms: UtilizationRoom[] }
      }
      if (json.success) setData(json.data.rooms)
    } finally {
      setLoading(false)
    }
  }, [orgId, isSuperAdmin])

  useEffect(() => {
    void load()
  }, [load])

  const exportXlsx = () => {
    const rows = data.map((r) => ({
      Room: r.room_name,
      'Booked Hours': r.booked_hours,
      'Available Hours': r.available_hours,
      'Utilization %': r.utilization_pct,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    setColWidths(ws, [24, 14, 16, 14])
    applyHeaderStyle(ws, ws['!ref'] ?? 'A1')

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Utilization')
    downloadXlsx(wb, `utilization-next30days-${format(new Date(), 'yyyyMMdd')}.xlsx`)
  }

  const barColor = (pct: number) => {
    if (pct >= 75) return 'bg-red-400'
    if (pct >= 50) return 'bg-amber-400'
    if (pct >= 25) return 'bg-[#4F7EFA]'
    return 'bg-gray-300'
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {isSuperAdmin && <OrgSelector orgs={orgs} value={orgId} onChange={setOrgId} />}
        <p className="text-xs text-gray-400">Next 30 days · Active rooms only</p>
        <button
          onClick={exportXlsx}
          disabled={data.length === 0}
          className="ml-auto flex items-center gap-1.5 rounded-md border dark:border-white/[0.07] px-3 py-1.5 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Export Excel
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 dark:text-white/35">Loading…</div>
      ) : data.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">No rooms found.</div>
      ) : (
        <div className="space-y-3">
          {data
            .sort((a, b) => b.utilization_pct - a.utilization_pct)
            .map((r) => (
              <div
                key={r.room_id}
                className="rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-white/80">
                    {r.room_name}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-white/70">
                    {r.utilization_pct}%
                  </span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 dark:bg-white/[0.07] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(r.utilization_pct)}`}
                    style={{ width: `${Math.min(100, r.utilization_pct)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400 dark:text-white/35">
                  {r.booked_hours}h booked / {r.available_hours}h available
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Peak Hours Heatmap ──────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function PeakHoursTab({ isSuperAdmin, orgs }: { isSuperAdmin: boolean; orgs: Org[] }) {
  const [orgId, setOrgId] = useState('')
  const [grid, setGrid] = useState<number[][]>([])
  const [maxVal, setMaxVal] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && orgId) params.set('org_id', orgId)
      const res = await fetch(`/api/reports/peak-hours?${params}`)
      const json = (await res.json()) as {
        success: boolean
        data: { grid: number[][]; maxVal: number; totalReservations: number }
      }
      if (json.success) {
        setGrid(json.data.grid)
        setMaxVal(json.data.maxVal)
        setTotal(json.data.totalReservations)
      }
    } finally {
      setLoading(false)
    }
  }, [orgId, isSuperAdmin])

  useEffect(() => {
    void load()
  }, [load])

  const exportXlsx = () => {
    const headerRow = ['Hour', ...DAYS]
    const rows = Array.from({ length: 24 }, (_, h) => {
      const row: Record<string, number | string> = {
        Hour: `${String(h).padStart(2, '0')}:00`,
      }
      DAYS.forEach((d, di) => {
        row[d] = (grid[h] as number[])[di] ?? 0
      })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows, { header: headerRow })
    ws['!freeze'] = { xSplit: 1, ySplit: 1 }
    setColWidths(ws, [8, 8, 8, 8, 8, 8, 8, 8])
    applyHeaderStyle(ws, ws['!ref'] ?? 'A1')

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Peak Hours')
    downloadXlsx(wb, `peak-hours-${format(new Date(), 'yyyyMMdd')}.xlsx`)
  }

  const intensity = (count: number): string => {
    if (count === 0) return 'bg-gray-50 dark:bg-white/[0.03] text-gray-300 dark:text-white/20'
    const pct = count / maxVal
    if (pct >= 0.8) return 'bg-[#4F7EFA] text-white'
    if (pct >= 0.6) return 'bg-blue-300 text-white'
    if (pct >= 0.4) return 'bg-blue-200 text-blue-900'
    if (pct >= 0.2) return 'bg-blue-100 text-blue-700'
    return 'bg-blue-50 text-blue-400'
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {isSuperAdmin && <OrgSelector orgs={orgs} value={orgId} onChange={setOrgId} />}
        <p className="text-xs text-gray-400">Last 90 days · {total} reservations analysed</p>
        <button
          onClick={exportXlsx}
          disabled={grid.length === 0}
          className="ml-auto flex items-center gap-1.5 rounded-md border dark:border-white/[0.07] px-3 py-1.5 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Export Excel
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 dark:text-white/35">Loading…</div>
      ) : (
        <div className="rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] overflow-auto p-4">
          <div
            className="inline-grid gap-1"
            style={{ gridTemplateColumns: `60px repeat(7, 48px)` }}
          >
            {/* Header */}
            <div />
            {DAYS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-gray-500 dark:text-white/45 py-1"
              >
                {d}
              </div>
            ))}

            {/* Rows */}
            {Array.from({ length: 24 }, (_, h) => (
              <>
                <div
                  key={`label-${h}`}
                  className="text-right text-xs text-gray-400 dark:text-white/35 pr-2 flex items-center justify-end"
                >
                  {String(h).padStart(2, '0')}:00
                </div>
                {DAYS.map((_, di) => {
                  const count = (grid[h] as number[] | undefined)?.[di] ?? 0
                  return (
                    <div
                      key={`cell-${h}-${di}`}
                      title={`${DAYS[di]} ${String(h).padStart(2, '0')}:00 — ${count} booking${count !== 1 ? 's' : ''}`}
                      className={`h-8 rounded flex items-center justify-center text-xs font-medium ${intensity(count)}`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  )
                })}
              </>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-white/45">
            <span>Low</span>
            {['bg-blue-50', 'bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-[#4F7EFA]'].map(
              (c, i) => (
                <div
                  key={i}
                  className={`h-4 w-6 rounded ${c} border border-gray-200 dark:border-white/10`}
                />
              ),
            )}
            <span>High</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Ghost Buster ────────────────────────────────────────────────────────

function GhostBusterTab({ isSuperAdmin, orgs }: { isSuperAdmin: boolean; orgs: Org[] }) {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [orgId, setOrgId] = useState('')
  const [rooms, setRooms] = useState<GhostBusterRoom[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month })
      if (isSuperAdmin && orgId) params.set('org_id', orgId)
      const res = await fetch(`/api/reports/ghost-buster?${params}`)
      const json = (await res.json()) as {
        success: boolean
        data: { rooms: GhostBusterRoom[]; totalNoShows: number }
      }
      if (json.success) {
        setRooms(json.data.rooms)
        setTotal(json.data.totalNoShows)
      }
    } finally {
      setLoading(false)
    }
  }, [month, orgId, isSuperAdmin])

  useEffect(() => {
    void load()
  }, [load])

  const exportXlsx = () => {
    const rows = rooms.flatMap((r) =>
      r.entries.map((e) => ({
        Room: r.room_name,
        'Booking Title': e.booking_title,
        'Booked By': e.booker_name,
        'Booking Start': e.start_time ? format(new Date(e.start_time), 'yyyy-MM-dd HH:mm') : '',
        'Released At': e.created_at ? format(new Date(e.created_at), 'yyyy-MM-dd HH:mm') : '',
      })),
    )

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    setColWidths(ws, [20, 24, 20, 18, 18])
    applyHeaderStyle(ws, ws['!ref'] ?? 'A1')

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'No-Shows')
    downloadXlsx(wb, `ghost-buster-${month}.xlsx`)
  }

  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-gray-200 dark:border-white/[0.07] px-3 py-1.5 text-sm text-gray-700 dark:text-white/70 dark:bg-white/[0.04]"
        />
        {isSuperAdmin && <OrgSelector orgs={orgs} value={orgId} onChange={setOrgId} />}
        <button
          onClick={exportXlsx}
          disabled={rooms.length === 0}
          className="ml-auto flex items-center gap-1.5 rounded-md border dark:border-white/[0.07] px-3 py-1.5 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Export Excel
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 dark:text-white/35">Loading…</div>
      ) : rooms.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          No ghost-released bookings this period.
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((r) => (
            <div
              key={r.room_id}
              className="rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === r.room_id ? null : r.room_id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] text-left"
              >
                <span className="font-medium text-gray-800 dark:text-white/80 text-sm">
                  {r.room_name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-semibold">
                    {r.count} no-show{r.count !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-400 dark:text-white/35 text-xs">
                    {expanded === r.room_id ? '▲' : '▼'}
                  </span>
                </div>
              </button>
              {expanded === r.room_id && (
                <div className="border-t dark:border-white/[0.07]">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/[0.04]">
                      <tr>
                        {['Booking', 'Booked By', 'Slot Start', 'Released At'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-white/45"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {r.entries.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                          <td className="px-4 py-2 text-gray-700 dark:text-white/70">
                            {e.booking_title}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-white/60">
                            {e.booker_name}
                          </td>
                          <td className="px-4 py-2 text-gray-500 dark:text-white/45 text-xs">
                            {e.start_time ? format(new Date(e.start_time), 'MMM d, HH:mm') : '—'}
                          </td>
                          <td className="px-4 py-2 text-gray-500 dark:text-white/45 text-xs">
                            {e.created_at ? format(new Date(e.created_at), 'MMM d, HH:mm') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-400 dark:text-white/30">
            {total} total no-shows across {rooms.length} room{rooms.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Org Data Export ─────────────────────────────────────────────────────

function OrgExportTab() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastExport, setLastExport] = useState('')

  const doExport = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/org/export')
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } }
        setError(json.error?.message ?? 'Export failed.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('content-disposition') ?? ''
      const match = /filename="([^"]+)"/.exec(cd)
      a.download = match?.[1] ?? `nanospaces-org-export.zip`
      a.click()
      URL.revokeObjectURL(url)
      setLastExport(new Date().toLocaleTimeString())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <div className="rounded-xl border dark:border-white/[0.07] bg-white dark:bg-[#12131A] p-6">
        <div className="flex items-start gap-3 mb-4">
          <Database className="h-8 w-8 text-[#4F7EFA] mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Full Org Data Export</h3>
            <p className="text-sm text-gray-500 dark:text-white/45 mt-1">
              Downloads all reservations, users, rooms, and blackout dates as a ZIP archive
              containing CSV files. Rate limited to once per 24 hours per org.
            </p>
          </div>
        </div>

        <ul className="mb-5 space-y-1.5 text-sm text-gray-600 dark:text-white/60">
          {[
            'reservations.csv — All org reservations',
            'users.csv — All org members',
            'rooms.csv — All rooms and settings',
            'blackouts.csv — All blackout dates',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4F7EFA] shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        {error && (
          <p className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={() => void doExport()}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4F7EFA] px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          {loading ? 'Preparing export…' : 'Download ZIP'}
        </button>

        {lastExport && (
          <p className="mt-2 text-center text-xs text-gray-400 dark:text-white/30">
            Last exported at {lastExport}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId =
  | 'monthly'
  | 'user-history'
  | 'utilization'
  | 'peak-hours'
  | 'ghost-buster'
  | 'org-export'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const TABS: Tab[] = [
  { id: 'monthly', label: 'Monthly', icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: 'user-history', label: 'User History', icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'utilization', label: 'Utilization', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: 'peak-hours', label: 'Peak Hours', icon: <Thermometer className="h-3.5 w-3.5" /> },
  { id: 'ghost-buster', label: 'Ghost Buster', icon: <Ghost className="h-3.5 w-3.5" /> },
  {
    id: 'org-export',
    label: 'Data Export',
    icon: <Database className="h-3.5 w-3.5" />,
    adminOnly: true,
  },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('monthly')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [orgs, setOrgs] = useState<Org[]>([])

  useEffect(() => {
    // Detect super admin by trying to fetch orgs list
    const fetchOrgs = async () => {
      const res = await fetch('/api/super-admin/orgs')
      const json = (await res.json()) as { success: boolean; data?: { orgs: Org[] } }
      if (json.success && json.data?.orgs) {
        setIsSuperAdmin(true)
        setOrgs(json.data.orgs)
      }
    }
    void fetchOrgs()
  }, [])

  const visibleTabs = TABS.filter((t) => !t.adminOnly || !isSuperAdmin)

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-5 w-5 text-[#4F7EFA]" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Reports</h1>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b dark:border-white/[0.07] mb-6">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-[#4F7EFA] text-[#4F7EFA]'
                : 'border-transparent text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'monthly' && <MonthlyReportTab isSuperAdmin={isSuperAdmin} orgs={orgs} />}
      {activeTab === 'user-history' && <UserHistoryTab isSuperAdmin={isSuperAdmin} orgs={orgs} />}
      {activeTab === 'utilization' && <UtilizationTab isSuperAdmin={isSuperAdmin} orgs={orgs} />}
      {activeTab === 'peak-hours' && <PeakHoursTab isSuperAdmin={isSuperAdmin} orgs={orgs} />}
      {activeTab === 'ghost-buster' && <GhostBusterTab isSuperAdmin={isSuperAdmin} orgs={orgs} />}
      {activeTab === 'org-export' && !isSuperAdmin && <OrgExportTab />}
    </div>
  )
}
