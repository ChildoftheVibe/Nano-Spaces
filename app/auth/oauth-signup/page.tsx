'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthCard } from '@/components/layout/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBrowserClient } from '@/lib/supabase/browser'

const formSchema = z.object({
  fullName: z.string().min(1, 'Name is required').max(100),
  orgName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
})

type FormData = z.infer<typeof formSchema>

export default function OAuthSignupPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [oauthName, setOauthName] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(formSchema) })

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login')
        return
      }
      const name: string =
        (user.user_metadata?.['full_name'] as string | undefined) ??
        (user.user_metadata?.['name'] as string | undefined) ??
        ''
      setOauthName(name)
      if (name) setValue('fullName', name)
    })
  }, [router, setValue])

  const onSubmit = async (data: FormData) => {
    setServerError(null)

    const res = await fetch('/api/auth/oauth-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const json = await res.json()

    if (!res.ok) {
      setServerError(json?.error?.message ?? 'Setup failed. Please try again.')
      return
    }

    router.push('/onboarding')
  }

  return (
    <AuthCard>
      <h1 className="font-heading mb-1 text-2xl font-bold text-[var(--text-primary)]">
        Set up your workspace
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Almost there! Tell us a bit about your organization.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Your name</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            defaultValue={oauthName}
            {...register('fullName')}
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <p className="text-xs text-[var(--color-danger)]">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="orgName">Organization name</Label>
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

        {serverError && <p className="text-sm text-[var(--color-danger)]">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Setting up…' : 'Continue'}
        </Button>
      </form>
    </AuthCard>
  )
}
