'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Building2, RefreshCw } from 'lucide-react'

interface Org {
  id: string
  display_name: string | null
  name: string
  slug: string
  subscription_tier: string
  subscription_status: string
  trial_ends_at: string | null
  subscription_expires_at: string | null
  created_at: string
}

export default function SuperAdminOrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/orgs')
      const json = (await res.json()) as { success: boolean; data: { orgs: Org[] } }
      if (json.success) setOrgs(json.data.orgs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const statusColor = (s: string) =>
    s === 'active'
      ? 'bg-green-100 text-green-700'
      : s === 'trial'
        ? 'bg-blue-100 text-blue-700'
        : s === 'expired' || s === 'cancelled'
          ? 'bg-red-100 text-red-700'
          : s === 'grace'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-600'

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-900">All Organizations</h1>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {orgs.length}
          </span>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Organization', 'Tier', 'Status', 'Trial / Expires', 'Created'].map((h) => (
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
              {orgs.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {o.display_name ?? o.name}
                    <p className="text-xs font-normal text-gray-400">{o.slug}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">{o.subscription_tier}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(o.subscription_status)}`}
                    >
                      {o.subscription_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {o.trial_ends_at
                      ? `Trial ends ${format(new Date(o.trial_ends_at), 'MMM d, yyyy')}`
                      : o.subscription_expires_at
                        ? `Expires ${format(new Date(o.subscription_expires_at), 'MMM d, yyyy')}`
                        : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(o.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orgs.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">No organizations found.</p>
          )}
        </div>
      )}
    </div>
  )
}
