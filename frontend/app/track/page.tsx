'use client'

import { Suspense } from 'react'
import TrackOrderClient from './TrackOrderClient'

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={<div className="min-h-[40vh] flex items-center justify-center text-gray-500">Loading…</div>}
    >
      <TrackOrderClient />
    </Suspense>
  )
}
