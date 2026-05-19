'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthCard } from '@/components/layout/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBrowserClient } from '@/lib/supabase/browser'

const formSchema = z
  .object({
    fullName: z.string().min(1, 'Name is required').max(100),
    password: z.string().min(12, 'Password must be at least 12 characters').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof formSchema>

interface InviteDetails {
  email: string
  role: string
  orgName: string
}

type PageState = 'loading' | 'invalid' | 'ready' | 'submitting' | 'done'

export default function JoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [state, setState] = useState<PageState>('loading')
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(formSchema) })

  useEffect(() => {
    if (!token) {
      setState('invalid')
      return
    }

    fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setInvite(json.data as InviteDetails)
          setState('ready')
        } else {
          setState('invalid')
        }
      })
      .catch(() => setState('invalid'))
  }, [token])

  const onSubmit = async (data: FormData) => {
    setState('submitting')
    setServerError(null)

    const res = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        fullName: data.fullName,
        password: data.password,
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setServerError(
        (json as { error?: { message?: string } }).error?.message ?? 'Something went wrong.',
      )
      setState('ready')
      return
    }

    const { email } = (json as { data: { email: string } }).data

    const supabase = createBrowserClient()
    await supabase.auth.signInWithPassword({ email, password: data.password })

    setState('done')
    router.push('/onboarding')
  }

  if (state === 'loading') {
    return (
      <AuthCard className="max-w-[420px]">
        <p className="text-sm text-gray-500">Validating your invitation…</p>
      </AuthCard>
    )
  }

  if (state === 'invalid') {
    return (
      <AuthCard className="max-w-[420px]">
        <h1 className="font-heading mb-2 text-xl font-bold text-[var(--text-primary)]">
          Invalid Invitation
        </h1>
        <p className="text-sm text-gray-500">
          This invitation link is invalid, expired, or has already been used.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard className="max-w-[420px]">
      <h1 className="font-heading mb-1 text-2xl font-bold text-[var(--text-primary)]">
        Join {invite?.orgName}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        You&apos;ve been invited as a{' '}
        <strong>{invite?.role === 'org_admin' ? 'Administrator' : 'Member'}</strong>. Complete your
        account setup to continue.
      </p>
      <p className="mb-5 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
        <span className="font-medium">Email:</span> {invite?.email}
      </p>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" {...register('fullName')} className="mt-1" />
          {errors.fullName && (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register('password')} className="mt-1" />
          {errors.password && (
            <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.password.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">Minimum 12 characters.</p>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            className="mt-1"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-[var(--color-danger)]">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {serverError && <p className="text-sm text-[var(--color-danger)]">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Setting up account…' : 'Create Account'}
        </Button>
      </form>
    </AuthCard>
  )
}
