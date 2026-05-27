'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'ns_cookie_consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-t border-white/[0.06] bg-[#0d0d14]/95 px-5 py-3.5 backdrop-blur-md sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-xl sm:border"
    >
      <p className="text-xs leading-relaxed text-white/50">
        We use essential cookies to keep you signed in and secure your session.{' '}
        <Link
          href="/privacy"
          className="text-white/70 underline underline-offset-2 hover:text-white transition-colors"
        >
          Privacy policy
        </Link>
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss cookie notice"
        className="shrink-0 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.10] hover:text-white"
      >
        Got it
      </button>
    </div>
  )
}
