import { cn } from '@/lib/utils'

const FEATURES = [
  'Book desks, rooms, and shared spaces in seconds',
  'Real-time availability across your entire organization',
  'Automated approvals, waitlists, and check-ins',
  'Detailed usage reports and space utilization insights',
]

interface AuthCardProps {
  children: React.ReactNode
  className?: string
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel — hidden on small screens */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[45%] lg:flex-col lg:justify-between bg-gradient-to-br from-[#2563eb] via-[#4F7EFA] to-[#7c3aed] p-12 text-white">
        {/* Subtle dot-grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Top: Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 shadow-inner">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="7" height="7" rx="1.5" fill="white" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.6" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.6" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" fill="white" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">Nano Spaces</span>
        </div>

        {/* Center: Headline + features */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-[2rem] font-bold leading-tight">
              Smart space management for modern teams
            </h2>
            <p className="mt-3 text-base text-blue-100">
              Give your team a better way to find and book the spaces they need — without the
              back-and-forth.
            </p>
          </div>

          <ul className="space-y-3.5">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-200"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-blue-50">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: Copyright */}
        <p className="relative z-10 text-xs text-blue-200">
          &copy; {new Date().getFullYear()} Nano Spaces. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-10">
        {/* Mobile-only logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F7EFA]">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="7" height="7" rx="1.5" fill="white" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.6" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.6" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" fill="white" />
            </svg>
          </div>
          <span className="text-base font-bold text-gray-900">Nano Spaces</span>
        </div>

        <div className={cn('w-full max-w-[400px]', className)}>{children}</div>
      </div>
    </div>
  )
}
