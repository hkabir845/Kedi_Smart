import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { CartProvider } from '@/lib/cart-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KediSmart — Pet & Animal Platform',
  description: 'Trusted by Pets, Loved by Owners. Shop pet products, find vets, and care for your pets on KediSmart.',
  icons: {
    icon: '/brand/kedismart-logo.png',
    apple: '/brand/kedismart-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col bg-gray-50`}>
        <CartProvider>
          <Suspense fallback={<div className="h-28 bg-white border-b" />}>
            <Header />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  )
}
