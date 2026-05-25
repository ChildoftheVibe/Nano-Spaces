'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validation/auth'
import { createBrowserClient } from '@/lib/supabase/browser'
import { TurnstileWidget } from '@/components/features/auth/turnstile-widget'
import Link from 'next/link'
import gsap from 'gsap'

// ─── Double-Bezel input — Soft Structuralism (light mode) ────────────────────
function InputField({
  id,
  label,
  error,
  right,
  inputProps,
}: {
  id: string
  label: string
  error?: string | undefined
  right?: React.ReactNode | undefined
  inputProps: React.InputHTMLAttributes<HTMLInputElement>
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-xs font-semibold text-[#6B7280] tracking-wide">
          {label}
        </label>
        {right}
      </div>
      {/* Outer shell */}
      <div
        className="rounded-2xl bg-black/[0.025] ring-1 ring-black/[0.07] p-[5px]"
        style={{ transition: 'box-shadow 0.7s cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* Inner core */}
        <input
          id={id}
          {...inputProps}
          className="w-full rounded-[calc(1rem-5px)] bg-white px-4 py-3 text-sm text-[#0A0A0F]
            placeholder:text-[#C1C7D0] outline-none
            focus:ring-1 focus:ring-[#4F7EFA]/25
            shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]
            transition-all duration-700"
          style={{ transition: 'all 0.7s cubic-bezier(0.32,0.72,0,1)' }}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Google G icon ────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}

// ─── Logo mark ────────────────────────────────────────────────────────────────
function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-[10px] bg-[#4F7EFA]/10 ring-1 ring-[#4F7EFA]/20 p-[4px]"
      style={{ transition: 'all 0.7s cubic-bezier(0.32,0.72,0,1)' }}
    >
      <div
        className="flex items-center justify-center rounded-[7px] bg-[#4F7EFA] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="7" height="7" rx="1.5" fill="white" />
          <rect x="11" y="2" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.55" />
          <rect x="2" y="11" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.55" />
          <rect x="11" y="11" width="7" height="7" rx="1.5" fill="white" />
        </svg>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/calendar'
  const emailChanged = searchParams.get('emailChanged') === '1'
  const passwordReset = searchParams.get('passwordReset') === '1'
  const oauthFailed = searchParams.get('error') === 'oauth_failed'

  const [hasVisited, setHasVisited] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const logoRef = useRef<HTMLDivElement>(null)
  const ghostsRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const visited = localStorage.getItem('ns_has_visited') === '1'
    setHasVisited(visited)
    localStorage.setItem('ns_has_visited', '1')
  }, [])

  // Z-Axis Cascade entrance: ghosts surface first, then card, then form elements
  useEffect(() => {
    const tl = gsap.timeline()
    if (ghostsRef.current) {
      tl.fromTo(
        ghostsRef.current.children,
        { opacity: 0, y: 12, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out' },
        0,
      )
    }
    if (cardRef.current) {
      tl.fromTo(
        cardRef.current,
        { opacity: 0, y: 20, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: 'power3.out' },
        0.1,
      )
    }
    if (logoRef.current) {
      tl.fromTo(
        logoRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
        0.05,
      )
    }
    if (formRef.current) {
      tl.fromTo(
        formRef.current.querySelectorAll('.form-el'),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.065, ease: 'power3.out' },
        0.3,
      )
    }
  }, [])

  const [serverError, setServerError] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)
  const [failCount, setFailCount] = useState(0)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null)
    const payload: LoginFormData = { ...data }
    if (turnstileToken) payload.turnstileToken = turnstileToken

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()

    if (!res.ok) {
      const msg = json?.error?.message ?? 'Login failed. Please try again.'
      if (json?.error?.details?.lockedUntil)
        setLockedUntil(json.error.details.lockedUntil as string)
      setFailCount((c) => c + 1)
      setServerError(msg)
      return
    }

    const supabase = createBrowserClient()
    await supabase.auth.setSession({
      access_token: json.data.session.access_token,
      refresh_token: json.data.session.refresh_token,
    })

    if (json.data.requires2fa) {
      const params = new URLSearchParams({
        userId: json.data.user.id,
        method: json.data.twoFaMethod ?? 'totp',
        next,
      })
      router.push(`/verify-2fa?${params.toString()}`)
      return
    }
    if (json.data.requiresTos) {
      router.push('/accept-tos')
      return
    }
    router.push(next)
  }

  const handleGoogleOAuth = async () => {
    setOauthLoading(true)
    const supabase = createBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const showTurnstile = failCount >= 3

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 py-16"
      style={{
        background: '#F4F5F7',
        fontFamily: 'var(--font-jakarta), system-ui, sans-serif',
      }}
    >
      {/* Fixed grain overlay — performance rule: fixed + pointer-events-none */}
      <div
        className="pointer-events-none fixed inset-0 select-none"
        style={{
          opacity: 0.022,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient light tints — GPU-safe: opacity only */}
      <div className="pointer-events-none fixed inset-0 select-none overflow-hidden">
        <div
          className="absolute -top-[20%] -left-[15%] h-[55%] w-[55%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(79,126,250,0.12) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute -bottom-[15%] -right-[10%] h-[50%] w-[50%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute top-[40%] left-[50%] h-[35%] w-[35%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 65%)',
          }}
        />
      </div>

      {/* Logo — floats above the card stack */}
      <div ref={logoRef} className="relative z-20 mb-5 flex items-center gap-2.5">
        <LogoMark size={34} />
        <span className="text-sm font-semibold tracking-tight text-[#1A1D23]">Nano Spaces</span>
      </div>

      {/* Z-Axis Cascade: ghost cards behind the main card */}
      <div ref={ghostsRef} className="pointer-events-none absolute w-full max-w-[440px] px-4">
        {/* Far back card — widest rotation */}
        <div
          className="absolute inset-x-4 rounded-[2rem] bg-white/40 ring-1 ring-black/[0.04]"
          style={{
            height: 560,
            transform: 'rotate(-2.8deg) translateY(10px) scale(0.97)',
            transformOrigin: 'bottom center',
          }}
        />
        {/* Mid card */}
        <div
          className="absolute inset-x-4 rounded-[2rem] bg-white/65 ring-1 ring-black/[0.05]"
          style={{
            height: 560,
            transform: 'rotate(1.6deg) translateY(5px) scale(0.985)',
            transformOrigin: 'bottom center',
          }}
        />
      </div>

      {/* Main card — Double-Bezel outer shell + inner core */}
      <div ref={cardRef} className="relative z-10 w-full max-w-[440px]">
        {/* Outer shell */}
        <div
          className="rounded-[2rem] bg-black/[0.015] ring-1 ring-black/[0.065] p-[6px]"
          style={{
            boxShadow:
              '0 32px 100px rgba(0,0,0,0.07), 0 8px 24px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.03)',
          }}
        >
          {/* Inner core */}
          <div
            className="rounded-[calc(2rem-6px)] bg-white px-8 py-9"
            style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9)' }}
          >
            <div ref={formRef}>
              {/* Eyebrow tag + heading */}
              <div className="form-el mb-7">
                <span className="inline-flex rounded-full bg-[#4F7EFA]/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4F7EFA] ring-1 ring-[#4F7EFA]/[0.15]">
                  {hasVisited ? 'Welcome back' : 'Get started'}
                </span>
                <h1 className="mt-3 text-[1.85rem] font-bold tracking-tight text-[#0A0A0F] leading-[1.15]">
                  {hasVisited ? 'Sign back in.' : 'Sign in to Nano Spaces.'}
                </h1>
                <p className="mt-1.5 text-sm text-[#6B7280]">
                  Access your team&apos;s spaces and reservations.
                </p>
              </div>

              {/* Status banners */}
              {emailChanged && (
                <div className="form-el mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                  Email address updated successfully.
                </div>
              )}
              {passwordReset && (
                <div className="form-el mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                  Password reset successfully. Sign in with your new password.
                </div>
              )}
              {oauthFailed && (
                <div className="form-el mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                  Social sign-in failed. Try again or use email and password.
                </div>
              )}
              {lockedUntil && (
                <div className="form-el mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                  Account locked until{' '}
                  <strong className="font-semibold">
                    {new Date(lockedUntil).toLocaleTimeString()}
                  </strong>
                  . Try again later.
                </div>
              )}

              {/* Google OAuth — Double-Bezel button */}
              <div className="form-el mb-5">
                <div className="rounded-2xl bg-black/[0.025] ring-1 ring-black/[0.07] p-[5px]">
                  <button
                    type="button"
                    onClick={() => void handleGoogleOAuth()}
                    disabled={oauthLoading}
                    className="group flex w-full items-center justify-center gap-2.5 rounded-[calc(1rem-5px)] bg-white px-4 py-3 text-sm font-medium text-[#374151]
                      hover:bg-[#F9FAFB] disabled:opacity-50
                      shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.05)]
                      transition-all duration-700"
                    style={{ transition: 'all 0.7s cubic-bezier(0.32,0.72,0,1)' }}
                  >
                    <GoogleIcon />
                    {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="form-el relative my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-black/[0.07]" />
                <span className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-widest">
                  or
                </span>
                <div className="h-px flex-1 bg-black/[0.07]" />
              </div>

              {/* Email + password form */}
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div className="form-el">
                  <InputField
                    id="email"
                    label="Email"
                    error={errors.email?.message}
                    inputProps={{
                      type: 'email',
                      autoComplete: 'email',
                      placeholder: 'you@example.com',
                      'aria-invalid': !!errors.email,
                      ...register('email'),
                    }}
                  />
                </div>

                <div className="form-el">
                  <InputField
                    id="password"
                    label="Password"
                    error={errors.password?.message}
                    right={
                      <Link
                        href="/forgot-password"
                        className="text-[11px] font-medium text-[#4F7EFA] hover:text-[#3d6ef0] transition-colors duration-300"
                        style={{ transition: 'color 0.3s cubic-bezier(0.32,0.72,0,1)' }}
                      >
                        Forgot password?
                      </Link>
                    }
                    inputProps={{
                      type: 'password',
                      autoComplete: 'current-password',
                      placeholder: '••••••••',
                      'aria-invalid': !!errors.password,
                      ...register('password'),
                    }}
                  />
                </div>

                {serverError && !lockedUntil && (
                  <p className="form-el rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {serverError}
                  </p>
                )}

                {showTurnstile && (
                  <div className="form-el">
                    <TurnstileWidget
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
                      onVerify={handleTurnstileVerify}
                    />
                  </div>
                )}

                {/* Pill submit — Button-in-Button architecture */}
                <div className="form-el pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !!lockedUntil || (showTurnstile && !turnstileToken)}
                    className="group flex w-full items-center justify-between rounded-full bg-[#4F7EFA] px-5 py-3.5
                      hover:bg-[#3d6ef0] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ transition: 'all 0.7s cubic-bezier(0.32,0.72,0,1)' }}
                  >
                    <span className="ml-1 text-sm font-semibold text-white">
                      {isSubmitting ? 'Signing in…' : 'Sign in'}
                    </span>
                    {/* Nested icon circle */}
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10
                        group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105"
                      style={{ transition: 'transform 0.7s cubic-bezier(0.32,0.72,0,1)' }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 7h8M7.5 4l3 3-3 3"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                </div>
              </form>

              {/* Sign up */}
              <p className="form-el mt-6 text-center text-sm text-[#6B7280]">
                No account?{' '}
                <Link
                  href="/signup"
                  className="font-semibold text-[#4F7EFA] hover:text-[#3d6ef0]"
                  style={{ transition: 'color 0.3s cubic-bezier(0.32,0.72,0,1)' }}
                >
                  Create one free
                </Link>
              </p>

              {/* Legal */}
              <p className="form-el mt-3 text-center text-[11px] text-[#9CA3AF]">
                <Link href="/terms" className="hover:text-[#6B7280] transition-colors duration-300">
                  Terms of Service
                </Link>
                <span className="mx-1.5 opacity-50">·</span>
                <Link
                  href="/privacy"
                  className="hover:text-[#6B7280] transition-colors duration-300"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-[11px] text-[#9CA3AF]">
        &copy; {new Date().getFullYear()} Nano Spaces. All rights reserved.
      </p>
    </div>
  )
}
