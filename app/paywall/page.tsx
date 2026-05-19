import Link from 'next/link'
import { AuthCard } from '@/components/layout/auth-card'

export default function PaywallPage() {
  return (
    <AuthCard>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
        <svg
          className="h-6 w-6 text-yellow-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h1 className="font-heading mb-2 text-2xl font-bold text-[var(--text-primary)]">
        Subscription required
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Your organization&apos;s subscription has lapsed. To restore access, please update your
        billing information.
      </p>

      <div className="space-y-3">
        <Link
          href="/settings/billing"
          className="block w-full rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-center text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--brand-dark)]"
        >
          Update billing
        </Link>
        <p className="text-center text-xs text-gray-500">
          Need help?{' '}
          <a
            href="mailto:support@nanospaces.app"
            className="text-[var(--brand-primary)] hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </AuthCard>
  )
}
