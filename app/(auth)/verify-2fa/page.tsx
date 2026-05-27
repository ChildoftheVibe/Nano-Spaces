'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { twoFaCodeSchema, type TwoFaCodeFormData } from '@/lib/validation/auth'
import { AuthCard } from '@/components/layout/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Verify2faPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId') ?? ''
  const method = (searchParams.get('method') ?? 'totp') as 'totp' | 'email_otp'
  const rawNext = searchParams.get('next') ?? '/calendar'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/calendar'

  const [serverError, setServerError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [sending, setSending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setFocus,
  } = useForm<TwoFaCodeFormData>({
    resolver: zodResolver(twoFaCodeSchema),
  })

  // Auto-send OTP on mount for email_otp method
  useEffect(() => {
    if (method === 'email_otp' && userId && !otpSent) {
      void sendOtp()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, userId])

  useEffect(() => {
    setFocus('code')
  }, [setFocus])

  async function sendOtp() {
    setSending(true)
    try {
      await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'login', userId }),
      })
      setOtpSent(true)
    } finally {
      setSending(false)
    }
  }

  const onSubmit = async (data: TwoFaCodeFormData) => {
    setServerError(null)

    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code: data.code, method }),
    })

    const json = await res.json()

    if (!res.ok) {
      setServerError(json?.error?.message ?? 'Verification failed.')
      return
    }

    router.push(next)
  }

  return (
    <AuthCard>
      <h1 className="font-heading mb-2 text-2xl font-bold text-[var(--text-primary)]">
        Two-factor authentication
      </h1>

      {method === 'totp' ? (
        <p className="mb-6 text-sm text-gray-500">
          Enter the 6-digit code from your authenticator app.
        </p>
      ) : (
        <p className="mb-6 text-sm text-gray-500">
          {sending
            ? 'Sending code to your email…'
            : 'A 6-digit code was sent to your email address. It expires in 10 minutes.'}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="text-center text-2xl font-bold tracking-[0.5em]"
            {...register('code')}
            aria-invalid={!!errors.code}
          />
          {errors.code && (
            <p className="text-xs text-[var(--color-danger)]">{errors.code.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-[var(--color-danger)]">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting || sending}>
          {isSubmitting ? 'Verifying…' : 'Verify'}
        </Button>

        {method === 'email_otp' && otpSent && (
          <button
            type="button"
            onClick={() => void sendOtp()}
            disabled={sending}
            className="w-full text-sm text-[var(--brand-primary)] hover:underline disabled:opacity-50"
          >
            Resend code
          </button>
        )}
      </form>
    </AuthCard>
  )
}
