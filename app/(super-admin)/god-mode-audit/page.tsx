'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Shield, Download } from 'lucide-react'

interface AuditEntry {
  id: string
  created_at: string
  org_name: string
  admin_name: string
  room_name: string
  title: string
  god_mode_reason: string
  displaced_count: number
  start_time: string
}

interface Org {
  id: string
  display_name: string
}

export default function GodModeAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [orgs, setOrgs] = useState<Org[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [orgFilter, setOrgFilter] = useState('')
  const [fromFilter, setFromFilter] = useState('')
  const [toFilter, setToFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (orgFilter) params.set('org_id', orgFilter)
      if (fromFilter) params.set('from', fromFilter)
      if (toFilter) params.set('to', toFilter)
      const res = await fetch(`/api/super-admin/god-mode-audit?${params}`)
      const json = (await res.json()) as {
        success: boolean
        data: { entries: AuditEntry[]; total: number; orgs: Org[] }
      }
      if (json.success) {
        setEntries(json.data.entries)
        setTotal(json.data.total)
        if (json.data.orgs.length) setOrgs(json.data.orgs)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [orgFilter, fromFilter, toFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    const header = [
      'Date',
      'Org',
      'Admin',
      'Room',
      'Booking Title',
      'Reason',
      'Users Displaced',
      'Slot Start',
    ]
    const rows = entries.map((e) => [
      format(new Date(e.created_at), 'yyyy-MM-dd HH:mm'),
      e.org_name,
      e.admin_name,
      e.room_name,
      e.title,
      `"${e.god_mode_reason.replace(/"/g, '""')}"`,
      e.displaced_count,
      e.start_time ? format(new Date(e.start_time), 'yyyy-MM-dd HH:mm') : '',
    ])
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `god-mode-audit-${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-semibold text-gray-900">God Mode Audit Report</h1>
          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
            {total}
          </span>
        </div>
        <button
          onClick={exportCsv}
          disabled={entries.length === 0}
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="">All orgs</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.display_name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fromFilter}
          onChange={(e) => setFromFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
          placeholder="From"
        />
        <input
          type="date"
          value={toFilter}
          onChange={(e) => setToFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
          placeholder="To"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Date', 'Org', 'Admin', 'Room', 'Reason', 'Displaced', 'Slot'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {format(new Date(e.created_at), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{e.org_name}</td>
                  <td className="px-4 py-3 text-gray-700">{e.admin_name}</td>
                  <td className="px-4 py-3 text-gray-700">{e.room_name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <p className="truncate" title={e.god_mode_reason}>
                      {e.god_mode_reason || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {e.displaced_count > 0 ? (
                      <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                        {e.displaced_count}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {e.start_time ? format(new Date(e.start_time), 'MMM d, HH:mm') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">No God Mode overrides found.</p>
          )}
        </div>
      )}
    </div>
  )
}
