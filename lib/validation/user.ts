import { z } from 'zod'

export const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100).optional(),
  timezone: z.string().min(1, 'Timezone is required').optional(),
  email_reminders: z.boolean().optional(),
  reminder_timing: z.enum(['24h', '1h', 'both']).nullable().optional(),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/\d/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth_key: z.string().min(1),
  user_agent: z.string().nullable().optional(),
})

export type UpdateProfileData = z.infer<typeof updateProfileSchema>
export type ChangePasswordData = z.infer<typeof changePasswordSchema>
export type PushSubscriptionData = z.infer<typeof pushSubscriptionSchema>
