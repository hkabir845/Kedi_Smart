'use client'

import { useEffect } from 'react'

/** Registers the installable PWA service worker in production. */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* ignore registration failures (private mode, etc.) */
    })
  }, [])

  return null
}
