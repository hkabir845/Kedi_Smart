import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Shopping Cart',
  description: 'Review items in your KediSmart cart before checkout.',
  path: '/cart',
  noIndex: true,
})

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
