'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Megaphone, Download, ShieldCheck } from 'lucide-react'

interface OptIn {
  org_id: string
  org_name: string
  slug: string
  subscription_tier: string
  subscription_status: string
  created_at: string
  admin_name: string
  admin_email: string
}

export default function MarketingOptInsPage() {
  const [optIns, setOptIns] = useState<OptIn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch('/api/super-admin/marketing-opt-ins')
      .then((r) => r.json())
      .then((j: { success: boolean; data: { optIns: OptIn[] } }) => {
        if (j.success) setOptIns(j.data.optIns)
      })
      .finally(() => setLoading(false))
  }, [])

  const exportCsv = () => {
    const header = ['Org', 'Slug', 'Tier', 'Status', 'Admin Name', 'Admin Email', 'Joined']
    const rows = optIns.map((o) => [
      o.org_name,
      o.slug,
      o.subscription_tier,
      o.subscription_status,
      o.admin_name,
      o.admin_email,
      format(new Date(o.created_at), 'yyyy-MM-dd'),
    ])
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `marketing-opt-ins-${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-[#4F7EFA]" />
          <h1 className="text-xl font-semibold text-gray-900">Marketing Opt-Ins</h1>
          <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
            {optIns.length}
          </span>
        </div>
        <button
          onClick={exportCsv}
          disabled={optIns.length === 0}
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* No-sale policy reminder */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Permanent No-Sale Policy</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Nano Spaces does not sell, rent, or share email addresses with third parties. This list
            is used solely for product updates and announcements. Org admins opted in voluntarily
            and may opt out at any time in their settings.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Organization', 'Tier', 'Status', 'Admin', 'Email', 'Joined'].map((h) => (
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
              {optIns.map((o) => (
                <tr key={o.org_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {o.org_name}
                    <p className="text-xs font-normal text-gray-400">{o.slug}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">{o.subscription_tier}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        o.subscription_status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : o.subscription_status === 'trial'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {o.subscription_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{o.admin_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{o.admin_email}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(o.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {optIns.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">No opt-ins yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
