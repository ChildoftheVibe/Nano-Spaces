const CACHE_VERSION = 'v2'
const CACHE_NAME = `nano-spaces-${CACHE_VERSION}`

// Only truly static, never-changing assets belong here.
// Navigation pages (/, /calendar, etc.) are intentionally excluded:
// serving a stale navigation response would bypass Next.js middleware (auth,
// 2FA checks, role redirects) and break session-dependent routing.
const STATIC_ASSETS = ['/manifest.json', '/icon-192.png', '/icon-512.png', '/icon-badge.png']

// ─── Install: cache static assets only ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

// ─── Activate: remove all old-version caches ────────────────────────────────
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

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API calls and Next.js compiled chunks must never be served from SW cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    event.respondWith(fetch(request))
    return
  }

  // Navigation requests (HTML pages) always hit the network so that
  // Next.js middleware can run: auth checks, 2FA verification, role-based
  // redirects, and session cookie refresh all depend on the server responding.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        () => caches.match('/manifest.json').then((r) => r ?? Response.error()),
      ),
    )
    return
  }

  // Static assets (icons, manifest): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()))
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
