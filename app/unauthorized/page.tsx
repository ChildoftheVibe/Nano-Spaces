import Link from 'next/link'
import { AuthCard } from '@/components/layout/auth-card'

const MESSAGES: Record<string, { title: string; body: string }> = {
  role: {
    title: 'Access denied',
    body: "You don't have permission to access this page. Contact your administrator if you believe this is an error.",
  },
  suspended: {
    title: 'Account suspended',
    body: 'Your account has been suspended. Please contact your organization administrator.',
  },
}

export default function UnauthorizedPage({ searchParams }: { searchParams: { reason?: string } }) {
  const msg = MESSAGES[searchParams.reason ?? ''] ?? MESSAGES['role']!

  return (
    <AuthCard>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-6 w-6 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"
          />
        </svg>
      </div>
      <h1 className="font-heading mb-2 text-2xl font-bold text-[var(--text-primary)]">
        {msg.title}
      </h1>
      <p className="mb-6 text-sm text-gray-500">{msg.body}</p>
      <Link href="/calendar" className="text-sm text-[var(--brand-primary)] hover:underline">
        Go to calendar
      </Link>
    </AuthCard>
  )
}
