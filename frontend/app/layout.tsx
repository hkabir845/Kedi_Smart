import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import SiteJsonLd from '@/components/SiteJsonLd'
import SkipToContent from '@/components/SkipToContent'
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

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
})

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

  const googleVerify =
    process.env.GOOGLE_SITE_VERIFICATION ||
    site?.seo?.google_site_verification ||
    site?.['seo.google_site_verification'] ||
    ''
  const bingVerify =
    process.env.BING_SITE_VERIFICATION ||
    site?.seo?.bing_site_verification ||
    site?.['seo.bing_site_verification'] ||
    ''

  const verification: Metadata['verification'] = {}
  if (googleVerify) verification.google = String(googleVerify)
  if (bingVerify) {
    verification.other = { 'msvalidate.01': String(bingVerify) }
  }

  return {
    ...base,
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: absoluteTitle,
      template: `%s | ${SITE_NAME}`,
    },
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: getSiteUrl() }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    icons: {
      icon: [
        { url: '/brand/kedismart-mark.png', type: 'image/png' },
        { url: '/brand/kedismart-logo.png', type: 'image/png' },
      ],
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
    other: {
      'msapplication-TileColor': '#0d9488',
      'opensearchdescription': absoluteUrl('/opensearch.xml'),
    },
    ...(Object.keys(verification).length ? { verification } : {}),
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
  return (
    <html lang="en-BD" className="h-full overflow-x-clip">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="KediSmart Blog"
          href="/blog/feed.xml"
        />
        <link rel="search" type="application/opensearchdescription+xml" title="KediSmart" href="/opensearch.xml" />
        <link rel="author" href="/humans.txt" />
      </head>
      <body
        className={`${inter.className} min-h-full min-h-[100dvh] flex flex-col bg-gray-50 overflow-x-clip antialiased`}
      >
        <SkipToContent />
        <Suspense fallback={null}>
          <SiteJsonLd />
        </Suspense>
        <CartProvider>
          <Suspense fallback={<div className="h-28 bg-white border-b" aria-hidden />}>
            <Header />
          </Suspense>
          <main id="main-content" className="flex-1 w-full min-w-0" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  )
}
