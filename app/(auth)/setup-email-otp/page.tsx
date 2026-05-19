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

export default function SetupEmailOtpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/settings?emailOtp=enrolled'
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TwoFaCodeFormData>({
    resolver: zodResolver(twoFaCodeSchema),
  })

  useEffect(() => {
    void sendCode()
  }, [])

  async function sendCode() {
    setSending(true)
    setServerError(null)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'enrollment' }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const json = await res.json()
        setServerError(json?.error?.message ?? 'Failed to send code.')
      }
    } catch {
      setServerError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const onSubmit = async (data: TwoFaCodeFormData) => {
    setServerError(null)

    // Verify the enrollment OTP
    const verifyRes = await fetch('/api/auth/2fa/verify-email-otp-enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: data.code }),
    })

    const json = await verifyRes.json()

    if (!verifyRes.ok) {
      setServerError(json?.error?.message ?? 'Verification failed.')
      return
    }

    router.push(next)
  }

  return (
    <AuthCard>
      <h1 className="font-heading mb-2 text-2xl font-bold text-[var(--text-primary)]">
        Set up email verification
      </h1>
      <p className="mb-4 text-sm text-gray-500">
        {sending
          ? 'Sending a verification code to your email…'
          : sent
            ? 'A 6-digit code was sent to your email address. Enter it below to enable email OTP.'
            : 'We will send a verification code to your email address.'}
      </p>

      <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        <strong>Security note:</strong> Email OTP is less secure than an authenticator app. If your
        email account is compromised, an attacker could bypass this factor. Use a TOTP authenticator
        app for stronger protection.
      </div>

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
            disabled={!sent}
          />
          {errors.code && (
            <p className="text-xs text-[var(--color-danger)]">{errors.code.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-[var(--color-danger)]">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting || !sent}>
          {isSubmitting ? 'Verifying…' : 'Confirm & enable email 2FA'}
        </Button>

        {sent && (
          <button
            type="button"
            onClick={() => void sendCode()}
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
