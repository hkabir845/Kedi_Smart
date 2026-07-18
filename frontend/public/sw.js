/* Minimal service worker — enables installability / TWA without offline caching. */
const SW_VERSION = 'kedismart-sw-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => key !== SW_VERSION).map((key) => caches.delete(key))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Never intercept cross-origin requests (product CDN images, analytics, etc.).
  // SW fetch() is governed by connect-src CSP and would block DigitalOcean / Amazon CDNs.
  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return

  event.respondWith(fetch(request))
})
