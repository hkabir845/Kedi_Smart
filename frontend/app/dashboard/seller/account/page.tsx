'use client'

import { SellerAccountPanel } from '@/components/seller/SellerAccountPanel'

export default function LiveSellerAccountPage() {
  return <SellerAccountPanel basePath="/dashboard/seller" fallbackPath="/dashboard/seller" />
}
