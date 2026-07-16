import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Checkout',
  description: 'Complete your KediSmart order securely.',
  path: '/checkout',
  noIndex: true,
})

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
