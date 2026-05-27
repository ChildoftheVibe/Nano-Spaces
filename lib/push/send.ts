import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  webpush.setVapidDetails(env.WEB_PUSH_EMAIL, env.WEB_PUSH_PUBLIC_KEY, env.WEB_PUSH_PRIVATE_KEY)
  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/icon-192.png',
    url: payload.url ?? '/',
  })

  const stale: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          message,
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          stale.push(sub.id)
        }
      }
    }),
  )

  if (stale.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', stale)
  }
}
