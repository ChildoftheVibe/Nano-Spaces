'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validation/auth'
import { AuthCard } from '@/components/layout/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError(null)

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: data.password, confirmPassword: data.confirmPassword }),
    })

    const json = await res.json()

    if (!res.ok) {
      setServerError(json?.error?.message ?? 'Failed to reset password. Please try again.')
      return
    }

    const { userId, twoFaMethod } = json.data as {
      userId: string
      twoFaMethod: string | null
    }

    if (userId && twoFaMethod) {
      const params = new URLSearchParams({
        userId,
        method: twoFaMethod,
        next: '/calendar',
      })
      router.push(`/verify-2fa?${params.toString()}`)
    } else {
      // Fallback: no 2FA configured yet, send to setup
      router.push('/setup-totp')
    }
  }

  return (
    <AuthCard>
      <h1 className="font-heading mb-2 text-2xl font-bold text-[var(--text-primary)]">
        Choose a new password
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Your password must be at least 12 characters and contain uppercase, lowercase, and a number.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••••••"
            {...register('password')}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="text-xs text-[var(--color-danger)]">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••••••"
            {...register('confirmPassword')}
            aria-invalid={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-[var(--color-danger)]">{errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-[var(--color-danger)]">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Set new password'}
        </Button>
      </form>
    </AuthCard>
  )
}
