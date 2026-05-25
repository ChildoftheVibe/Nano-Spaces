'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validation/auth'
import { createBrowserClient } from '@/lib/supabase/browser'
import { AuthCard } from '@/components/layout/auth-card'
import { TurnstileWidget } from '@/components/features/auth/turnstile-widget'
import { OAuthButtons } from '@/components/features/auth/oauth-buttons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/calendar'
  const emailChanged = searchParams.get('emailChanged') === '1'
  const passwordReset = searchParams.get('passwordReset') === '1'
  const oauthFailed = searchParams.get('error') === 'oauth_failed'

  const [hasVisited, setHasVisited] = useState(false)

  useEffect(() => {
    const visited = localStorage.getItem('ns_has_visited') === '1'
    setHasVisited(visited)
    localStorage.setItem('ns_has_visited', '1')
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
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

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
      if (json?.error?.details?.lockedUntil) {
        setLockedUntil(json.error.details.lockedUntil as string)
      }
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

  const showTurnstile = failCount >= 3

  return (
    <AuthCard>
      <h1 className="font-heading mb-1 text-2xl font-bold text-[var(--text-primary)]">
        {hasVisited ? 'Welcome back' : 'Sign in to Nano Spaces'}
      </h1>
      <p className="mb-6 text-sm text-gray-500">Sign in to your Nano Spaces account.</p>

      {emailChanged && (
        <div className="mb-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Your email address has been updated successfully.
        </div>
      )}
      {passwordReset && (
        <div className="mb-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Password reset successfully. Please sign in with your new password.
        </div>
      )}
      {oauthFailed && (
        <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Social sign-in failed. Please try again or use email and password.
        </div>
      )}
      {lockedUntil && (
        <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Account locked until <strong>{new Date(lockedUntil).toLocaleTimeString()}</strong>. Please
          try again later.
        </div>
      )}

      <OAuthButtons />

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-gray-400">or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-[var(--color-danger)]">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--brand-primary)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="text-xs text-[var(--color-danger)]">{errors.password.message}</p>
          )}
        </div>

        {serverError && !lockedUntil && (
          <p className="text-sm text-[var(--color-danger)]">{serverError}</p>
        )}

        {showTurnstile && (
          <TurnstileWidget
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
            onVerify={handleTurnstileVerify}
          />
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !!lockedUntil || (showTurnstile && !turnstileToken)}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-[var(--brand-primary)] hover:underline">
          Create one free
        </Link>
      </p>
    </AuthCard>
  )
}
