import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Reset password',
  description: 'Choose a new KediSmart password.',
  path: '/reset-password',
  noIndex: true,
})

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
