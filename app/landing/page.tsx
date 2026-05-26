'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* ─── tiny icon helpers (hairline strokes, no lucide defaults) ─── */
const IconCalendar = () => (
  <svg
    width="20"
    height="20"
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
    width="20"
    height="20"
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
    width="20"
    height="20"
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
    width="20"
    height="20"
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
    width="20"
    height="20"
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
    width="20"
    height="20"
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
    width="20"
    height="20"
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
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconArrow = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
)

/* ─── feature data ─── */
const features = [
  {
    icon: <IconCalendar />,
    title: 'Visual Calendar Booking',
    body: 'Drag-and-drop reservations with real-time availability. Your team sees every booking at a glance.',
    span: 'col-span-2 row-span-2',
    accent: '#4F7EFA',
  },
  {
    icon: <IconBuilding />,
    title: 'Multi-Space Management',
    body: 'Rooms, floors, buildings — organize any physical layout under one umbrella.',
    span: '',
    accent: '#7C6FFA',
  },
  {
    icon: <IconRepeat />,
    title: 'Recurring & Series',
    body: 'Weekly stand-ups, monthly reviews — create recurring series in seconds.',
    span: '',
    accent: '#4FBADB',
  },
  {
    icon: <IconUsers />,
    title: 'Smart Waitlists',
    body: 'When a slot opens, the next person in line is automatically offered a 30-minute hold.',
    span: '',
    accent: '#34C97B',
  },
  {
    icon: <IconShield />,
    title: 'Approval Workflows',
    body: 'Admins review and approve sensitive bookings before they are confirmed.',
    span: '',
    accent: '#F5A623',
  },
  {
    icon: <IconChart />,
    title: 'Usage Analytics',
    body: 'Peak-hour heatmaps, ghost-buster reports, and utilization trends per room.',
    span: 'col-span-2',
    accent: '#FA4F7E',
  },
  {
    icon: <IconBell />,
    title: 'Real-time Notifications',
    body: 'In-app bell, email, and web-push keep your team on the same page.',
    span: '',
    accent: '#4F7EFA',
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
    body: 'Your team books directly from the calendar. Conflict detection and real-time sync happen automatically.',
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

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  /* ── GSAP hero entrance ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-el', {
        y: 40,
        opacity: 0,
        filter: 'blur(8px)',
        duration: 1,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.2,
      })

      /* scroll-triggered reveals */
      gsap.utils.toArray<Element>('.reveal').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
          y: 32,
          opacity: 0,
          filter: 'blur(6px)',
          duration: 0.85,
          ease: 'power3.out',
        })
      })
    })
    return () => ctx.revert()
  }, [])

  /* ── lock scroll when menu open ── */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-[#040408] text-white font-[family-name:var(--font-jakarta)] overflow-x-hidden">
      {/* ── fixed grain overlay ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          opacity: 0.03,
        }}
      />

      {/* ── ambient background orbs ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-[#4F7EFA]/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full bg-[#7C6FFA]/8 blur-[100px]" />
        <div className="absolute bottom-0 left-10 w-[400px] h-[400px] rounded-full bg-[#4FBADB]/6 blur-[120px]" />
      </div>

      {/* ═══════════════ NAV ═══════════════ */}
      <header ref={navRef} className="fixed top-0 inset-x-0 z-40 flex justify-center pt-5 px-4">
        <nav className="flex items-center justify-between gap-8 px-5 py-3 rounded-full backdrop-blur-xl bg-white/[0.05] border border-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.04)] w-full max-w-4xl">
          {/* logo */}
          <a
            href="/landing"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight"
          >
            <div className="w-7 h-7 rounded-lg bg-[#4F7EFA] flex items-center justify-center text-[11px] font-bold text-white">
              N
            </div>
            Nano Spaces
          </a>

          {/* desktop links */}
          <div className="hidden md:flex items-center gap-6 text-xs text-white/50">
            <a href="#features" className="hover:text-white transition-colors duration-300">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors duration-300">
              How it works
            </a>
            <a href="#pricing" className="hover:text-white transition-colors duration-300">
              Pricing
            </a>
          </div>

          {/* cta group */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs text-white/50 hover:text-white transition-colors duration-300 px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-full bg-[#4F7EFA] px-4 py-1.5 text-xs font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#3D6FE8] active:scale-[0.97]"
            >
              Start free trial
              <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <IconArrow />
              </span>
            </Link>
          </div>

          {/* mobile hamburger */}
          <button
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((p) => !p)}
            className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-[5px]"
          >
            <span
              className={`block w-5 h-px bg-white transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${menuOpen ? 'rotate-45 translate-y-[6px]' : ''}`}
            />
            <span
              className={`block w-5 h-px bg-white transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${menuOpen ? '-rotate-45 -translate-y-[6px]' : ''}`}
            />
          </button>
        </nav>
      </header>

      {/* mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 backdrop-blur-3xl bg-black/85 flex flex-col items-center justify-center gap-8">
          {['#features', '#how-it-works', '#pricing'].map((href, i) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-2xl font-semibold text-white/80 hover:text-white transition-colors"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {href
                .replace('#', '')
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </a>
          ))}
          <div className="flex flex-col items-center gap-3 mt-4">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="text-white/50 hover:text-white text-sm"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-[#4F7EFA] px-6 py-2.5 text-sm font-semibold text-white"
            >
              Start free trial
            </Link>
          </div>
        </div>
      )}

      {/* ═══════════════ HERO ═══════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 pt-32 pb-24"
      >
        <div className="hero-el mb-6">
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium border border-white/[0.12] bg-white/[0.04] text-white/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F7EFA] animate-pulse" />
            Multi-tenant space booking platform
          </span>
        </div>

        <h1 className="hero-el text-5xl sm:text-6xl md:text-[80px] font-bold leading-[1.04] tracking-tight max-w-4xl">
          Your spaces,{' '}
          <span className="bg-gradient-to-r from-[#4F7EFA] via-[#7C6FFA] to-[#4FBADB] bg-clip-text text-transparent">
            perfectly booked
          </span>
        </h1>

        <p className="hero-el mt-6 max-w-xl text-base sm:text-lg text-white/45 leading-relaxed">
          Nano Spaces gives your organization a frictionless way to manage shared rooms, desks, and
          buildings — with real-time calendars, smart waitlists, and detailed usage analytics.
        </p>

        <div className="hero-el mt-10 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/signup"
            className="group flex items-center gap-2.5 rounded-full bg-[#4F7EFA] px-6 py-3 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#3D6FE8] active:scale-[0.97] shadow-[0_0_40px_rgba(79,126,250,0.3)]"
          >
            Start your 14-day free trial
            <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <IconArrow />
            </span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-white/40 hover:text-white transition-colors duration-300 px-4 py-3"
          >
            Already have an account →
          </Link>
        </div>

        <p className="hero-el mt-4 text-[11px] text-white/25 tracking-wide">
          No credit card required · Cancel anytime
        </p>

        {/* floating preview card */}
        <div className="hero-el mt-16 w-full max-w-3xl mx-auto">
          <div className="rounded-[2rem] bg-white/[0.04] ring-1 ring-white/[0.08] p-2">
            <div className="rounded-[calc(2rem-0.5rem)] bg-[#0a0b12] ring-1 ring-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden">
              {/* fake calendar header */}
              <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#4F7EFA]/20 flex items-center justify-center text-[#4F7EFA]">
                    <IconCalendar />
                  </div>
                  <span className="text-sm font-semibold text-white/80">May 2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full text-[10px] text-white/30 border border-white/[0.08]">
                    Month
                  </div>
                  <div className="px-3 py-1 rounded-full text-[10px] bg-white/[0.06] text-white/60">
                    Week
                  </div>
                </div>
              </div>
              {/* fake calendar grid */}
              <div className="grid grid-cols-7 gap-px bg-white/[0.04] text-center">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                  <div key={d} className="bg-[#0a0b12] py-2 text-[10px] text-white/25 font-medium">
                    {d}
                  </div>
                ))}
                {Array.from({ length: 35 }, (_, i) => {
                  const day = i - 1
                  const isWeekend = i % 7 >= 5
                  const hasEvent = [3, 8, 10, 15, 17, 22, 24, 28].includes(day)
                  const isToday = day === 25
                  return (
                    <div
                      key={i}
                      className={`bg-[#0a0b12] py-2.5 flex flex-col items-center gap-1 ${isWeekend ? 'opacity-30' : ''}`}
                    >
                      <span
                        className={`text-[11px] w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#4F7EFA] text-white font-semibold' : 'text-white/40'}`}
                      >
                        {day > 0 && day <= 31 ? day : ''}
                      </span>
                      {hasEvent && day > 0 && day <= 31 && (
                        <div
                          className={`w-12 h-1 rounded-full ${[8, 17, 28].includes(day) ? 'bg-[#7C6FFA]/60' : 'bg-[#4F7EFA]/60'}`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              {/* legend */}
              <div className="px-6 py-4 flex items-center gap-4">
                {[
                  ['Confirmed', '#4F7EFA'],
                  ['Pending', '#7C6FFA'],
                  ['Waitlisted', '#F5A623'],
                ].map(([label, color]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-[10px] text-white/25">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES BENTO ═══════════════ */}
      <section id="features" className="relative py-32 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-16">
            <span className="inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium border border-white/[0.12] bg-white/[0.04] text-white/40 mb-4">
              Features
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Everything your org needs
            </h2>
            <p className="mt-4 text-white/40 text-base max-w-md mx-auto">
              From a single meeting room to an enterprise campus — Nano Spaces scales with you.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`reveal rounded-[1.5rem] bg-white/[0.03] ring-1 ring-white/[0.07] p-1.5 ${
                  i === 0 ? 'lg:col-span-2 lg:row-span-2' : i === 5 ? 'sm:col-span-2' : ''
                }`}
              >
                <div className="h-full rounded-[calc(1.5rem-0.375rem)] bg-[#07080f] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-6 flex flex-col gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${f.accent}18`, color: f.accent }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <h3
                      className={`font-semibold text-white/90 ${i === 0 ? 'text-xl' : 'text-sm'}`}
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
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      {[
                        { label: 'Bookings today', val: '24', color: '#4F7EFA' },
                        { label: 'Utilization', val: '78%', color: '#34C97B' },
                        { label: 'Active rooms', val: '12', color: '#7C6FFA' },
                        { label: 'Pending approvals', val: '3', color: '#F5A623' },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3"
                        >
                          <p className="text-[10px] text-white/30 mb-1">{s.label}</p>
                          <p className="text-xl font-bold" style={{ color: s.color }}>
                            {s.val}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="reveal text-center mb-20">
            <span className="inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium border border-white/[0.12] bg-white/[0.04] text-white/40 mb-4">
              How it works
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Live in minutes, not months
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-[39px] top-10 bottom-10 w-px bg-gradient-to-b from-[#4F7EFA]/40 via-[#7C6FFA]/30 to-transparent hidden sm:block" />
            <div className="flex flex-col gap-10">
              {steps.map((s) => (
                <div key={s.n} className="reveal flex items-start gap-6">
                  <div className="shrink-0 w-20 h-20 rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.08] p-1 hidden sm:block">
                    <div className="w-full h-full rounded-[calc(1.25rem-0.25rem)] bg-[#07080f] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center justify-center">
                      <span className="text-[11px] font-bold text-white/20 tracking-widest">
                        {s.n}
                      </span>
                    </div>
                  </div>
                  <div className="pt-5">
                    <span className="sm:hidden text-[10px] font-bold text-white/20 tracking-widest mb-1 block">
                      {s.n}
                    </span>
                    <h3 className="text-lg font-semibold text-white/90">{s.title}</h3>
                    <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-md">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SOCIAL PROOF TICKER ═══════════════ */}
      <section className="py-12 overflow-hidden border-y border-white/[0.06]">
        <div className="flex gap-12 animate-[slide_30s_linear_infinite] whitespace-nowrap">
          {Array.from({ length: 3 }).flatMap(() =>
            [
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
            ].map((t) => (
              <span
                key={`${t}-${Math.random()}`}
                className="text-sm text-white/20 font-medium inline-flex items-center gap-3"
              >
                <span className="w-1 h-1 rounded-full bg-[#4F7EFA]/60" />
                {t}
              </span>
            )),
          )}
        </div>
      </section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="reveal text-center mb-16">
            <span className="inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium border border-white/[0.12] bg-white/[0.04] text-white/40 mb-4">
              Pricing
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-white/40 text-base max-w-sm mx-auto">
              Start free for 14 days. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Starter */}
            <div className="reveal rounded-[2rem] bg-white/[0.03] ring-1 ring-white/[0.07] p-2">
              <div className="h-full rounded-[calc(2rem-0.5rem)] bg-[#07080f] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-8 flex flex-col gap-6">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-white/30">
                    Starter
                  </span>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-white">$29</span>
                    <span className="text-sm text-white/30">/month</span>
                  </div>
                  <p className="mt-2 text-xs text-white/30">Billed monthly via PayPal</p>
                </div>
                <ul className="flex flex-col gap-3">
                  {starterFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                      <span className="w-4 h-4 rounded-full bg-[#4F7EFA]/15 text-[#4F7EFA] flex items-center justify-center shrink-0">
                        <IconCheck />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-auto flex items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/[0.1] px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/[0.1] transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
                >
                  Start free trial
                </Link>
              </div>
            </div>

            {/* Growth — highlighted */}
            <div className="reveal rounded-[2rem] bg-[#4F7EFA]/20 ring-1 ring-[#4F7EFA]/40 p-2 shadow-[0_0_60px_rgba(79,126,250,0.12)]">
              <div className="h-full rounded-[calc(2rem-0.5rem)] bg-[#07080f] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] p-8 flex flex-col gap-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#4F7EFA]/80">
                      Growth
                    </span>
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-[#4F7EFA]/20 text-[#4F7EFA]">
                      Most popular
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-white">$79</span>
                    <span className="text-sm text-white/30">/month</span>
                  </div>
                  <p className="mt-2 text-xs text-white/30">Billed monthly via PayPal</p>
                </div>
                <ul className="flex flex-col gap-3">
                  {growthFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                      <span className="w-4 h-4 rounded-full bg-[#4F7EFA]/25 text-[#4F7EFA] flex items-center justify-center shrink-0">
                        <IconCheck />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="group mt-auto flex items-center justify-center gap-2.5 rounded-full bg-[#4F7EFA] px-6 py-3 text-sm font-semibold text-white transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#3D6FE8] active:scale-[0.97] shadow-[0_0_30px_rgba(79,126,250,0.4)]"
                >
                  Start free trial
                  <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
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
              className="text-white/40 hover:text-white underline underline-offset-2 transition-colors"
            >
              Contact us
            </a>
          </p>
        </div>
      </section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="relative py-32 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="reveal rounded-[2rem] bg-white/[0.03] ring-1 ring-white/[0.07] p-2 shadow-[0_0_80px_rgba(79,126,250,0.08)]">
            <div className="rounded-[calc(2rem-0.5rem)] bg-[#06070e] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] px-8 py-16 flex flex-col items-center gap-6">
              <span className="inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium border border-white/[0.12] bg-white/[0.04] text-white/40">
                Get started today
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
                Ready to reclaim your{' '}
                <span className="bg-gradient-to-r from-[#4F7EFA] to-[#7C6FFA] bg-clip-text text-transparent">
                  shared spaces?
                </span>
              </h2>
              <p className="text-white/40 text-sm leading-relaxed max-w-sm">
                Join organizations that have eliminated double bookings, ghost reservations, and
                endless email chains.
              </p>
              <Link
                href="/signup"
                className="group flex items-center gap-2.5 rounded-full bg-[#4F7EFA] px-8 py-4 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#3D6FE8] active:scale-[0.97] shadow-[0_0_50px_rgba(79,126,250,0.35)]"
              >
                Start your free 14-day trial
                <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <IconArrow />
                </span>
              </Link>
              <p className="text-[11px] text-white/20">
                No credit card · No setup fees · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-white/[0.06] px-4 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-white/60">
            <div className="w-6 h-6 rounded-md bg-[#4F7EFA] flex items-center justify-center text-[10px] font-bold text-white">
              N
            </div>
            Nano Spaces
          </div>
          <div className="flex items-center gap-6 text-[11px] text-white/25">
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
          <p className="text-[11px] text-white/20">© 2026 Nano Spaces · All rights reserved</p>
        </div>
      </footer>

      {/* ticker keyframe injected via style tag */}
      <style>{`
        @keyframes slide {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  )
}
