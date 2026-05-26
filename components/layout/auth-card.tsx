'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import gsap from 'gsap'

const FEATURES = [
  'Instant room & desk reservations',
  'Real-time availability across your org',
  'Automated approvals & waitlists',
  'Usage analytics & utilization reports',
]

interface AuthCardProps {
  children: React.ReactNode
  className?: string
  dark?: boolean
}

export function AuthCard({ children, className, dark = false }: AuthCardProps) {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (leftRef.current) {
      gsap.fromTo(
        leftRef.current.querySelectorAll('.anim-in'),
        { opacity: 0, y: 24, filter: 'blur(8px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
          delay: 0.15,
        },
      )
    }
    if (rightRef.current) {
      gsap.fromTo(
        rightRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.35 },
      )
    }
  }, [])

  return (
    <div
      className="flex min-h-[100dvh] bg-[#07070c]"
      style={{ fontFamily: 'var(--font-jakarta), system-ui, sans-serif' }}
    >
      {/* CSS keyframes for ambient orbs — GPU-safe: transform + opacity only */}
      <style>{`
        @keyframes orb-drift-a {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(4%,5%) scale(1.06); }
          66%      { transform: translate(-3%,3%) scale(0.96); }
        }
        @keyframes orb-drift-b {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-6%,-5%) scale(1.1); }
        }
        @keyframes orb-drift-c {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(5%,-3%) scale(0.93); }
        }
        .orb-a { animation: orb-drift-a 14s ease-in-out infinite; }
        .orb-b { animation: orb-drift-b 18s ease-in-out infinite; }
        .orb-c { animation: orb-drift-c 11s ease-in-out infinite; }
      `}</style>

      {/* ── Left brand panel ─────────────────────────────────────────── */}
      <div
        ref={leftRef}
        className="relative hidden overflow-hidden lg:flex lg:w-[54%] flex-col justify-between p-14"
      >
        {/* Ambient gradient orbs */}
        <div
          className="orb-a pointer-events-none absolute -top-[15%] -left-[10%] h-[65%] w-[65%] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(250,93,12,0.55) 0%, transparent 70%)',
          }}
        />
        <div
          className="orb-b pointer-events-none absolute -bottom-[10%] -right-[20%] h-[70%] w-[70%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(217,78,8,0.45) 0%, transparent 70%)',
            opacity: 0.18,
          }}
        />
        <div
          className="orb-c pointer-events-none absolute top-[55%] left-[35%] h-[45%] w-[45%] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(254,232,220,0.5) 0%, transparent 70%)',
          }}
        />

        {/* Fixed SVG grain — performance rule: fixed + pointer-events-none, not on scrolling container */}
        <div
          className="pointer-events-none fixed inset-0 select-none"
          style={{
            opacity: 0.035,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Logo */}
        <div className="anim-in relative z-10 flex items-center gap-3">
          <Image
            src="/assets/icons/icon-transparent.png"
            alt="Nano Spaces"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
          />
          <span
            className="text-base font-bold tracking-wide uppercase text-white/80"
            style={{
              fontFamily: 'var(--font-rajdhani), Rajdhani, sans-serif',
              letterSpacing: '0.06em',
            }}
          >
            Nano Spaces
          </span>
        </div>

        {/* Headline + features */}
        <div className="relative z-10 space-y-10">
          <div className="anim-in">
            <span className="inline-flex rounded-full border border-[#FA5D0C]/30 bg-[#FA5D0C]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FA5D0C]">
              Space management platform
            </span>
          </div>

          <div className="anim-in">
            <h2
              className="font-bold leading-[1.12] tracking-tight text-white"
              style={{ fontSize: 'clamp(1.9rem, 2.4vw, 2.5rem)', maxWidth: '22rem' }}
            >
              Space management built for teams that move fast.
            </h2>
            <p
              className="mt-4 text-[0.875rem] leading-relaxed text-white/55"
              style={{ maxWidth: '20rem' }}
            >
              One platform to find, book, and manage every shared space in your organization.
            </p>
          </div>

          <ul className="anim-in space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FA5D0C]/15 ring-1 ring-[#FA5D0C]/25">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path
                      d="M2 5.5L4.2 7.5L8 3"
                      stroke="#FA5D0C"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-sm text-white/50">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="anim-in relative z-10 text-xs text-white/45">
          &copy; {new Date().getFullYear()} Nano Spaces. All rights reserved.
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-1 flex-col items-center justify-center px-6 py-16 lg:border-l',
          dark ? 'bg-[#07070c] lg:border-white/[0.06]' : 'bg-white lg:border-gray-100',
        )}
      >
        {/* Mobile logo */}
        <div className="mb-10 flex items-center gap-2.5 lg:hidden">
          {dark ? (
            <>
              <Image
                src="/assets/icons/icon-transparent.png"
                alt="Nano Spaces"
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
              />
              <span
                className="text-sm font-bold tracking-wide uppercase text-white/80"
                style={{
                  fontFamily: 'var(--font-rajdhani), Rajdhani, sans-serif',
                  letterSpacing: '0.06em',
                }}
              >
                Nano Spaces
              </span>
            </>
          ) : (
            <>
              <Image
                src="/assets/icons/icon-transparent.png"
                alt="Nano Spaces"
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
              />
              <span
                className="text-sm font-bold tracking-wide uppercase text-[var(--ns-dark)]"
                style={{
                  fontFamily: 'var(--font-rajdhani), Rajdhani, sans-serif',
                  letterSpacing: '0.06em',
                }}
              >
                Nano Spaces
              </span>
            </>
          )}
        </div>

        <div ref={rightRef} className={cn('w-full max-w-[400px]', className)}>
          {children}
        </div>
      </div>
    </div>
  )
}
