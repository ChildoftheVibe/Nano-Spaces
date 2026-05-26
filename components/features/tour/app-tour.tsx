'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

const TOUR_KEY = 'ns_tour_done'

function hasDoneTour(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === '1'
  } catch {
    return true
  }
}

function markTourDone() {
  try {
    localStorage.setItem(TOUR_KEY, '1')
  } catch {
    // localStorage not available
  }
}

const STEPS = [
  {
    title: 'Navigate Nano Spaces',
    text: 'Use the top nav to switch between the calendar, settings, and admin panels.',
  },
  {
    title: 'The booking calendar',
    text: 'Click any time slot to make a booking. Your reservations appear highlighted; others are shown separately.',
  },
  {
    title: 'Global search',
    text: 'Press Cmd+K (or Ctrl+K) to instantly search reservations, rooms, and people.',
  },
  {
    title: 'Notifications',
    text: 'The bell icon shows booking confirmations, approvals, and waitlist updates in real time.',
  },
]

export default function AppTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (hasDoneTour()) return
    const timer = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    markTourDone()
  }, [])

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      dismiss()
    }
  }, [step, dismiss])

  const back = useCallback(() => {
    setStep((s) => Math.max(0, s - 1))
  }, [])

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30"
        style={{ zIndex: 9998 }}
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Tour card — fixed, bottom-center, above legend row */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={current?.title}
        style={{
          position: 'fixed',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          pointerEvents: 'all',
          width: 'min(420px, calc(100vw - 32px))',
        }}
        className="rounded-2xl border border-white/[0.08] bg-[#12131A] shadow-[0_8px_48px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.06]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {/* Step dots */}
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="block rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 16 : 6,
                  height: 6,
                  background: i === step ? '#FA5D0C' : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={dismiss}
            style={{ pointerEvents: 'all' }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/80"
            aria-label="Dismiss tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-2">
          <p className="text-sm font-semibold text-white/90">{current?.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-white/50">{current?.text}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-xs text-white/25">
            {step + 1} / {STEPS.length}
          </span>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                style={{ pointerEvents: 'all' }}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white/80"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              style={{ pointerEvents: 'all' }}
              className="flex items-center gap-1.5 rounded-full bg-[#FA5D0C] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#D94E08]"
            >
              {isLast ? 'Done' : 'Next'}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
