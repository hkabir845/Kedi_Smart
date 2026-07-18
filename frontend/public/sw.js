/* Minimal service worker — enables installability / TWA without offline caching. */
const SW_VERSION = 'kedismart-sw-v1'

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
  // Network-only: keep app fresh; SW presence satisfies PWA install criteria.
  event.respondWith(fetch(request))
})
