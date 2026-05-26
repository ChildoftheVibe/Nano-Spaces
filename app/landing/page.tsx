'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* ─── hairline icons ─── */
const IconCalendar = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const IconBuilding = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 21V5a2 2 0 012-2h14a2 2 0 012 2v16" />
    <path d="M9 21V9h6v12" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
)
const IconUsers = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)
const IconChart = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)
const IconShield = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IconBell = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
)
const IconRepeat = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 014-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>
)
const IconCheck = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconArrow = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
)

/* ─── Calendar product preview ─── */
const CalendarPreview = () => {
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const events: {
    day: number
    start: number
    span: number
    title: string
    room: string
    color: string
  }[] = [
    { day: 0, start: 9, span: 2, title: 'Design Sync', room: 'Conf A', color: '#4F7EFA' },
    { day: 1, start: 11, span: 1, title: 'Stand-up', room: 'Lounge', color: '#7C6FFA' },
    { day: 2, start: 10, span: 3, title: 'Board Review', room: 'Board Rm', color: '#4F7EFA' },
    { day: 3, start: 14, span: 2, title: 'All Hands', room: 'Conf B', color: '#34C97B' },
    { day: 4, start: 9, span: 1, title: 'Retro', room: 'Conf A', color: '#7C6FFA' },
    { day: 4, start: 15, span: 2, title: 'Planning', room: 'Board Rm', color: '#4F7EFA' },
  ]
  return (
    <div className="flex h-full text-[10px]">
      {/* sidebar */}
      <div className="w-24 shrink-0 border-r border-white/[0.06] pt-10 flex flex-col">
        {hours.map((h) => (
          <div key={h} className="h-10 flex items-start px-3 pt-0.5 text-white/25">
            {h}:00
          </div>
        ))}
      </div>
      {/* day columns */}
      <div className="flex-1 grid grid-cols-5">
        {days.map((d, di) => (
          <div key={d} className="border-r border-white/[0.05] last:border-r-0">
            <div className="h-10 flex items-center justify-center text-white/40 font-medium border-b border-white/[0.06] sticky top-0 bg-[#07080d]">
              {d}
            </div>
            <div className="relative">
              {hours.map((_, hi) => (
                <div key={hi} className="h-10 border-b border-white/[0.04]" />
              ))}
              {events
                .filter((e) => e.day === di)
                .map((ev, i) => (
                  <div
                    key={i}
                    className="absolute left-1 right-1 rounded-md px-1.5 overflow-hidden"
                    style={{
                      top: `${(ev.start - 9) * 40 + 2}px`,
                      height: `${ev.span * 40 - 4}px`,
                      background: `${ev.color}18`,
                      borderLeft: `2px solid ${ev.color}`,
                    }}
                  >
                    <p
                      className="font-semibold leading-tight mt-0.5 truncate"
                      style={{ color: ev.color }}
                    >
                      {ev.title}
                    </p>
                    <p className="text-white/30 truncate">{ev.room}</p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── data ─── */
const features = [
  {
    icon: <IconCalendar />,
    title: 'Visual Calendar Booking',
    body: 'Drag-and-drop reservations with real-time availability. Your team sees every booking at a glance.',
    featured: true,
  },
  {
    icon: <IconBuilding />,
    title: 'Multi-Space Management',
    body: 'Rooms, floors, buildings — organize any physical layout under one umbrella.',
  },
  {
    icon: <IconRepeat />,
    title: 'Recurring & Series',
    body: 'Weekly stand-ups, monthly reviews — create recurring series in seconds.',
  },
  {
    icon: <IconUsers />,
    title: 'Smart Waitlists',
    body: 'When a slot opens, the next person is automatically offered a 30-minute hold.',
  },
  {
    icon: <IconShield />,
    title: 'Approval Workflows',
    body: 'Admins review and approve sensitive bookings before they are confirmed.',
  },
  {
    icon: <IconChart />,
    title: 'Usage Analytics',
    body: 'Peak-hour heatmaps, ghost-buster reports, and utilization trends per room.',
  },
  {
    icon: <IconBell />,
    title: 'Real-time Notifications',
    body: 'In-app bell, email, and web-push keep your team on the same page.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Create your organization',
    body: 'Sign up and configure your org in under 5 minutes. Add your logo, timezone, and spaces.',
  },
  {
    n: '02',
    title: 'Invite your team',
    body: 'Send role-based email invites. Users join with a single click — no extra accounts to manage.',
  },
  {
    n: '03',
    title: 'Start booking',
    body: 'Your team books directly from the calendar. Conflict detection and sync happen automatically.',
  },
]
const starterFeatures = [
  'Up to 10 rooms',
  'Up to 50 users',
  'Calendar & recurring bookings',
  'Email notifications',
  'Basic reports',
  '14-day free trial',
]
const growthFeatures = [
  'Unlimited rooms',
  'Unlimited users',
  'Approval workflows',
  'Waitlists & check-in QR',
  'Advanced analytics & exports',
  'Priority support',
  '14-day free trial',
]
const tickerItems = [
  'Calendar booking',
  'Waitlist management',
  'Approval workflows',
  'Usage heatmaps',
  'QR check-in',
  'Recurring series',
  'Role-based access',
  'Push notifications',
  'PayPal billing',
  'Data exports',
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-el', {
        y: 40,
        opacity: 0,
        filter: 'blur(8px)',
        duration: 1,
        stagger: 0.11,
        ease: 'power3.out',
        delay: 0.2,
      })
      gsap.utils.toArray<Element>('.reveal').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
          y: 36,
          opacity: 0,
          filter: 'blur(6px)',
          duration: 0.9,
          ease: 'power3.out',
        })
      })
    })
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-[#050507] text-[#E8EEFF] overflow-x-hidden font-[family-name:var(--font-jakarta)]">
      {/* ── fixed grain overlay ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          opacity: 0.03,
        }}
      />

      {/* ── ambient mesh background ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(79,126,250,0.09) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute top-[60%] -right-[10%] w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(124,111,250,0.07) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute top-[30%] -left-[10%] w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(79,126,250,0.05) 0%, transparent 65%)',
          }}
        />
      </div>

      {/* ════════════ NAV — floating glass pill ════════════ */}
      <header className="fixed top-0 inset-x-0 z-40 flex justify-center pt-5 px-4">
        <nav
          className="flex items-center justify-between gap-8 px-5 py-2.5 rounded-full w-full max-w-4xl
          backdrop-blur-xl bg-white/[0.04] border border-white/[0.08]
          shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.4)]"
        >
          <a
            href="/landing"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-[#4F7EFA] flex items-center justify-center shadow-[0_0_16px_rgba(79,126,250,0.5)]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM11 11h2v2h-2z" fill="white" />
              </svg>
            </div>
            <span className="ns-display">Nano Spaces</span>
          </a>

          <div className="hidden md:flex items-center gap-7 text-xs text-white/40">
            {[
              ['#features', 'Features'],
              ['#how-it-works', 'How it works'],
              ['#pricing', 'Pricing'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="hover:text-white/80 transition-colors duration-300"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs text-white/40 hover:text-white/80 transition-colors duration-300 px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-full bg-[#4F7EFA] px-4 py-2 text-xs font-semibold text-white
              transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
              hover:bg-[#3D6FE8] hover:shadow-[0_0_24px_rgba(79,126,250,0.4)] active:scale-[0.97]"
            >
              Start free trial
              <span
                className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center
                transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
                group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              >
                <IconArrow />
              </span>
            </Link>
          </div>

          <button
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((p) => !p)}
            className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-[5px]"
          >
            <span
              className={`block w-5 h-px bg-white/70 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${menuOpen ? 'rotate-45 translate-y-[6px]' : ''}`}
            />
            <span
              className={`block w-5 h-px bg-white/70 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${menuOpen ? '-rotate-45 -translate-y-[6px]' : ''}`}
            />
          </button>
        </nav>
      </header>

      {/* mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 backdrop-blur-3xl bg-[#050507]/90 flex flex-col items-center justify-center gap-9">
          {(
            [
              ['#features', 'Features'],
              ['#how-it-works', 'How it works'],
              ['#pricing', 'Pricing'],
            ] as [string, string][]
          ).map(([href, label], i) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-3xl font-semibold text-white/70 hover:text-white transition-colors duration-300 ns-display"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {label}
            </a>
          ))}
          <div className="flex flex-col items-center gap-4 mt-4">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-[#4F7EFA] px-8 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(79,126,250,0.4)]"
            >
              Start free trial
            </Link>
          </div>
        </div>
      )}

      {/* ════════════ HERO ════════════ */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 pt-36 pb-20">
        {/* eyebrow */}
        <div className="hero-el mb-7">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5
            text-[10px] uppercase tracking-[0.2em] font-medium
            border border-white/[0.1] bg-white/[0.04] text-white/40"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F7EFA] shadow-[0_0_8px_rgba(79,126,250,0.8)]" />
            Multi-tenant space booking platform
          </span>
        </div>

        {/* headline */}
        <h1 className="hero-el ns-display text-[clamp(44px,7vw,88px)] font-bold leading-[1.02] tracking-tight max-w-4xl">
          Your spaces,{' '}
          <span className="relative">
            <span className="bg-gradient-to-r from-[#4F7EFA] via-[#7C6FFA] to-[#4FBADB] bg-clip-text text-transparent">
              perfectly booked
            </span>
          </span>
        </h1>

        {/* sub */}
        <p className="hero-el mt-7 max-w-lg text-[15px] leading-relaxed text-white/40">
          Nano Spaces gives your organization a frictionless way to manage shared rooms, desks, and
          buildings — with real-time calendars, smart waitlists, and detailed usage analytics.
        </p>

        {/* CTAs */}
        <div className="hero-el mt-9 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/signup"
            className="group flex items-center gap-2.5 rounded-full bg-[#4F7EFA] px-7 py-3.5 text-sm font-semibold text-white
            transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
            hover:bg-[#3D6FE8] hover:shadow-[0_0_48px_rgba(79,126,250,0.45)] active:scale-[0.97]
            shadow-[0_0_32px_rgba(79,126,250,0.3)]"
          >
            Start your 14-day free trial
            <span
              className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center
              transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
              group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105"
            >
              <IconArrow />
            </span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-white/35 hover:text-white/70 transition-colors duration-300 px-4 py-3.5"
          >
            Already have an account →
          </Link>
        </div>

        <p className="hero-el mt-4 text-[11px] text-white/20 tracking-wide">
          No credit card required · Cancel anytime
        </p>

        {/* ── Z-Axis product preview ── */}
        <div
          className="hero-el relative mt-20 w-full max-w-4xl mx-auto"
          style={{ perspective: '1200px' }}
        >
          {/* shadow layer — depth card */}
          <div className="absolute inset-4 -bottom-4 rounded-[2rem] bg-[#4F7EFA]/10 blur-2xl" />

          {/* Double-Bezel outer shell */}
          <div
            className="relative rounded-[2rem] bg-white/[0.04] ring-1 ring-white/[0.08] p-1.5
            shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_32px_80px_rgba(0,0,0,0.6)]"
            style={{ transform: 'rotateX(4deg)', transformOrigin: 'bottom center' }}
          >
            {/* inner core */}
            <div
              className="rounded-[calc(2rem-0.375rem)] bg-[#07080d] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden"
              style={{ height: 340 }}
            >
              {/* window chrome */}
              <div className="flex items-center justify-between px-5 h-11 border-b border-white/[0.06] bg-[#07080d] shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/[0.08]" />
                  <div className="w-3 h-3 rounded-full bg-white/[0.08]" />
                  <div className="w-3 h-3 rounded-full bg-white/[0.08]" />
                  <span className="ml-3 text-[11px] text-white/20 font-medium">
                    Nano Spaces — Week of May 26, 2026
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {['Month', 'Week', 'Day'].map((v, i) => (
                    <span
                      key={v}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${i === 1 ? 'bg-[#4F7EFA]/20 text-[#4F7EFA]' : 'text-white/25'}`}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* calendar body */}
              <div className="h-[calc(100%-44px)] overflow-hidden">
                <CalendarPreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ TICKER ════════════ */}
      <div className="overflow-hidden border-y border-white/[0.06] py-4">
        <div
          className="flex gap-10 whitespace-nowrap"
          style={{ animation: 'ns-slide 28s linear infinite' }}
        >
          {[0, 1, 2].flatMap((rep) =>
            tickerItems.map((t, i) => (
              <span
                key={`${rep}-${i}`}
                className="inline-flex items-center gap-2.5 text-[11px] text-white/20 font-medium"
              >
                <span className="w-1 h-1 rounded-full bg-[#4F7EFA]/50" />
                {t}
              </span>
            )),
          )}
        </div>
      </div>

      {/* ════════════ FEATURES BENTO ════════════ */}
      <section id="features" className="relative py-40 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-16">
            <span className="inline-flex rounded-full px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium border border-white/[0.1] bg-white/[0.04] text-white/40 mb-5">
              Features
            </span>
            <h2 className="ns-display text-[clamp(32px,4vw,52px)] font-bold tracking-tight">
              Everything your org needs
            </h2>
            <p className="mt-4 text-white/40 text-[15px] leading-relaxed max-w-sm mx-auto">
              From a single meeting room to an enterprise campus.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-auto">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`reveal ${i === 0 ? 'lg:col-span-2 lg:row-span-2' : ''} ${i === 5 ? 'sm:col-span-2' : ''}`}
              >
                {/* Double-Bezel */}
                <div
                  className="h-full rounded-[2rem] bg-white/[0.03] ring-1 ring-white/[0.07] p-1.5
                  transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
                  hover:ring-white/[0.12] hover:bg-white/[0.05]"
                >
                  <div className="h-full rounded-[calc(2rem-0.375rem)] bg-[#07080d] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-6 flex flex-col gap-4">
                    {/* icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'rgba(79,126,250,0.1)',
                        color: '#4F7EFA',
                        border: '1px solid rgba(79,126,250,0.2)',
                      }}
                    >
                      {f.icon}
                    </div>

                    <div>
                      <h3
                        className={`ns-display font-semibold text-white/90 ${i === 0 ? 'text-xl' : 'text-sm'}`}
                      >
                        {f.title}
                      </h3>
                      <p
                        className={`mt-2 text-white/40 leading-relaxed ${i === 0 ? 'text-sm' : 'text-xs'}`}
                      >
                        {f.body}
                      </p>
                    </div>

                    {i === 0 && (
                      <div className="mt-auto grid grid-cols-2 gap-2.5">
                        {(
                          [
                            ['Bookings today', '24', '#4F7EFA'],
                            ['Utilization', '78%', '#34C97B'],
                            ['Active rooms', '12', '#7C6FFA'],
                            ['Pending approvals', '3', '#F5A623'],
                          ] as [string, string, string][]
                        ).map(([label, val, color]) => (
                          <div
                            key={label}
                            className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3"
                          >
                            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">
                              {label}
                            </p>
                            <p
                              className="ns-display text-2xl font-bold leading-none"
                              style={{ color }}
                            >
                              {val}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section id="how-it-works" className="relative py-40 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-20">
            <span className="inline-flex rounded-full px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium border border-white/[0.1] bg-white/[0.04] text-white/40 mb-5">
              How it works
            </span>
            <h2 className="ns-display text-[clamp(32px,4vw,52px)] font-bold tracking-tight">
              Live in minutes, not months
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* connector line */}
            <div className="hidden md:block absolute top-1/2 left-[calc(33.33%+0.5rem)] right-[calc(33.33%+0.5rem)] h-px bg-gradient-to-r from-[#4F7EFA]/20 via-[#7C6FFA]/30 to-[#4F7EFA]/20 z-10" />

            {steps.map((s) => (
              <div key={s.n} className="reveal">
                {/* Double-Bezel */}
                <div className="h-full rounded-[2rem] bg-white/[0.03] ring-1 ring-white/[0.07] p-1.5">
                  <div className="h-full rounded-[calc(2rem-0.375rem)] bg-[#07080d] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-7 flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <span className="ns-display text-4xl font-bold text-white/[0.08] tracking-tight leading-none">
                        {s.n}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-[#4F7EFA]/10 ring-1 ring-[#4F7EFA]/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[#4F7EFA]">{s.n}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="ns-display text-base font-semibold text-white/90 mb-2">
                        {s.title}
                      </h3>
                      <p className="text-sm text-white/40 leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ PRICING ════════════ */}
      <section id="pricing" className="relative py-40 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="reveal text-center mb-16">
            <span className="inline-flex rounded-full px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium border border-white/[0.1] bg-white/[0.04] text-white/40 mb-5">
              Pricing
            </span>
            <h2 className="ns-display text-[clamp(32px,4vw,52px)] font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-white/40 text-[15px]">
              Start free for 14 days. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Starter — Double-Bezel */}
            <div className="reveal rounded-[2rem] bg-white/[0.03] ring-1 ring-white/[0.07] p-1.5">
              <div className="h-full rounded-[calc(2rem-0.375rem)] bg-[#07080d] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-8 flex flex-col gap-7">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-white/30 mb-4">
                    Starter
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="ns-display text-5xl font-bold text-white tracking-tight">
                      $29
                    </span>
                    <span className="text-sm text-white/25">/month</span>
                  </div>
                  <p className="text-xs text-white/25 mt-1.5">Billed monthly via PayPal</p>
                </div>
                <div className="h-px bg-white/[0.06]" />
                <ul className="flex flex-col gap-3.5 flex-1">
                  {starterFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white/55">
                      <span
                        className="w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 text-[#4F7EFA]"
                        style={{
                          background: 'rgba(79,126,250,0.12)',
                          border: '1px solid rgba(79,126,250,0.2)',
                          width: 18,
                          height: 18,
                        }}
                      >
                        <IconCheck />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="flex items-center justify-center rounded-full bg-white/[0.05] ring-1 ring-white/[0.1] px-6 py-3.5 text-sm font-semibold text-white/70
                  transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.09] hover:text-white"
                >
                  Start free trial
                </Link>
              </div>
            </div>

            {/* Growth — Double-Bezel, glowing ring */}
            <div
              className="reveal rounded-[2rem] bg-[#4F7EFA]/[0.12] ring-1 ring-[#4F7EFA]/30 p-1.5
              shadow-[0_0_64px_rgba(79,126,250,0.1)]"
            >
              <div className="h-full rounded-[calc(2rem-0.375rem)] bg-[#07080d] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] p-8 flex flex-col gap-7">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#4F7EFA]/80">
                      Growth
                    </p>
                    <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold bg-[#4F7EFA]/15 text-[#4F7EFA]">
                      Most popular
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="ns-display text-5xl font-bold text-white tracking-tight">
                      $79
                    </span>
                    <span className="text-sm text-white/25">/month</span>
                  </div>
                  <p className="text-xs text-white/25 mt-1.5">Billed monthly via PayPal</p>
                </div>
                <div className="h-px bg-[#4F7EFA]/[0.15]" />
                <ul className="flex flex-col gap-3.5 flex-1">
                  {growthFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white/65">
                      <span
                        className="shrink-0 flex items-center justify-center text-[#4F7EFA]"
                        style={{
                          background: 'rgba(79,126,250,0.15)',
                          border: '1px solid rgba(79,126,250,0.25)',
                          borderRadius: '50%',
                          width: 18,
                          height: 18,
                        }}
                      >
                        <IconCheck />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="group flex items-center justify-center gap-2.5 rounded-full bg-[#4F7EFA] px-6 py-3.5 text-sm font-semibold text-white
                  transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
                  hover:bg-[#3D6FE8] hover:shadow-[0_0_32px_rgba(79,126,250,0.45)] active:scale-[0.97]
                  shadow-[0_0_24px_rgba(79,126,250,0.3)]"
                >
                  Start free trial
                  <span
                    className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center
                    transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
                    group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  >
                    <IconArrow />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <p className="reveal mt-8 text-center text-xs text-white/25">
            Need a custom plan for a large enterprise?{' '}
            <a
              href="mailto:hello@nanospaces.app"
              className="text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors"
            >
              Contact us
            </a>
          </p>
        </div>
      </section>

      {/* ════════════ FINAL CTA ════════════ */}
      <section className="relative py-40 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="reveal">
            {/* Double-Bezel CTA container */}
            <div
              className="rounded-[2.5rem] bg-white/[0.03] ring-1 ring-white/[0.08] p-1.5
              shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_32px_80px_rgba(79,126,250,0.08)]"
            >
              <div className="rounded-[calc(2.5rem-0.375rem)] bg-[#06070e] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] px-8 py-20 flex flex-col items-center gap-6 text-center">
                <span className="inline-flex rounded-full px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium border border-white/[0.1] bg-white/[0.04] text-white/40">
                  Get started today
                </span>
                <h2 className="ns-display text-[clamp(28px,4.5vw,52px)] font-bold tracking-tight leading-tight">
                  Ready to reclaim your{' '}
                  <span className="bg-gradient-to-r from-[#4F7EFA] to-[#7C6FFA] bg-clip-text text-transparent">
                    shared spaces?
                  </span>
                </h2>
                <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                  Join organizations that have eliminated double bookings, ghost reservations, and
                  endless email chains.
                </p>
                <Link
                  href="/signup"
                  className="group flex items-center gap-2.5 rounded-full bg-[#4F7EFA] px-8 py-4 text-sm font-semibold text-white
                  transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
                  hover:bg-[#3D6FE8] hover:shadow-[0_0_56px_rgba(79,126,250,0.5)] active:scale-[0.97]
                  shadow-[0_0_40px_rgba(79,126,250,0.35)]"
                >
                  Start your free 14-day trial
                  <span
                    className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center
                    transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
                    group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105"
                  >
                    <IconArrow />
                  </span>
                </Link>
                <p className="text-[11px] text-white/20">
                  No credit card · No setup fees · Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="border-t border-white/[0.06] px-4 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#4F7EFA] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM11 11h2v2h-2z" fill="white" />
              </svg>
            </div>
            <span className="ns-display text-sm font-semibold text-white/50">Nano Spaces</span>
          </div>
          <div className="flex items-center gap-7 text-xs text-white/25">
            <Link href="/terms" className="hover:text-white/50 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white/50 transition-colors">
              Privacy
            </Link>
            <a href="mailto:hello@nanospaces.app" className="hover:text-white/50 transition-colors">
              Contact
            </a>
          </div>
          <p className="text-xs text-white/20">© 2026 Nano Spaces · All rights reserved</p>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap');

        .ns-display {
          font-family: 'Bricolage Grotesque', var(--font-jakarta), sans-serif;
        }

        @keyframes ns-slide {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  )
}
