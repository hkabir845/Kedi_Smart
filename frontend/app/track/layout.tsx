import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Track order',
  description: 'Track your KediSmart order status with your order number.',
  path: '/track',
  noIndex: true,
  keywords: ['track order KediSmart', 'order status Bangladesh'],
})

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children
}
