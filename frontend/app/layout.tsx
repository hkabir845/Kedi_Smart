import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { CartProvider } from '@/lib/cart-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KediSmart — Pet & Animal and General Products',
  description:
    'Shop Pet & Animal care and General Products on KediSmart. Find vets, care for pets, and get everyday essentials — trusted by pets, loved by owners and their needs.',
  icons: {
    icon: '/brand/kedismart-logo.png',
    apple: '/brand/kedismart-logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KediSmart',
  },
  formatDetection: {
    telephone: true,
    email: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full overflow-x-clip">
      <body
        className={`${inter.className} min-h-full min-h-[100dvh] flex flex-col bg-gray-50 overflow-x-clip antialiased`}
      >
        <CartProvider>
          <Suspense fallback={<div className="h-28 bg-white border-b" />}>
            <Header />
          </Suspense>
          <main className="flex-1 w-full min-w-0">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  )
}
