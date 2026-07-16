'use client'

import { SellerStatementsPanel } from '@/components/seller/SellerStatementsPanel'

export default function VendorStatementsPage() {
  return <SellerStatementsPanel basePath="/dashboard/vendor" fallbackPath="/dashboard/vendor" />
}
