import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Create account',
  description: 'Register as a pet parent, vendor, breeder, or vet on KediSmart.',
  path: '/register',
  noIndex: true,
})

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
