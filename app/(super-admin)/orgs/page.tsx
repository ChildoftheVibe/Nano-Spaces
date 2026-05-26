'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Building2, RefreshCw, Search, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import gsap from 'gsap'

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

// ─── Stat counter (GSAP scrub on mount) ──────────────────────────────────────
function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  const numRef = useRef<HTMLSpanElement>(null)
  const prev = useRef({ val: 0 })

  useEffect(() => {
    if (!numRef.current) return
    gsap.to(prev.current, {
      val: value,
      duration: 1.2,
      ease: 'power3.out',
      onUpdate() {
        if (numRef.current) numRef.current.textContent = String(Math.round(prev.current.val))
      },
    })
  }, [value])

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 overflow-hidden group hover:border-white/20 transition-colors duration-300">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at 30% 50%, ${accent}18 0%, transparent 70%)`,
        }}
      />
      <p className="text-xs font-medium tracking-widest text-white/40 uppercase mb-3">{label}</p>
      <span
        ref={numRef}
        className="text-4xl font-bold text-white tabular-nums"
        style={{ fontFamily: 'Geist, system-ui, sans-serif' }}
      >
        0
      </span>
    </div>
  )
}

// ─── Status pill ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  trial: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  expired: 'bg-red-500/15 text-red-400 border border-red-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border border-red-500/30',
  grace: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
}

