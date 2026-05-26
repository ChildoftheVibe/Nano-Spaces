'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import NotificationBell from '@/components/features/notifications/notification-bell'
import GlobalSearch from '@/components/features/search/global-search'

export interface NavLink {
  href: string
  label: string
}

interface NavBarProps {
  brand: string
  brandHref?: string
  brandSub?: string
  links: NavLink[]
  isSuperAdmin?: boolean
  maxWidth?: string
}

export default function NavBar({
  brand,
  brandHref = '/calendar',
  brandSub,
  links,
  isSuperAdmin = false,
  maxWidth = 'max-w-7xl',
}: NavBarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const linkCls = (href: string) => {
    const active = pathname === href || (href !== '/calendar' && pathname.startsWith(href))
    return [
      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200',
      'font-[family-name:var(--font-rajdhani)] tracking-wide uppercase text-[11px]',
      active
        ? 'text-[#FA5D0C] bg-[#FA5D0C]/[0.08] dark:text-[#FA5D0C] dark:bg-[#FA5D0C]/[0.1]'
        : 'text-gray-600 hover:bg-gray-100 hover:text-[#FA5D0C] dark:text-white/50 dark:hover:bg-white/[0.07] dark:hover:text-[#FA5D0C]',
    ].join(' ')
  }

  return (
    <header
      className="sticky top-0 z-[200] border-b border-gray-200 bg-white dark:border-[#2C2948] dark:bg-[#141033] px-4 sm:px-6 py-2.5"
      style={{ borderBottomWidth: '1px' }}
    >
      <div className={`mx-auto flex ${maxWidth} items-center justify-between gap-3`}>
        {/* Brand — logo + name */}
        <Link href={brandHref} className="flex items-center gap-2.5 shrink-0 group">
          <Image
            src="/assets/icons/icon-transparent.png"
            alt="Nano Spaces"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
          />
          <div>
            <span
              className="text-base font-bold tracking-wide uppercase leading-none text-[var(--ns-dark)] dark:text-white/90 group-hover:text-[#FA5D0C] dark:group-hover:text-[#FA5D0C] transition-colors"
              style={{
                fontFamily: 'var(--font-rajdhani), Rajdhani, sans-serif',
                letterSpacing: '0.06em',
              }}
            >
              {brand}
            </span>
            {brandSub && (
              <span className="block text-[9px] font-medium tracking-widest uppercase text-gray-400 dark:text-white/25 leading-none mt-0.5">
                {brandSub}
              </span>
            )}
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2 flex-1 justify-end" data-tour="nav">
          <div data-tour="search">
            <GlobalSearch isSuperAdmin={isSuperAdmin} />
          </div>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={linkCls(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div data-tour="notifications">
            <NotificationBell />
          </div>
          <ThemeToggle />
        </div>

        {/* Mobile: bell + toggle + hamburger */}
        <div className="flex md:hidden items-center gap-1">
          <div data-tour="notifications">
            <NotificationBell />
          </div>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/[0.07] transition-colors"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden mt-2 border-t border-gray-100 dark:border-white/[0.05] pt-3 pb-2">
          <div className="px-1 mb-3">
            <GlobalSearch isSuperAdmin={isSuperAdmin} />
          </div>
          <nav className="flex flex-col gap-0.5">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-white/65 dark:hover:bg-white/[0.05] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
