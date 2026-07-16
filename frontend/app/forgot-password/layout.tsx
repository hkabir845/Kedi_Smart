import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Forgot password',
  description: 'Reset your KediSmart account password.',
  path: '/forgot-password',
  noIndex: true,
})

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