function StatusPill({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-white/10 text-white/50 border border-white/10'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

// ─── Tier badge ───────────────────────────────────────────────────────────────
const TIER_STYLES: Record<string, string> = {
  starter: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  growth: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  free: 'bg-white/8 text-white/40 border border-white/10',
}

function TierBadge({ tier }: { tier: string }) {
  const cls = TIER_STYLES[tier] ?? 'bg-white/8 text-white/40 border border-white/10'
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize tracking-wide ${cls}`}
    >
      {tier}
    </span>
  )
}

// ─── Org avatar (inline pill-image, gpt-taste §6) ────────────────────────────
function OrgAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  const hue = (name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 37) % 360
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
      style={{ background: `hsl(${hue},55%,38%)` }}
    >
      {initials}
    </span>
  )
}

// ─── Scrolling status ticker (infinite marquee, gpt-taste §6) ────────────────
function Ticker({ orgs }: { orgs: Org[] }) {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!trackRef.current || orgs.length === 0) return
    const tw = trackRef.current.scrollWidth / 2
    const tween = gsap.to(trackRef.current, {
      x: -tw,
      duration: orgs.length * 3,
      ease: 'none',
      repeat: -1,
    })
    return () => {
      tween.kill()
    }
  }, [orgs])

  const items = [...orgs, ...orgs]

  return (
    <div className="overflow-hidden border-b border-white/8 bg-white/3 py-2 select-none">
      <div ref={trackRef} className="flex gap-8 whitespace-nowrap">
        {items.map((o, i) => (
          <span
            key={`${o.id}-${i}`}
            className="inline-flex items-center gap-2 text-xs text-white/30"
          >
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="font-medium text-white/50">{o.display_name ?? o.name}</span>
            <StatusPill status={o.subscription_status} />
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Add Org modal ────────────────────────────────────────────────────────────
function AddOrgModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [orgName, setOrgName] = useState('')
  const [adminFullName, setAdminFullName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.2, ease: 'power2.out' },
    )
    gsap.fromTo(
      panelRef.current,
      { opacity: 0, y: 24, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out' },
    )
  }, [])

  const close = () => {
    gsap.to(panelRef.current, {
      opacity: 0,
      y: 16,
      scale: 0.97,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: onClose,
    })
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' })
  }

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/super-admin/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, adminFullName, adminEmail, adminPassword }),
      })
      const json = (await res.json()) as { success: boolean; error?: { message: string } }
      if (!json.success) {
        setError(json.error?.message ?? 'Failed to create organization.')
        return
      }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div>
            <h2
              className="text-sm font-semibold text-white"
              style={{ fontFamily: 'Geist, system-ui, sans-serif' }}
            >
              Create Organization
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Provisions org and admin account atomically.
            </p>
          </div>
          <button
            onClick={close}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/8 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <Label htmlFor="co-org" className="text-xs text-white/60 mb-1.5 block">
              Organization name
            </Label>
            <Input
              id="co-org"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#FA5D0C]/60 focus:ring-[#FA5D0C]/20"
              placeholder="Acme Corp"
            />
          </div>
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
            <p className="text-xs font-medium text-white/40 tracking-widest uppercase">
              Admin account
            </p>
            <div>
              <Label htmlFor="co-name" className="text-xs text-white/60 mb-1.5 block">
                Full name
              </Label>
              <Input
                id="co-name"
                value={adminFullName}
                onChange={(e) => setAdminFullName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#FA5D0C]/60"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <Label htmlFor="co-email" className="text-xs text-white/60 mb-1.5 block">
                Email
              </Label>
              <Input
                id="co-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#FA5D0C]/60"
                placeholder="jane@acmecorp.com"
              />
            </div>
            <div>
              <Label htmlFor="co-pw" className="text-xs text-white/60 mb-1.5 block">
                Password <span className="text-white/25">(min 12 chars)</span>
              </Label>
              <Input
                id="co-pw"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#FA5D0C]/60"
              />
            </div>
          </div>
          {error && (
            <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-white/8 px-6 py-4">
          <button
            onClick={close}
            className="rounded-lg px-4 py-2 text-sm text-white/50 hover:text-white hover:bg-white/8 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={loading}
            className="rounded-lg bg-[#FA5D0C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#3d6ef0] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating…' : 'Create organization'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SuperAdminOrgsPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showAddOrg, setShowAddOrg] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tableBodyRef = useRef<HTMLTableSectionElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const LIMIT = 25

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async (p = page, q = search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p) })
      if (q) params.set('search', q)
      const res = await fetch(`/api/super-admin/orgs?${params}`)
      const json = (await res.json()) as { success: boolean; data: { orgs: Org[]; total: number } }
      if (json.success) {
        setOrgs(json.data.orgs)
        setTotal(json.data.total)
      }
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void load(1, '')
  }, [load])

  // GSAP header entrance
  useEffect(() => {
    if (!headerRef.current) return
    gsap.fromTo(
      headerRef.current.querySelectorAll('.stat-tile'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out', delay: 0.1 },
    )
  }, [])

  // GSAP card-stack row entrance on data change
  useEffect(() => {
    if (!tableBodyRef.current || loading) return
    const rows = tableBodyRef.current.querySelectorAll('tr')
    gsap.fromTo(
      rows,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: 'power3.out' },
    )
  }, [orgs, loading])

  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => void load(1, val), 300)
  }

  const handlePage = (next: number) => {
    setPage(next)
    void load(next, search)
  }

  const totalPages = Math.ceil(total / LIMIT)

  const activeCount = orgs.filter((o) => o.subscription_status === 'active').length
  const trialCount = orgs.filter((o) => o.subscription_status === 'trial').length
  const expiredCount = orgs.filter((o) =>
    ['expired', 'cancelled'].includes(o.subscription_status),
  ).length

  return (
    <main
      className="overflow-x-hidden w-full max-w-full min-h-screen bg-[#09090f]"
      style={{ fontFamily: 'Geist, system-ui, sans-serif' }}
    >
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400 shadow-xl backdrop-blur-sm">
          {toast}
        </div>
      )}

      {/* ── Command header (Attention) ─────────────────────────────────── */}
      <div ref={headerRef} className="border-b border-white/8 bg-[#0c0c14] px-8 py-8">
        {/* Top bar */}
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-[#FA5D0C]" />
                <span className="text-xs font-semibold tracking-widest text-[#FA5D0C] uppercase">
                  Super Admin
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Organizations</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void load(page, search)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white/50 hover:text-white hover:border-white/20 transition-all duration-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
              <button
                onClick={() => setShowAddOrg(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#FA5D0C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3d6ef0] transition-colors duration-200 shadow-lg shadow-[#FA5D0C]/20"
              >
                <Plus className="h-3.5 w-3.5" />
                New org
              </button>
            </div>
          </div>

          {/* Stat grid (Bento — 4 cols, 0 empty cells, grid-flow-dense) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 grid-flow-dense">
            <div className="stat-tile">
              <StatTile label="Total" value={total} accent="#FA5D0C" />
            </div>
            <div className="stat-tile">
              <StatTile label="Active" value={activeCount} accent="#10b981" />
            </div>
            <div className="stat-tile">
              <StatTile label="Trial" value={trialCount} accent="#3b82f6" />
            </div>
            <div className="stat-tile">
              <StatTile label="Expired" value={expiredCount} accent="#ef4444" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Ticker (Interest — infinite marquee) ─────────────────────────── */}
      {orgs.length > 0 && <Ticker orgs={orgs} />}

      {/* ── Table section ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or slug…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/25 focus:border-[#FA5D0C]/50 focus:bg-white/7 focus:outline-none transition-all duration-200"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FA5D0C] animate-spin" />
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/8 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    {['Organization', 'Tier', 'Status', 'Trial / Expires', 'Created'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs font-semibold tracking-widest text-white/30 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody ref={tableBodyRef} className="divide-y divide-white/5">
                  {orgs.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => router.push(`/super-admin/orgs/${o.id}`)}
                      className="group cursor-pointer hover:bg-white/4 transition-colors duration-150"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <OrgAvatar name={o.display_name ?? o.name} />
                          <div>
                            <p className="text-sm font-semibold text-white group-hover:text-[#FA5D0C] transition-colors duration-150">
                              {o.display_name ?? o.name}
                            </p>
                            <p className="text-xs text-white/30 font-mono mt-0.5">{o.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <TierBadge tier={o.subscription_tier} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={o.subscription_status} />
                      </td>
                      <td className="px-5 py-4 text-xs text-white/40 font-mono">
                        {o.trial_ends_at ? (
                          `Trial ends ${format(new Date(o.trial_ends_at), 'MMM d, yyyy')}`
                        ) : o.subscription_expires_at ? (
                          `Expires ${format(new Date(o.subscription_expires_at), 'MMM d, yyyy')}`
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-white/40 font-mono">
                        {format(new Date(o.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {orgs.length === 0 && (
                <div className="py-20 text-center">
                  <Building2 className="mx-auto h-8 w-8 text-white/10 mb-3" />
                  <p className="text-sm text-white/30">
                    {search ? 'No organizations match your search.' : 'No organizations found.'}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5">
                <p className="text-xs text-white/30 font-mono">
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePage(page - 1)}
                    disabled={page === 1}
                    className="rounded-lg border border-white/10 p-2 text-white/50 hover:text-white hover:border-white/20 disabled:opacity-25 transition-all duration-150"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-4 text-xs text-white/40 font-mono">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePage(page + 1)}
                    disabled={page === totalPages}
                    className="rounded-lg border border-white/10 p-2 text-white/50 hover:text-white hover:border-white/20 disabled:opacity-25 transition-all duration-150"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAddOrg && (
        <AddOrgModal
          onClose={() => setShowAddOrg(false)}
          onSuccess={() => {
            setShowAddOrg(false)
            showToast('Organization created.')
            void load(1, search)
          }}
        />
      )}
    </main>
  )
}
