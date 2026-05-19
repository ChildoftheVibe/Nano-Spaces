'use client'

import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validation/auth'
import { AuthCard } from '@/components/layout/auth-card'
import { TurnstileWidget } from '@/components/features/auth/turnstile-widget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError(null)

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, turnstileToken }),
    })

    const json = await res.json()

    if (!res.ok && res.status === 429) {
      setServerError(json?.error?.message ?? 'Too many requests. Please try again later.')
      return
    }

    // Always show success to prevent email enumeration
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AuthCard>
        <h1 className="font-heading mb-2 text-2xl font-bold text-[var(--text-primary)]">
          Check your email
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          If an account exists for that email address, we&apos;ve sent a password reset link. Check
          your inbox — it expires in 60 minutes.
        </p>
        <Link href="/login" className="text-sm text-[var(--brand-primary)] hover:underline">
          Back to sign in
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <h1 className="font-heading mb-2 text-2xl font-bold text-[var(--text-primary)]">
        Reset your password
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Enter your email and we&apos;ll send you a reset link.
      </p>

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

        {serverError && <p className="text-sm text-[var(--color-danger)]">{serverError}</p>}

        <TurnstileWidget
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
          onVerify={handleTurnstileVerify}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting || !turnstileToken}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Remember your password?{' '}
        <Link href="/login" className="text-[var(--brand-primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
