'use client'

import { SellerEarningsPanel } from '@/components/seller/SellerEarningsPanel'

export default function VendorEarningsPage() {
  return <SellerEarningsPanel basePath="/dashboard/vendor" fallbackPath="/dashboard/vendor" />
}
