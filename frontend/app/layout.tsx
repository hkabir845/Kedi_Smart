import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import JsonLd from '@/components/JsonLd'
import { CartProvider } from '@/lib/cart-context'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  absoluteUrl,
  buildPageMetadata,
  fetchPublicSiteSettings,
  getSiteUrl,
} from '@/lib/seo'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const site = await fetchPublicSiteSettings()
  const title = site?.seo?.meta_title || site?.['seo.meta_title'] || DEFAULT_TITLE
  const description =
    site?.seo?.meta_description || site?.['seo.meta_description'] || DEFAULT_DESCRIPTION
  const image = site?.['brand.logo_url'] || '/brand/kedismart-logo.png'
  const base = buildPageMetadata({
    title,
    description,
    path: '/',
    image,
  })
  const absoluteTitle =
    typeof base.title === 'object' && base.title && 'absolute' in base.title
      ? String((base.title as { absolute?: string }).absolute || DEFAULT_TITLE)
      : DEFAULT_TITLE

  return {
    ...base,
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: absoluteTitle,
      template: `%s | ${SITE_NAME}`,
    },
    applicationName: SITE_NAME,
    icons: {
      icon: '/brand/kedismart-logo.png',
      apple: '/brand/kedismart-logo.png',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: SITE_NAME,
    },
    formatDetection: {
      telephone: true,
      email: true,
    },
    category: 'shopping',
  }
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
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: getSiteUrl(),
    logo: absoluteUrl('/brand/kedismart-logo.png'),
    sameAs: [] as string[],
  }
  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: getSiteUrl(),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${getSiteUrl()}/shop?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <html lang="en" className="h-full overflow-x-clip">
      <body
        className={`${inter.className} min-h-full min-h-[100dvh] flex flex-col bg-gray-50 overflow-x-clip antialiased`}
      >
        <JsonLd data={[orgLd, websiteLd]} />
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
