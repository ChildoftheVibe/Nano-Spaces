'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* ─── icons ─── */
const IconCalendar = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
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
    strokeWidth="1.5"
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
    strokeWidth="1.5"
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
    strokeWidth="1.5"
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
    strokeWidth="1.5"
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
    strokeWidth="1.5"
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
    strokeWidth="1.5"
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
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
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
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
)

/* ─── Floor Plan SVG product preview ─── */
const FloorPlan = () => (
  <svg
    viewBox="0 0 480 288"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
  >
    {/* faint grid */}
    {Array.from({ length: 13 }).map((_, i) => (
      <line
        key={`vg${i}`}
        x1={i * 40}
        y1="0"
        x2={i * 40}
        y2="288"
        stroke="rgba(86,112,200,0.12)"
        strokeWidth="0.5"
      />
    ))}
    {Array.from({ length: 8 }).map((_, i) => (
      <line
        key={`hg${i}`}
        x1="0"
        y1={i * 40}
        x2="480"
        y2={i * 40}
        stroke="rgba(86,112,200,0.12)"
        strokeWidth="0.5"
      />
    ))}

    {/* outer walls */}
    <rect
      className="fp-el"
      x="16"
      y="16"
      width="448"
      height="256"
      stroke="rgba(180,195,240,0.55)"
      strokeWidth="1.75"
      fill="none"
    />

    {/* corridor divider */}
    <line
      className="fp-el"
      x1="16"
      y1="152"
      x2="464"
      y2="152"
      stroke="rgba(180,195,240,0.4)"
      strokeWidth="1.25"
    />

    {/* top room dividers */}
    <line
      className="fp-el"
      x1="176"
      y1="16"
      x2="176"
      y2="152"
      stroke="rgba(180,195,240,0.4)"
      strokeWidth="1.25"
    />
    <line
      className="fp-el"
      x1="320"
      y1="16"
      x2="320"
      y2="152"
      stroke="rgba(180,195,240,0.4)"
      strokeWidth="1.25"
    />

    {/* bottom room dividers */}
    <line
      className="fp-el"
      x1="136"
      y1="152"
      x2="136"
      y2="272"
      stroke="rgba(180,195,240,0.35)"
      strokeWidth="1"
    />
    <line
      className="fp-el"
      x1="256"
      y1="152"
      x2="256"
      y2="272"
      stroke="rgba(180,195,240,0.35)"
      strokeWidth="1"
    />
    <line
      className="fp-el"
      x1="376"
      y1="152"
      x2="376"
      y2="272"
      stroke="rgba(180,195,240,0.35)"
      strokeWidth="1"
    />

    {/* CONF-A — booked (amber fill) */}
    <rect className="fp-el" x="17" y="17" width="158" height="134" fill="rgba(232,160,32,0.1)" />
    <rect
      className="fp-el"
      x="17"
      y="17"
      width="158"
      height="134"
      stroke="rgba(232,160,32,0.4)"
      strokeWidth="0.75"
      fill="none"
    />
    <text
      className="fp-el"
      x="28"
      y="44"
      fill="rgba(232,160,32,0.9)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="8"
      fontWeight="600"
      letterSpacing="1"
    >
      CONF-A
    </text>
    <text
      className="fp-el"
      x="28"
      y="56"
      fill="rgba(232,160,32,0.5)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="7"
    >
      BOOKED · 10:00–11:30
    </text>
    <text
      className="fp-el"
      x="28"
      y="68"
      fill="rgba(232,160,32,0.4)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="6.5"
    >
      CAP: 8
    </text>
    <circle
      className="fp-el"
      cx="152"
      cy="30"
      r="5"
      fill="rgba(232,160,32,0.25)"
      stroke="rgba(232,160,32,0.7)"
      strokeWidth="1"
    />
    <circle className="fp-el" cx="152" cy="30" r="2.5" fill="#E8A020" />

    {/* CONF-B — available (blue) */}
    <rect className="fp-el" x="177" y="17" width="142" height="134" fill="rgba(79,126,250,0.06)" />
    <text
      className="fp-el"
      x="188"
      y="44"
      fill="rgba(140,170,255,0.6)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="8"
      fontWeight="500"
      letterSpacing="1"
    >
      CONF-B
    </text>
    <text
      className="fp-el"
      x="188"
      y="56"
      fill="rgba(140,170,255,0.35)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="7"
    >
      AVAILABLE
    </text>
    <text
      className="fp-el"
      x="188"
      y="68"
      fill="rgba(140,170,255,0.3)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="6.5"
    >
      CAP: 6
    </text>
    <circle
      className="fp-el"
      cx="312"
      cy="30"
      r="4.5"
      fill="rgba(79,126,250,0.2)"
      stroke="rgba(79,126,250,0.4)"
      strokeWidth="1"
    />
    <circle className="fp-el" cx="312" cy="30" r="2" fill="rgba(79,126,250,0.7)" />

    {/* BOARD — booked (amber) */}
    <rect className="fp-el" x="321" y="17" width="142" height="134" fill="rgba(232,160,32,0.08)" />
    <rect
      className="fp-el"
      x="321"
      y="17"
      width="142"
      height="134"
      stroke="rgba(232,160,32,0.35)"
      strokeWidth="0.75"
      fill="none"
    />
    <text
      className="fp-el"
      x="332"
      y="44"
      fill="rgba(232,160,32,0.9)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="8"
      fontWeight="600"
      letterSpacing="1"
    >
      BOARD RM
    </text>
    <text
      className="fp-el"
      x="332"
      y="56"
      fill="rgba(232,160,32,0.5)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="7"
    >
      BOOKED · 14:00–16:00
    </text>
    <text
      className="fp-el"
      x="332"
      y="68"
      fill="rgba(232,160,32,0.4)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="6.5"
    >
      CAP: 16
    </text>
    <circle
      className="fp-el"
      cx="456"
      cy="30"
      r="5"
      fill="rgba(232,160,32,0.25)"
      stroke="rgba(232,160,32,0.7)"
      strokeWidth="1"
    />
    <circle className="fp-el" cx="456" cy="30" r="2.5" fill="#E8A020" />

    {/* corridor label */}
    <text
      className="fp-el"
      x="200"
      y="166"
      fill="rgba(140,170,240,0.25)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="7"
      letterSpacing="3"
    >
      CORRIDOR
    </text>

    {/* bottom rooms */}
    <rect className="fp-el" x="17" y="153" width="118" height="118" fill="rgba(79,126,250,0.04)" />
    <text
      className="fp-el"
      x="28"
      y="210"
      fill="rgba(140,170,255,0.4)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="7.5"
    >
      OFFICE 1
    </text>
    <text
      className="fp-el"
      x="28"
      y="222"
      fill="rgba(140,170,255,0.25)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="6.5"
    >
      AVAILABLE
    </text>

    <rect className="fp-el" x="137" y="153" width="118" height="118" fill="rgba(232,160,32,0.07)" />
    <rect
      className="fp-el"
      x="137"
      y="153"
      width="118"
      height="118"
      stroke="rgba(232,160,32,0.3)"
      strokeWidth="0.75"
      fill="none"
    />
    <text
      className="fp-el"
      x="148"
      y="210"
      fill="rgba(232,160,32,0.8)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="7.5"
    >
      OFFICE 2
    </text>
    <text
      className="fp-el"
      x="148"
      y="222"
      fill="rgba(232,160,32,0.45)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="6.5"
    >
      BOOKED · NOW
    </text>
    <circle
      className="fp-el"
      cx="246"
      cy="162"
      r="4.5"
      fill="rgba(232,160,32,0.2)"
      stroke="rgba(232,160,32,0.6)"
      strokeWidth="1"
    />
    <circle className="fp-el" cx="246" cy="162" r="2" fill="#E8A020" />

    <rect className="fp-el" x="257" y="153" width="118" height="118" fill="rgba(79,126,250,0.04)" />
    <text
      className="fp-el"
      x="268"
      y="210"
      fill="rgba(140,170,255,0.4)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="7.5"
    >
      LOUNGE
    </text>
    <text
      className="fp-el"
      x="268"
      y="222"
      fill="rgba(140,170,255,0.25)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="6.5"
    >
      AVAILABLE
    </text>

    <rect className="fp-el" x="377" y="153" width="86" height="118" fill="rgba(79,126,250,0.04)" />
    <text
      className="fp-el"
      x="388"
      y="210"
      fill="rgba(140,170,255,0.4)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="7.5"
    >
      KITCHEN
    </text>

    {/* measurement lines */}
    <line
      className="fp-el"
      x1="16"
      y1="8"
      x2="464"
      y2="8"
      stroke="rgba(232,160,32,0.2)"
      strokeWidth="0.5"
    />
    <line
      className="fp-el"
      x1="16"
      y1="5"
      x2="16"
      y2="11"
      stroke="rgba(232,160,32,0.2)"
      strokeWidth="0.5"
    />
    <line
      className="fp-el"
      x1="464"
      y1="5"
      x2="464"
      y2="11"
      stroke="rgba(232,160,32,0.2)"
      strokeWidth="0.5"
    />
    <text
      className="fp-el"
      x="218"
      y="6.5"
      fill="rgba(232,160,32,0.3)"
      fontFamily="'JetBrains Mono', monospace"
      fontSize="5.5"
    >
      448 units
    </text>

    <line
      className="fp-el"
      x1="472"
      y1="16"
      x2="472"
      y2="272"
      stroke="rgba(232,160,32,0.2)"
      strokeWidth="0.5"
    />
    <line
      className="fp-el"
      x1="469"
      y1="16"
      x2="475"
      y2="16"
      stroke="rgba(232,160,32,0.2)"
      strokeWidth="0.5"
    />
    <line
      className="fp-el"
      x1="469"
      y1="272"
      x2="475"
      y2="272"
      stroke="rgba(232,160,32,0.2)"
      strokeWidth="0.5"
    />
  </svg>
)

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
    body: 'When a slot opens, the next person in line is automatically offered a 30-minute hold.',
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
        y: 22,
        opacity: 0,
        duration: 0.8,
        stagger: 0.09,
        ease: 'power3.out',
        delay: 0.15,
      })
      gsap.from('.fp-el', {
        opacity: 0,
        duration: 0.35,
        stagger: 0.04,
        ease: 'power2.out',
        delay: 0.7,
      })
      gsap.utils.toArray<Element>('.reveal').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
          y: 26,
          opacity: 0,
          duration: 0.75,
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
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: '#07091A', color: '#D8DFEE', fontFamily: 'var(--font-jakarta)' }}
    >
      {/* ── Blueprint grid background ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(86,112,200,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(86,112,200,0.07) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Ambient glow ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '5%',
            width: 640,
            height: 640,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,160,32,0.06) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            right: '-5%',
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79,126,250,0.07) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ── Grain overlay ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          opacity: 0.025,
        }}
      />

      {/* ════════════ NAV ════════════ */}
      <header
        className="fixed top-0 inset-x-0 z-40"
        style={{
          borderBottom: '1px solid rgba(140,170,240,0.08)',
          background: 'rgba(7,9,26,0.85)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-8">
          {/* logo */}
          <a href="/landing" className="flex items-center gap-2.5 shrink-0">
            <div
              style={{
                width: 28,
                height: 28,
                background: '#E8A020',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" fill="rgba(7,9,26,0.9)" />
                <rect x="9" y="2" width="5" height="5" fill="rgba(7,9,26,0.9)" />
                <rect x="2" y="9" width="5" height="5" fill="rgba(7,9,26,0.9)" />
                <rect x="9" y="9" width="2" height="2" fill="rgba(7,9,26,0.9)" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: "'Syne', var(--font-jakarta), sans-serif",
                fontWeight: 700,
                fontSize: 14,
                color: '#D8DFEE',
                letterSpacing: '-0.01em',
              }}
            >
              Nano Spaces
            </span>
          </a>

          {/* desktop nav */}
          <div className="hidden md:flex items-center gap-7">
            {[
              ['#features', 'FEATURES'],
              ['#how-it-works', 'HOW IT WORKS'],
              ['#pricing', 'PRICING'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'rgba(216,223,238,0.4)',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(232,160,32,0.85)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(216,223,238,0.4)')}
              >
                {label}
              </a>
            ))}
          </div>

          {/* cta */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              style={{
                fontSize: 12,
                color: 'rgba(216,223,238,0.4)',
                padding: '6px 12px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(216,223,238,0.85)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(216,223,238,0.4)')}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="group flex items-center gap-2"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: '#07091A',
                background: '#E8A020',
                borderRadius: 6,
                padding: '7px 16px',
                transition: 'background 0.2s, transform 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = '#F0B030'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = '#E8A020'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              START FREE TRIAL
              <IconArrow />
            </Link>
          </div>

          {/* mobile hamburger */}
          <button
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((p) => !p)}
            className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-[5px]"
          >
            <span
              style={{
                display: 'block',
                width: 18,
                height: 1,
                background: '#D8DFEE',
                transition: 'all 0.3s',
                transform: menuOpen ? 'rotate(45deg) translateY(6px)' : 'none',
              }}
            />
            <span
              style={{
                display: 'block',
                width: 18,
                height: 1,
                background: '#D8DFEE',
                transition: 'all 0.3s',
                transform: menuOpen ? 'rotate(-45deg) translateY(-6px)' : 'none',
              }}
            />
          </button>
        </div>
      </header>

      {/* mobile menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-10"
          style={{ background: 'rgba(7,9,26,0.97)', backdropFilter: 'blur(20px)' }}
        >
          {[
            ['#features', 'FEATURES'],
            ['#how-it-works', 'HOW IT WORKS'],
            ['#pricing', 'PRICING'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20,
                letterSpacing: '0.15em',
                color: 'rgba(216,223,238,0.7)',
                fontWeight: 600,
              }}
            >
              {label}
            </a>
          ))}
          <div className="flex flex-col items-center gap-4 mt-4">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              style={{ fontSize: 14, color: 'rgba(216,223,238,0.4)' }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: '#07091A',
                background: '#E8A020',
                borderRadius: 6,
                padding: '12px 28px',
              }}
            >
              START FREE TRIAL
            </Link>
          </div>
        </div>
      )}

      {/* ════════════ HERO ════════════ */}
      <section className="relative min-h-[100dvh] flex items-center pt-14">
        <div className="max-w-6xl mx-auto px-5 w-full py-20 md:py-0 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* left: text */}
          <div className="flex flex-col gap-6">
            <div className="hero-el">
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  color: '#E8A020',
                  fontWeight: 500,
                }}
              >
                {'// MULTI-TENANT SPACE BOOKING PLATFORM'}
              </span>
            </div>

            <h1
              className="hero-el"
              style={{
                fontFamily: "'Syne', var(--font-jakarta), sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(40px,5.5vw,72px)',
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                color: '#EEF1F9',
              }}
            >
              Every room.
              <br />
              Every team.
              <br />
              <span style={{ color: '#E8A020' }}>One calendar.</span>
            </h1>

            <p
              className="hero-el"
              style={{
                fontSize: 15,
                lineHeight: 1.75,
                color: 'rgba(216,223,238,0.5)',
                maxWidth: 440,
              }}
            >
              Nano Spaces gives your organization a frictionless way to manage shared rooms, desks,
              and buildings — with real-time calendars, smart waitlists, and detailed usage
              analytics.
            </p>

            <div className="hero-el flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link
                href="/signup"
                className="group flex items-center gap-2.5"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#07091A',
                  background: '#E8A020',
                  borderRadius: 8,
                  padding: '13px 24px',
                  boxShadow: '0 0 32px rgba(232,160,32,0.25)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = '#F0B030'
                  ;(e.currentTarget as HTMLElement).style.boxShadow =
                    '0 0 48px rgba(232,160,32,0.4)'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = '#E8A020'
                  ;(e.currentTarget as HTMLElement).style.boxShadow =
                    '0 0 32px rgba(232,160,32,0.25)'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                }}
              >
                START 14-DAY FREE TRIAL
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 5,
                    background: 'rgba(7,9,26,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconArrow />
                </span>
              </Link>
              <Link
                href="/login"
                style={{
                  fontSize: 12,
                  color: 'rgba(216,223,238,0.35)',
                  padding: '6px 0',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(216,223,238,0.75)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(216,223,238,0.35)')}
              >
                Already have an account →
              </Link>
            </div>

            {/* stat row */}
            <div
              className="hero-el flex items-center gap-6 pt-2"
              style={{ borderTop: '1px solid rgba(140,170,240,0.1)' }}
            >
              {[
                ['NO CREDIT CARD', ''],
                ['CANCEL ANYTIME', ''],
                ['14-DAY TRIAL', ''],
              ].map(([label]) => (
                <span
                  key={label}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '0.12em',
                    color: 'rgba(216,223,238,0.25)',
                    fontWeight: 500,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* right: floor plan */}
          <div className="hero-el relative">
            {/* outer bezel */}
            <div
              style={{
                borderRadius: 16,
                border: '1px solid rgba(140,170,240,0.12)',
                background: 'rgba(12,16,36,0.7)',
                padding: '1px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(140,170,240,0.06)',
              }}
            >
              {/* inner */}
              <div
                style={{ borderRadius: 15, background: 'rgba(9,12,26,0.95)', overflow: 'hidden' }}
              >
                {/* window bar */}
                <div
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid rgba(140,170,240,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'rgba(232,160,32,0.6)',
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        letterSpacing: '0.1em',
                        color: 'rgba(216,223,238,0.3)',
                      }}
                    >
                      FLOOR-01 · LIVE VIEW
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 8,
                        color: '#E8A020',
                        opacity: 0.7,
                      }}
                    >
                      3 ACTIVE
                    </span>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#34C97B',
                        boxShadow: '0 0 8px rgba(52,201,123,0.6)',
                        animation: 'ns-blink 2s ease-in-out infinite',
                      }}
                    />
                  </div>
                </div>
                {/* floor plan svg */}
                <div style={{ padding: '16px', background: 'rgba(7,9,26,0.5)' }}>
                  <FloorPlan />
                </div>
                {/* status bar */}
                <div
                  style={{
                    padding: '8px 16px',
                    borderTop: '1px solid rgba(140,170,240,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  {[
                    ['BOOKED', '#E8A020'],
                    ['AVAILABLE', 'rgba(140,170,255,0.6)'],
                  ].map(([label, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div
                        style={{ width: 6, height: 6, borderRadius: '50%', background: color }}
                      />
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 8,
                          color: 'rgba(216,223,238,0.3)',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 8,
                      color: 'rgba(216,223,238,0.2)',
                    }}
                  >
                    SYNC: LIVE
                  </span>
                </div>
              </div>
            </div>

            {/* floating stat cards */}
            <div className="hero-el absolute -left-5 top-1/4 hidden lg:flex flex-col gap-2">
              <div
                style={{
                  background: 'rgba(12,16,36,0.9)',
                  border: '1px solid rgba(232,160,32,0.2)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    letterSpacing: '0.1em',
                    color: 'rgba(232,160,32,0.6)',
                    marginBottom: 4,
                  }}
                >
                  UTILIZATION
                </div>
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#E8A020',
                    lineHeight: 1,
                  }}
                >
                  78%
                </div>
              </div>
            </div>
            <div className="hero-el absolute -right-4 bottom-1/4 hidden lg:flex flex-col gap-2">
              <div
                style={{
                  background: 'rgba(12,16,36,0.9)',
                  border: '1px solid rgba(79,126,250,0.2)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    letterSpacing: '0.1em',
                    color: 'rgba(140,170,255,0.6)',
                    marginBottom: 4,
                  }}
                >
                  TODAY
                </div>
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#8BAAF0',
                    lineHeight: 1,
                  }}
                >
                  24
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 7,
                    color: 'rgba(140,170,255,0.35)',
                  }}
                >
                  BOOKINGS
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ TICKER ════════════ */}
      <div
        className="overflow-hidden py-5"
        style={{
          borderTop: '1px solid rgba(140,170,240,0.08)',
          borderBottom: '1px solid rgba(140,170,240,0.08)',
        }}
      >
        <div
          className="flex gap-10 whitespace-nowrap"
          style={{ animation: 'ns-slide 28s linear infinite' }}
        >
          {[0, 1, 2].flatMap((rep) =>
            tickerItems.map((t, i) => (
              <span
                key={`${rep}-${i}`}
                className="inline-flex items-center gap-2.5"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'rgba(216,223,238,0.2)',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: '#E8A020',
                    opacity: 0.5,
                    display: 'inline-block',
                  }}
                />
                {t.toUpperCase()}
              </span>
            )),
          )}
        </div>
      </div>

      {/* ════════════ FEATURES ════════════ */}
      <section id="features" className="relative py-32 px-5">
        <div className="max-w-5xl mx-auto">
          {/* section header */}
          <div className="reveal mb-16">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 32, height: 1, background: '#E8A020', opacity: 0.6 }} />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: '#E8A020',
                  fontWeight: 600,
                }}
              >
                FEATURES
              </span>
            </div>
            <h2
              style={{
                fontFamily: "'Syne', var(--font-jakarta), sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(32px,4vw,52px)',
                letterSpacing: '-0.03em',
                color: '#EEF1F9',
                lineHeight: 1.1,
                maxWidth: 480,
              }}
            >
              Everything your org needs
            </h2>
            <p
              style={{
                marginTop: 16,
                fontSize: 14,
                lineHeight: 1.8,
                color: 'rgba(216,223,238,0.4)',
                maxWidth: 380,
              }}
            >
              From a single meeting room to an enterprise campus — Nano Spaces scales with you.
            </p>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px"
            style={{
              background: 'rgba(140,170,240,0.08)',
              border: '1px solid rgba(140,170,240,0.08)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`reveal ${i === 0 ? 'lg:col-span-2 lg:row-span-2' : ''} ${i === 5 ? 'sm:col-span-2' : ''}`}
                style={{
                  background: i === 0 ? 'rgba(12,16,36,0.9)' : 'rgba(9,12,26,0.9)',
                  padding: 28,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {i === 0 && (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `linear-gradient(rgba(86,112,200,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(86,112,200,0.05) 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* amber bracket accent for feature 0 */}
                {i === 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 3,
                      height: '100%',
                      background: 'linear-gradient(to bottom, #E8A020, rgba(232,160,32,0.1))',
                    }}
                  />
                )}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: i === 0 ? 'rgba(232,160,32,0.12)' : 'rgba(140,170,255,0.08)',
                      border: `1px solid ${i === 0 ? 'rgba(232,160,32,0.25)' : 'rgba(140,170,255,0.12)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: i === 0 ? '#E8A020' : 'rgba(140,170,255,0.6)',
                      marginBottom: 16,
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Syne', var(--font-jakarta), sans-serif",
                      fontWeight: 700,
                      fontSize: i === 0 ? 18 : 13,
                      color: '#EEF1F9',
                      marginBottom: 8,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontSize: i === 0 ? 13 : 12,
                      lineHeight: 1.7,
                      color: 'rgba(216,223,238,0.4)',
                    }}
                  >
                    {f.body}
                  </p>
                  {i === 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-6">
                      {(
                        [
                          ['Bookings today', '24', '#E8A020'],
                          ['Utilization', '78%', '#34C97B'],
                          ['Active rooms', '12', '#8BAAF0'],
                          ['Pending', '3', '#E8A020'],
                        ] as [string, string, string][]
                      ).map(([label, val, color]) => (
                        <div
                          key={label}
                          style={{
                            borderRadius: 8,
                            border: '1px solid rgba(140,170,240,0.1)',
                            background: 'rgba(7,9,26,0.5)',
                            padding: '10px 12px',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 8,
                              letterSpacing: '0.1em',
                              color: 'rgba(216,223,238,0.3)',
                              marginBottom: 6,
                            }}
                          >
                            {label.toUpperCase()}
                          </div>
                          <div
                            style={{
                              fontFamily: "'Syne', sans-serif",
                              fontSize: 20,
                              fontWeight: 800,
                              color,
                              lineHeight: 1,
                            }}
                          >
                            {val}
                          </div>
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

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section id="how-it-works" className="relative py-32 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="reveal mb-20">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 32, height: 1, background: '#E8A020', opacity: 0.6 }} />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: '#E8A020',
                  fontWeight: 600,
                }}
              >
                HOW IT WORKS
              </span>
            </div>
            <h2
              style={{
                fontFamily: "'Syne', var(--font-jakarta), sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(32px,4vw,52px)',
                letterSpacing: '-0.03em',
                color: '#EEF1F9',
                lineHeight: 1.1,
              }}
            >
              Live in minutes,
              <br />
              not months.
            </h2>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-px"
            style={{
              background: 'rgba(140,170,240,0.08)',
              border: '1px solid rgba(140,170,240,0.08)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="reveal"
                style={{
                  background: 'rgba(9,12,26,0.9)',
                  padding: '36px 32px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: 64,
                    color: 'rgba(232,160,32,0.12)',
                    lineHeight: 1,
                    position: 'absolute',
                    top: 24,
                    right: 24,
                    letterSpacing: '-0.05em',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'rgba(232,160,32,0.1)',
                    border: '1px solid rgba(232,160,32,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#E8A020',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {s.n}
                  </span>
                </div>
                <h3
                  style={{
                    fontFamily: "'Syne', var(--font-jakarta), sans-serif",
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#EEF1F9',
                    marginBottom: 10,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {s.title}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.75, color: 'rgba(216,223,238,0.4)' }}>
                  {s.body}
                </p>
                {i < steps.length - 1 && (
                  <div
                    className="hidden md:block absolute -right-px top-1/2 z-10"
                    style={{
                      width: 1,
                      height: 40,
                      transform: 'translateY(-50%)',
                      background:
                        'linear-gradient(to bottom, transparent, rgba(232,160,32,0.3), transparent)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ PRICING ════════════ */}
      <section id="pricing" className="relative py-32 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="reveal mb-16">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 32, height: 1, background: '#E8A020', opacity: 0.6 }} />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: '#E8A020',
                  fontWeight: 600,
                }}
              >
                PRICING
              </span>
            </div>
            <h2
              style={{
                fontFamily: "'Syne', var(--font-jakarta), sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(32px,4vw,52px)',
                letterSpacing: '-0.03em',
                color: '#EEF1F9',
                lineHeight: 1.1,
              }}
            >
              Simple, transparent pricing.
            </h2>
            <p style={{ marginTop: 12, fontSize: 14, color: 'rgba(216,223,238,0.4)' }}>
              Start free for 14 days. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Starter */}
            <div
              className="reveal"
              style={{
                borderRadius: 16,
                border: '1px solid rgba(140,170,240,0.1)',
                background: 'rgba(9,12,26,0.9)',
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                gap: 28,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '0.2em',
                    color: 'rgba(216,223,238,0.4)',
                    marginBottom: 16,
                  }}
                >
                  STARTER
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: 52,
                      fontWeight: 800,
                      color: '#EEF1F9',
                      letterSpacing: '-0.04em',
                      lineHeight: 1,
                    }}
                  >
                    $29
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: 'rgba(216,223,238,0.3)',
                    }}
                  >
                    /mo
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: 'rgba(216,223,238,0.25)',
                    marginTop: 6,
                    letterSpacing: '0.05em',
                  }}
                >
                  BILLED MONTHLY VIA PAYPAL
                </div>
              </div>
              <div style={{ height: 1, background: 'rgba(140,170,240,0.08)' }} />
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {starterFeatures.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 13,
                      color: 'rgba(216,223,238,0.6)',
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: 'rgba(140,170,255,0.1)',
                        border: '1px solid rgba(140,170,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(140,170,255,0.7)',
                        flexShrink: 0,
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
                style={{
                  marginTop: 'auto',
                  borderRadius: 8,
                  border: '1px solid rgba(140,170,240,0.2)',
                  background: 'transparent',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: 'rgba(216,223,238,0.6)',
                  padding: '13px 0',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  display: 'block',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(140,170,240,0.4)'
                  ;(e.currentTarget as HTMLElement).style.color = '#EEF1F9'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(140,170,240,0.2)'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(216,223,238,0.6)'
                }}
              >
                START FREE TRIAL
              </Link>
            </div>

            {/* Growth */}
            <div
              className="reveal"
              style={{
                borderRadius: 16,
                border: '1px solid rgba(232,160,32,0.35)',
                background: 'rgba(9,12,26,0.9)',
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                gap: 28,
                position: 'relative',
                boxShadow: '0 0 48px rgba(232,160,32,0.07)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'linear-gradient(90deg, transparent, #E8A020, transparent)',
                  borderRadius: '16px 16px 0 0',
                }}
              />
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      letterSpacing: '0.2em',
                      color: '#E8A020',
                    }}
                  >
                    GROWTH
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: '#07091A',
                      background: '#E8A020',
                      borderRadius: 4,
                      padding: '3px 8px',
                    }}
                  >
                    POPULAR
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: 52,
                      fontWeight: 800,
                      color: '#EEF1F9',
                      letterSpacing: '-0.04em',
                      lineHeight: 1,
                    }}
                  >
                    $79
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: 'rgba(216,223,238,0.3)',
                    }}
                  >
                    /mo
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: 'rgba(216,223,238,0.25)',
                    marginTop: 6,
                    letterSpacing: '0.05em',
                  }}
                >
                  BILLED MONTHLY VIA PAYPAL
                </div>
              </div>
              <div style={{ height: 1, background: 'rgba(232,160,32,0.15)' }} />
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {growthFeatures.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 13,
                      color: 'rgba(216,223,238,0.75)',
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: 'rgba(232,160,32,0.15)',
                        border: '1px solid rgba(232,160,32,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E8A020',
                        flexShrink: 0,
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
                className="group flex items-center justify-center gap-2.5"
                style={{
                  marginTop: 'auto',
                  borderRadius: 8,
                  background: '#E8A020',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#07091A',
                  padding: '13px 0',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  display: 'flex',
                  boxShadow: '0 0 24px rgba(232,160,32,0.25)',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = '#F0B030'
                  ;(e.currentTarget as HTMLElement).style.boxShadow =
                    '0 0 36px rgba(232,160,32,0.4)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = '#E8A020'
                  ;(e.currentTarget as HTMLElement).style.boxShadow =
                    '0 0 24px rgba(232,160,32,0.25)'
                }}
              >
                START FREE TRIAL
                <IconArrow />
              </Link>
            </div>
          </div>

          <p
            className="reveal mt-8 text-center"
            style={{ fontSize: 12, color: 'rgba(216,223,238,0.25)' }}
          >
            Need a custom plan for a large enterprise?{' '}
            <a
              href="mailto:hello@nanospaces.app"
              style={{
                color: 'rgba(232,160,32,0.6)',
                textDecoration: 'underline',
                textDecorationColor: 'rgba(232,160,32,0.3)',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E8A020')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(232,160,32,0.6)')}
            >
              Contact us
            </a>
          </p>
        </div>
      </section>

      {/* ════════════ FINAL CTA ════════════ */}
      <section className="relative py-32 px-5">
        <div className="max-w-4xl mx-auto">
          <div
            className="reveal"
            style={{
              borderRadius: 20,
              border: '1px solid rgba(140,170,240,0.1)',
              background: 'rgba(9,12,26,0.9)',
              padding: '72px 48px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* grid decoration */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `linear-gradient(rgba(86,112,200,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(86,112,200,0.05) 1px, transparent 1px)`,
                backgroundSize: '32px 32px',
                pointerEvents: 'none',
              }}
            />
            {/* corner brackets */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                width: 20,
                height: 20,
                borderTop: '1.5px solid rgba(232,160,32,0.4)',
                borderLeft: '1.5px solid rgba(232,160,32,0.4)',
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                width: 20,
                height: 20,
                borderTop: '1.5px solid rgba(232,160,32,0.4)',
                borderRight: '1.5px solid rgba(232,160,32,0.4)',
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                bottom: 20,
                left: 20,
                width: 20,
                height: 20,
                borderBottom: '1.5px solid rgba(232,160,32,0.4)',
                borderLeft: '1.5px solid rgba(232,160,32,0.4)',
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                width: 20,
                height: 20,
                borderBottom: '1.5px solid rgba(232,160,32,0.4)',
                borderRight: '1.5px solid rgba(232,160,32,0.4)',
              }}
            />

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: '#E8A020',
                  marginBottom: 20,
                }}
              >
                {'// GET STARTED TODAY'}
              </div>
              <h2
                style={{
                  fontFamily: "'Syne', var(--font-jakarta), sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(28px,4vw,52px)',
                  letterSpacing: '-0.03em',
                  color: '#EEF1F9',
                  lineHeight: 1.1,
                  marginBottom: 20,
                }}
              >
                Ready to reclaim your
                <br />
                <span style={{ color: '#E8A020' }}>shared spaces?</span>
              </h2>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.75,
                  color: 'rgba(216,223,238,0.4)',
                  maxWidth: 400,
                  margin: '0 auto 36px',
                }}
              >
                Join organizations that have eliminated double bookings, ghost reservations, and
                endless email chains.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2.5"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#07091A',
                  background: '#E8A020',
                  borderRadius: 8,
                  padding: '14px 32px',
                  boxShadow: '0 0 40px rgba(232,160,32,0.3)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = '#F0B030'
                  ;(e.currentTarget as HTMLElement).style.boxShadow =
                    '0 0 56px rgba(232,160,32,0.45)'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = '#E8A020'
                  ;(e.currentTarget as HTMLElement).style.boxShadow =
                    '0 0 40px rgba(232,160,32,0.3)'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                }}
              >
                START YOUR FREE 14-DAY TRIAL
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'rgba(7,9,26,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconArrow />
                </span>
              </Link>
              <p
                style={{
                  marginTop: 20,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  letterSpacing: '0.15em',
                  color: 'rgba(216,223,238,0.2)',
                }}
              >
                NO CREDIT CARD · NO SETUP FEES · CANCEL ANYTIME
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer style={{ borderTop: '1px solid rgba(140,170,240,0.08)', padding: '32px 20px' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 24,
                height: 24,
                background: '#E8A020',
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" fill="rgba(7,9,26,0.9)" />
                <rect x="9" y="2" width="5" height="5" fill="rgba(7,9,26,0.9)" />
                <rect x="2" y="9" width="5" height="5" fill="rgba(7,9,26,0.9)" />
                <rect x="9" y="9" width="2" height="2" fill="rgba(7,9,26,0.9)" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: "'Syne', var(--font-jakarta), sans-serif",
                fontWeight: 700,
                fontSize: 13,
                color: 'rgba(216,223,238,0.5)',
              }}
            >
              Nano Spaces
            </span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {(
              [
                ['Terms', '/terms'],
                ['Privacy', '/privacy'],
                ['Contact', 'mailto:hello@nanospaces.app'],
              ] as [string, string][]
            ).map(([label, href]) => (
              <a
                key={label}
                href={href}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  color: 'rgba(216,223,238,0.25)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(216,223,238,0.55)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(216,223,238,0.25)')}
              >
                {label.toUpperCase()}
              </a>
            ))}
          </div>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.08em',
              color: 'rgba(216,223,238,0.2)',
            }}
          >
            © 2026 NANO SPACES
          </p>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        @keyframes ns-slide {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }

        @keyframes ns-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
