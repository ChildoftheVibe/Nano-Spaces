'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validation/auth'
import { createBrowserClient } from '@/lib/supabase/browser'
import { AuthCard } from '@/components/layout/auth-card'
import { TurnstileWidget } from '@/components/features/auth/turnstile-widget'
import Link from 'next/link'
import gsap from 'gsap'

// ─── Reusable Double-Bezel input (high-end-visual-design §4A) ────────────────
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
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={id} className="text-xs font-medium text-white/50">
          {label}
        </label>
        {right}
      </div>
      {/* Outer shell */}
      <div
        className="rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08] p-[5px] transition-all duration-700"
        style={{ transition: 'box-shadow 0.7s cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* Inner core */}
        <input
          id={id}
          {...inputProps}
          className="w-full rounded-[calc(1rem-5px)] bg-white/[0.06] px-4 py-3 text-sm text-white
            placeholder:text-white/20 outline-none
            focus:bg-white/[0.10] focus:ring-1 focus:ring-[#4F7EFA]/40
            shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]
            transition-all duration-700"
          style={{ transition: 'all 0.7s cubic-bezier(0.32,0.72,0,1)' }}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
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

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/calendar'
  const emailChanged = searchParams.get('emailChanged') === '1'
  const passwordReset = searchParams.get('passwordReset') === '1'
  const oauthFailed = searchParams.get('error') === 'oauth_failed'

  const [hasVisited, setHasVisited] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const visited = localStorage.getItem('ns_has_visited') === '1'
    setHasVisited(visited)
    localStorage.setItem('ns_has_visited', '1')
  }, [])

  // Staggered form mount animation
  useEffect(() => {
    if (!formRef.current) return
    gsap.fromTo(
      formRef.current.querySelectorAll('.form-el'),
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', delay: 0.5 },
    )
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
    <AuthCard dark>
      <div ref={formRef}>
        {/* Eyebrow tag + heading */}
        <div className="form-el mb-7">
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
            {hasVisited ? 'Welcome back' : 'Get started'}
          </span>
          <h1 className="mt-3 text-[1.75rem] font-bold tracking-tight text-white leading-[1.15]">
            {hasVisited ? 'Sign back in.' : 'Sign in to Nano Spaces.'}
          </h1>
          <p className="mt-1.5 text-sm text-white/55">
            Access your team&apos;s spaces and reservations.
          </p>
        </div>

        {/* Status banners */}
        {emailChanged && (
          <div className="form-el mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400">
            Email address updated successfully.
          </div>
        )}
        {passwordReset && (
          <div className="form-el mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400">
            Password reset successfully. Sign in with your new password.
          </div>
        )}
        {oauthFailed && (
          <div className="form-el mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            Social sign-in failed. Try again or use email and password.
          </div>
        )}
        {lockedUntil && (
          <div className="form-el mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            Account locked until{' '}
            <strong className="font-semibold">{new Date(lockedUntil).toLocaleTimeString()}</strong>.
            Try again later.
          </div>
        )}

        {/* Google OAuth — Double-Bezel button */}
        <div className="form-el mb-5">
          <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08] p-[5px]">
            <button
              type="button"
              onClick={() => void handleGoogleOAuth()}
              disabled={oauthLoading}
              className="group flex w-full items-center justify-center gap-2.5 rounded-[calc(1rem-5px)] bg-white/[0.06] px-4 py-3 text-sm font-medium text-white/70
                hover:bg-white/[0.10] hover:text-white disabled:opacity-50
                shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]
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
          <div className="h-px flex-1 bg-white/[0.08]" />
          <span className="text-[11px] font-medium text-white/50 uppercase tracking-widest">
            or
          </span>
          <div className="h-px flex-1 bg-white/[0.08]" />
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
                  className="text-[11px] text-[#4F7EFA] hover:text-[#6B95FB] transition-colors duration-300"
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
            <p className="form-el rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
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

          {/* Pill submit button — Button-in-Button architecture (§4B) */}
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20
                  group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105"
                style={{ transition: 'transform 0.7s cubic-bezier(0.32,0.72,0,1)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
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

        {/* Sign up + legal */}
        <p className="form-el mt-6 text-center text-sm text-white/55">
          No account?{' '}
          <Link
            href="/signup"
            className="font-medium text-[#4F7EFA] hover:text-[#6B95FB]"
            style={{ transition: 'color 0.3s cubic-bezier(0.32,0.72,0,1)' }}
          >
            Create one free
          </Link>
        </p>

        <p className="form-el mt-3.5 text-center text-[11px] text-white/50">
          <Link href="/terms" className="hover:text-white/70 transition-colors duration-300">
            Terms of Service
          </Link>
          <span className="mx-1.5 opacity-50">·</span>
          <Link href="/privacy" className="hover:text-white/70 transition-colors duration-300">
            Privacy Policy
          </Link>
        </p>
      </div>
    </AuthCard>
  )
}
