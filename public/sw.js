const CACHE_NAME = 'nano-spaces-v1'

// App-shell assets to cache on install
const SHELL_ASSETS = ['/', '/calendar', '/manifest.json', '/icon-192.png', '/icon-512.png']

// ─── Install: cache shell assets ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

// ─── Activate: remove old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

// ─── Fetch: network-first with shell fallback ───────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Always pass API calls through — never serve from cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    event.respondWith(fetch(request))
    return
  }

  // Shell assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return res
        })
        .catch(() => cached ?? Response.error())

      return cached ?? networkFetch
    }),
  )
})

// ─── Push notifications ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title ?? 'Nano Spaces'
  const options = {
    body: data.body ?? 'You have a new notification.',
    icon: '/icon-192.png',
    badge: '/icon-badge.png',
    data: { url: data.url ?? '/calendar' },
    vibrate: [100, 50, 100],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/calendar'
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find((c) => c.url.includes(url) && 'focus' in c)
        if (existing) return existing.focus()
        return clients.openWindow(url)
      }),
  )
})
