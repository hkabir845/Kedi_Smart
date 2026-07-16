import DashboardShell from '@/components/DashboardShell'
import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Dashboard',
  description: 'KediSmart account dashboard.',
  path: '/dashboard',
  noIndex: true,
})

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
