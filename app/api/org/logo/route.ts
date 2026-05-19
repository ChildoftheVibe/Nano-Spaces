import type { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/api-response/handler'
import { success } from '@/lib/api-response/helpers'
import { createSessionClient, createAdminClient } from '@/lib/supabase/server'
import { AuthError, ValidationError } from '@/lib/errors/AppError'

const ALLOWED_SIGNATURES: Array<[number[], string]> = [
  [[0xff, 0xd8, 0xff], 'image/jpeg'],
  [[0x89, 0x50, 0x4e, 0x47], 'image/png'],
  [[0x52, 0x49, 0x46, 0x46], 'image/webp'],
]

function detectMimeType(bytes: Uint8Array): string | null {
  for (const [sig, mime] of ALLOWED_SIGNATURES) {
    // eslint-disable-next-line security/detect-object-injection
    if (sig.every((b, i) => bytes[i] === b)) return mime
  }
  return null
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const requestId = crypto.randomUUID()

  const sessionClient = await createSessionClient()
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser()
  if (error || !user) throw new AuthError({ userMessage: 'Not authenticated.', requestId })

  const { data: profile } = await sessionClient
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'org_admin' || !profile.org_id) {
    throw new AuthError({ userMessage: 'Org admin access required.', requestId })
  }

  const formData = await req.formData().catch(() => null)
  const file = formData?.get('logo')

  if (!(file instanceof File)) {
    throw new ValidationError({ userMessage: 'A logo file is required.', requestId })
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new ValidationError({ userMessage: 'Logo must be 2MB or smaller.', requestId })
  }

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  const mimeType = detectMimeType(bytes)
  if (!mimeType) {
    throw new ValidationError({
      userMessage: 'Only JPEG, PNG, and WebP images are allowed.',
      requestId,
    })
  }

  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp'
  const filename = `${crypto.randomUUID()}.${ext}`
  const storagePath = `${profile.org_id}/${filename}`

  const admin = createAdminClient()

  // Delete old logo if one exists
  const { data: org } = await admin
    .from('organizations')
    .select('logo_url')
    .eq('id', profile.org_id)
    .single()

  if (org?.logo_url) {
    const oldPath = org.logo_url.split('/org-logos/').at(1)
    if (oldPath) {
      await admin.storage.from('org-logos').remove([oldPath])
    }
  }

  const { error: uploadError } = await admin.storage
    .from('org-logos')
    .upload(storagePath, bytes, { contentType: mimeType, upsert: false })

  if (uploadError) {
    throw new Error('Failed to upload logo.')
  }

  const { data: urlData } = admin.storage.from('org-logos').getPublicUrl(storagePath)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('organizations') as any)
    .update({ logo_url: urlData.publicUrl })
    .eq('id', profile.org_id)

  await admin.from('activity_log').insert({
    org_id: profile.org_id,
    actor_id: user.id,
    action: 'org_logo_updated',
    target_type: 'organization',
    target_id: profile.org_id,
    details: {},
  })

  return success({ logoUrl: urlData.publicUrl })
})
