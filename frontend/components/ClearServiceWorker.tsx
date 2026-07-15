'use client'

import { useEffect } from 'react'

/** Clears leftover service workers from other localhost:3000 apps / extensions. */
export default function ClearServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
      .catch(() => {})
  }, [])
  return null
}
