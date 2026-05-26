'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { AuthCard } from '@/components/layout/auth-card'
import { OAuthButtons } from '@/components/features/auth/oauth-buttons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBrowserClient } from '@/lib/supabase/browser'

const formSchema = z.object({
  fullName: z.string().min(1, 'Name is required').max(100),
  orgName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128),
})

type FormData = z.infer<typeof formSchema>

export default function SignupPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(formSchema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const json = await res.json()

    if (!res.ok) {
      setServerError(json?.error?.message ?? 'Signup failed. Please try again.')
      return
    }

    const supabase = createBrowserClient()
    await supabase.auth.signInWithPassword({
      email: json.data.email as string,
      password: getValues('password'),
    })

    router.push('/onboarding')
  }

  return (
    <AuthCard>
      <h1 className="font-heading mb-1 text-2xl font-bold text-[var(--text-primary)]">
        Create your workspace
      </h1>
      <p className="mb-4 text-sm text-gray-500">
        Start your 14-day free trial. No credit card required.
      </p>

      {/* Admin role callout */}
      <div className="mb-5 rounded-xl border border-[#FA5D0C]/20 bg-[#FA5D0C]/[0.06] px-4 py-3">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#FA5D0C]">
          Organization Administrator Account
        </p>
        <ul className="space-y-0.5 text-xs text-gray-600 dark:text-white/60">
          <li className="flex items-center gap-1.5">
            <span className="text-[var(--color-success)]">&#10003;</span> Manage and book all spaces
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-[var(--color-success)]">&#10003;</span> Invite team members
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-[var(--color-success)]">&#10003;</span> Control billing and
            subscription
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-[var(--color-success)]">&#10003;</span> View usage analytics for
            your entire org
          </li>
        </ul>
      </div>

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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Your name</Label>
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              {...register('fullName')}
              aria-invalid={!!errors.fullName}
            />
            {errors.fullName && (
              <p className="text-xs text-[var(--color-danger)]">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organization</Label>
            <Input
              id="orgName"
              type="text"
              autoComplete="organization"
              placeholder="Acme Corp"
              {...register('orgName')}
              aria-invalid={!!errors.orgName}
            />
            {errors.orgName && (
              <p className="text-xs text-[var(--color-danger)]">{errors.orgName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-[var(--color-danger)]">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 12 characters"
            {...register('password')}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="text-xs text-[var(--color-danger)]">{errors.password.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-[var(--color-danger)]">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[var(--brand-primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
