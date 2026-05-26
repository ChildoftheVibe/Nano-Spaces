'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react'

interface ChecklistItem {
  id: string
  label: string
  description: string
  href: string
  complete: boolean
}

const DISMISS_KEY_PREFIX = 'ns_checklist_dismissed_'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getDismissKey(orgId: string) {
  return `${DISMISS_KEY_PREFIX}${orgId}`
}

function isDismissed(orgId: string): boolean {
  try {
    const raw = localStorage.getItem(getDismissKey(orgId))
    if (!raw) return false
    const until = parseInt(raw, 10)
    return Date.now() < until
  } catch {
    return false
  }
}

function dismiss(orgId: string) {
  try {
    localStorage.setItem(getDismissKey(orgId), String(Date.now() + DISMISS_DURATION_MS))
  } catch {
    // localStorage not available — no-op
  }
}

export default function OnboardingChecklist({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [allComplete, setAllComplete] = useState(false)
  const [visible, setVisible] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (isDismissed(orgId)) return

    fetch('/api/org/onboarding-checklist')
      .then((r) => r.json())
      .then((res: { data?: { items: ChecklistItem[]; allComplete: boolean } }) => {
        if (!res.data) return
        setItems(res.data.items)
        setAllComplete(res.data.allComplete)
        // Don't show if everything is already done
        if (!res.data.allComplete) setVisible(true)
      })
      .catch(() => {
        // Fail silently — checklist is a non-critical feature
      })
  }, [orgId])

  if (!visible) return null

  const completedCount = items.filter((i) => i.complete).length

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-[#12131A] shadow-xl ring-1 ring-black/5 dark:ring-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-[#FA5D0C] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Getting started</p>
          <p className="text-xs text-white/70">
            {completedCount} of {items.length} complete
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded p-1 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            aria-label={collapsed ? 'Expand checklist' : 'Collapse checklist'}
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              dismiss(orgId)
              setVisible(false)
            }}
            className="rounded p-1 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-white/[0.06]">
        <div
          className="h-1 bg-[#FA5D0C] transition-all duration-500"
          style={{ width: `${items.length ? (completedCount / items.length) * 100 : 0}%` }}
        />
      </div>

      {/* Items */}
      {!collapsed && (
        <ul className="divide-y divide-gray-50 dark:divide-white/[0.05] py-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                {item.complete ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 dark:text-white/20" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${item.complete ? 'text-gray-400 dark:text-white/30 line-through' : 'text-gray-700 dark:text-white/80'}`}
                  >
                    {item.label}
                  </p>
                  {!item.complete && (
                    <p className="text-xs text-gray-400 dark:text-white/40">{item.description}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!collapsed && allComplete && (
        <div className="border-t border-gray-50 dark:border-white/[0.05] px-4 py-3 text-center">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            🎉 All set! You&apos;re ready to go.
          </p>
        </div>
      )}
    </div>
  )
}
