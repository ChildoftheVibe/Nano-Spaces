'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthCard } from '@/components/layout/auth-card'
import { Button } from '@/components/ui/button'

export default function AcceptTosPage() {
  const router = useRouter()
  const tosRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleScroll() {
    const el = tosRef.current
    if (!el || scrolled) return
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 20) setScrolled(true)
  }

  const handleAccept = async () => {
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/auth/accept-tos', { method: 'POST' })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError((json as { error?: { message?: string } }).error?.message ?? 'Something went wrong.')
      setSubmitting(false)
      return
    }

    router.push('/calendar')
  }

  return (
    <AuthCard className="max-w-[540px]">
      <h1 className="font-heading mb-1 text-2xl font-bold text-[var(--text-primary)]">
        Updated Terms of Service
      </h1>
      <p className="mb-5 text-sm text-gray-500">
        Our Terms of Service have been updated. Please read and accept the new version to continue.
      </p>

      <div
        ref={tosRef}
        onScroll={handleScroll}
        className="mb-3 h-56 overflow-y-auto rounded-lg border bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed"
      >
        <p className="mb-3 font-semibold text-[var(--text-primary)]">
          Terms of Service — Version 1.0
        </p>
        <p className="mb-3">
          By accessing or using Nano Spaces, you agree to be bound by these Terms of Service and all
          applicable laws and regulations.
        </p>
        <p className="mb-3">
          <strong>1. Use of the Service.</strong> You may use Nano Spaces only for lawful purposes.
          You may not share your credentials, attempt unauthorized access, or use the service to
          transmit harmful or fraudulent content.
        </p>
        <p className="mb-3">
          <strong>2. Accounts and Security.</strong> You are responsible for the security of your
          account. Two-factor authentication is required. Notify us immediately of any security
          breach or unauthorized use.
        </p>
        <p className="mb-3">
          <strong>3. Data and Privacy.</strong> Your use is governed by our Privacy Policy. Your
          organization&rsquo;s data is isolated using row-level security. We do not sell your
          personal data. You may export or request deletion of your data at any time.
        </p>
        <p className="mb-3">
          <strong>4. Service Availability.</strong> The Service is provided &ldquo;as is.&rdquo; We
          strive for high availability but do not guarantee uninterrupted access.
        </p>
        <p className="mb-3">
          <strong>5. Limitation of Liability.</strong> To the maximum extent permitted by applicable
          law, Nano Spaces shall not be liable for indirect or consequential damages. Our total
          liability shall not exceed amounts paid in the preceding three months.
        </p>
        <p className="mb-3">
          <strong>6. Changes.</strong> We may update these Terms. For material changes, we will
          notify users and require re-acceptance before continued use.
        </p>
        <p>
          Read the full{' '}
          <Link href="/terms" className="text-[var(--brand-primary)] underline" target="_blank">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-[var(--brand-primary)] underline" target="_blank">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {!scrolled && (
        <p className="mb-3 text-xs text-amber-600">
          ↓ Scroll to the bottom to enable the accept button
        </p>
      )}

      <label
        className={`mb-5 flex items-start gap-3 ${
          !scrolled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
      >
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[var(--brand-primary)]"
          checked={accepted}
          disabled={!scrolled}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span className="text-sm text-gray-700">
          I have read and agree to the updated Terms of Service
        </span>
      </label>

      {error && <p className="mb-4 text-sm text-[var(--color-danger)]">{error}</p>}

      <Button
        className="w-full"
        disabled={!accepted || submitting}
        onClick={() => void handleAccept()}
      >
        {submitting ? 'Saving…' : 'Accept & continue'}
      </Button>

      <p className="mt-4 text-center text-xs text-gray-400">
        Declining means you cannot access Nano Spaces.{' '}
        <button
          type="button"
          className="text-[var(--color-danger)] hover:underline"
          onClick={() => {
            void fetch('/api/auth/logout', { method: 'POST' }).then(() => {
              router.push('/login')
            })
          }}
        >
          Sign out
        </button>
      </p>
    </AuthCard>
  )
}
