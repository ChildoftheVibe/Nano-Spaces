'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { totpEnrollVerifySchema, type TotpEnrollVerifyFormData } from '@/lib/validation/auth'
import { AuthCard } from '@/components/layout/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QRCodeSVG } from 'qrcode.react'

export default function SetupTotpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawNext = searchParams.get('next') ?? '/settings?totp=enrolled'
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/settings?totp=enrolled'
  const [totpUri, setTotpUri] = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TotpEnrollVerifyFormData>({
    resolver: zodResolver(totpEnrollVerifySchema),
  })

  useEffect(() => {
    fetch('/api/auth/totp/enroll')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setTotpUri(json.data.uri as string)
          setTotpSecret(json.data.secret as string)
        } else {
          setLoadError(json.error?.message ?? 'Failed to start enrollment.')
        }
      })
      .catch(() => setLoadError('Failed to load enrollment data.'))
  }, [])

  const onSubmit = async (data: TotpEnrollVerifyFormData) => {
    setServerError(null)

    const res = await fetch('/api/auth/totp/verify-enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: data.code }),
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
        Set up authenticator app
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Scan the QR code with Google Authenticator, Authy, or 1Password, then enter the code below
        to confirm.
      </p>

      {loadError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      )}

      {totpUri && (
        <div className="mb-6 flex flex-col items-center gap-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <QRCodeSVG value={totpUri} size={200} />
          </div>
          <details className="w-full">
            <summary className="cursor-pointer text-xs text-gray-500 hover:underline">
              Can&apos;t scan? Enter the code manually
            </summary>
            <p className="mt-2 break-all rounded bg-gray-100 px-3 py-2 font-mono text-xs">
              {totpSecret}
            </p>
          </details>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Confirmation code</Label>
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
            disabled={!totpUri}
          />
          {errors.code && (
            <p className="text-xs text-[var(--color-danger)]">{errors.code.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-[var(--color-danger)]">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting || !totpUri}>
          {isSubmitting ? 'Verifying…' : 'Confirm & enable 2FA'}
        </Button>
      </form>
    </AuthCard>
  )
}
