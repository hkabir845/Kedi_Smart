import type { Metadata } from 'next'

export const SITE_NAME = 'KediSmart'
export const DEFAULT_TITLE = 'KediSmart | Digital Pet ID & NFC Pet Tags'
export const DEFAULT_DESCRIPTION =
  'Protect pets with a KediSmart digital ID and NFC/QR smart tag. Share emergency details privately, enable lost mode, and help finders bring pets home.'

/** Official brand spellings for schema alternateName + meta keywords. */
export const BRAND_ALIASES = [
  'KediSmart',
  'Kedi Smart',
  'kedismart',
  'Kedi_Smart',
  'Kedi-Smart',
] as const

export const DEFAULT_KEYWORDS = [
  ...BRAND_ALIASES,
  'pet marketplace',
  'live animals marketplace',
  'pet products',
  'animal marketplace Bangladesh',
  'buy sell adopt pets',
  'NFC pet tags',
  'smart pet tags',
  'digital pet ID',
  'lost pet recovery',
  'pet identification',
  'veterinary services Bangladesh',
]

export const SITE_LOCALE = 'en_BD'
export const SITE_LANGUAGE = 'en-BD'

/** Deduplicate keywords while preserving order (case-insensitive). */
export function mergeKeywords(...groups: Array<string | string[] | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const group of groups) {
    const items = Array.isArray(group) ? group : group ? [group] : []
    for (const raw of items) {
      const k = String(raw || '').trim()
      if (!k) continue
      const key = k.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(k)
    }
  }
  return out
}

/** Public origin for canonical / OG / sitemap (production default kedismart.com). */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://kedismart.com'
  return raw.replace(/\/$/, '')
}

export function absoluteUrl(path = '/'): string {
  const base = getSiteUrl()
  if (!path || path === '/') return base
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function absoluteMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('//')) return `https:${url}`
  return absoluteUrl(url.startsWith('/') ? url : `/${url}`)
}

/** Strip markdown / HTML for meta descriptions. */
export function plainText(raw?: string | null, max = 160): string {
  if (!raw) return ''
  const text = raw
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[[^\]]*]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trim()}…`
}

/** Dynamic OG image URL for social sharing (unique per page title). */
export function ogImageUrl(title: string, subtitle?: string): string {
  const params = new URLSearchParams({ title: title.slice(0, 90) })
  if (subtitle) params.set('subtitle', subtitle.slice(0, 120))
  return absoluteUrl(`/og?${params.toString()}`)
}

type BuildOpts = {
  title?: string
  description?: string
  path?: string
  image?: string | null
  noIndex?: boolean
  type?: 'website' | 'article' | 'profile'
  /** Extra page-specific keywords (brand aliases are always included). */
  keywords?: string[]
  publishedTime?: string | null
  modifiedTime?: string | null
  authors?: string[]
  /** When true, use generated /og image if no image provided. */
  generateOg?: boolean
}

/** Collect verified social profile URLs for Organization.sameAs (Knowledge Graph). */
export function collectSameAs(site: Record<string, any> = {}): string[] {
  const social = site.social || {}
  const keys = [
    social.facebook || site['social.facebook'],
    social.instagram || site['social.instagram'],
    social.youtube || site['social.youtube'],
    social.tiktok || site['social.tiktok'],
    social.twitter || site['social.twitter'],
    social.linkedin || site['social.linkedin'],
  ]
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of keys) {
    const url = String(raw || '').trim()
    if (!url || !/^https?:\/\//i.test(url)) continue
    const key = url.replace(/\/$/, '').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(url)
  }
  return out
}

/** Rich Organization + WebSite JSON-LD for brand entity discovery. */
export function buildBrandJsonLd(site: Record<string, any> = {}): Record<string, unknown>[] {
  const name = site['brand.app_name'] || SITE_NAME
  const description =
    plainText(site['brand.description'] || site?.seo?.meta_description || DEFAULT_DESCRIPTION, 300) ||
    DEFAULT_DESCRIPTION
  const logo =
    absoluteMediaUrl(site['brand.logo_url']) || absoluteUrl('/brand/kedismart-logo.png')
  const sameAs = collectSameAs(site)
  const email = String(site['contact.email'] || 'info@kedismart.com').trim()
  const phone = String(site['contact.phone'] || site['contact.whatsapp'] || '+8801898941782').trim()
  const address = String(
    site['contact.address'] || 'A.B.M Tower, Gulshan 2, Dhaka 1212, Bangladesh',
  ).trim()
  const ceo = String(site['brand.ceo_name'] || 'Jahura Satter').trim()
  const aliases = [...BRAND_ALIASES].filter((n) => n !== name && n !== SITE_NAME)

  const org: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'OnlineStore'],
    '@id': `${getSiteUrl()}/#organization`,
    name,
    ...(site['brand.legal_name'] ? { legalName: String(site['brand.legal_name']) } : {}),
    alternateName: aliases.length ? aliases : [...BRAND_ALIASES].filter((n) => n !== SITE_NAME),
    url: getSiteUrl(),
    logo: {
      '@type': 'ImageObject',
      url: logo,
      width: 512,
      height: 512,
    },
    image: logo,
    description,
    slogan: String(site['brand.tagline'] || '').trim() || 'Trusted by pets, loved by owners',
    sameAs,
    areaServed: {
      '@type': 'Country',
      name: 'Bangladesh',
    },
    knowsAbout: [
      'Pet marketplace',
      'Live animals',
      'Pet products',
      'Veterinary services',
      'NFC pet tags',
      'Smart pet tags',
      'Digital pet ID',
      'Lost pet recovery',
      'Pet identification',
      'General products ecommerce',
      ...BRAND_ALIASES,
    ],
  }

  if (email || phone) {
    org.contactPoint = [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['English', 'Bengali'],
        ...(email ? { email } : {}),
        ...(phone ? { telephone: phone } : {}),
        areaServed: 'BD',
      },
    ]
  }

  if (address) {
    org.address = {
      '@type': 'PostalAddress',
      streetAddress: 'A.B.M Tower, Gulshan 2',
      addressLocality: 'Dhaka',
      postalCode: '1212',
      addressCountry: 'BD',
    }
  }

  if (ceo) {
    org.founder = {
      '@type': 'Person',
      name: ceo,
      jobTitle: 'CEO',
      url: absoluteUrl('/authors/jahura-satter'),
      image: absoluteUrl('/brand/jahura-satter-ceo.png'),
    }
  }

  const website: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${getSiteUrl()}/#website`,
    name,
    alternateName: org.alternateName,
    url: getSiteUrl(),
    description,
    publisher: { '@id': `${getSiteUrl()}/#organization` },
    inLanguage: ['en-BD', 'bn-BD'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${getSiteUrl()}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return [org, website]
}

export function buildPageMetadata(opts: BuildOpts = {}): Metadata {
  const title = opts.title?.trim() || DEFAULT_TITLE
  const description = plainText(opts.description, 160) || DEFAULT_DESCRIPTION
  const path = opts.path || '/'
  const url = absoluteUrl(path)
  const fallbackOg = opts.generateOg !== false ? ogImageUrl(title, description) : undefined
  const image =
    absoluteMediaUrl(opts.image) || fallbackOg || absoluteUrl('/brand/kedismart-logo.png')
  const keywords = mergeKeywords(DEFAULT_KEYWORDS, opts.keywords)
  const twitterHandle = (process.env.NEXT_PUBLIC_TWITTER_HANDLE || '').trim()

  const pageTitle =
    title === DEFAULT_TITLE || title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`

  const openGraph: Metadata['openGraph'] = {
    type: opts.type || 'website',
    locale: SITE_LOCALE,
    alternateLocale: ['bn_BD'],
    url,
    siteName: SITE_NAME,
    title: pageTitle,
    description,
    images: [
      {
        url: image,
        width: 1200,
        height: 630,
        alt: pageTitle,
        type: 'image/png',
      },
    ],
  }
  if (opts.type === 'article') {
    if (opts.publishedTime) (openGraph as any).publishedTime = opts.publishedTime
    if (opts.modifiedTime) (openGraph as any).modifiedTime = opts.modifiedTime
    if (opts.authors?.length) (openGraph as any).authors = opts.authors
  }

  return {
    title: { absolute: pageTitle },
    description,
    keywords,
    authors: (opts.authors || [SITE_NAME]).map((name) => ({
      name,
      ...(name === SITE_NAME
        ? { url: getSiteUrl() }
        : name.toLowerCase() === 'jahura satter'
          ? { url: absoluteUrl('/authors/jahura-satter') }
          : {}),
    })),
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: url,
      languages: {
        'en-BD': url,
        'x-default': url,
      },
      types: {
        'application/rss+xml': absoluteUrl('/blog/feed.xml'),
      },
    },
    openGraph,
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [image],
      ...(twitterHandle
        ? {
            creator: twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`,
            site: twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`,
          }
        : {}),
    },
    robots: opts.noIndex
      ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  }
}

export async function fetchPublicSiteSettings(): Promise<Record<string, any>> {
  // Static pages use safe code defaults during `next build`; the live server
  // fetches CMS settings with revalidation after deployment.
  if (process.env.NEXT_PHASE === 'phase-production-build') return {}

  try {
    const publicUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
    let base = publicUrl
    if (!publicUrl.startsWith('http')) {
      const backend = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
      base = `${backend}${publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`}`
    }
    const res = await fetch(`${base.replace(/\/$/, '')}/site/public`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

/** Absolute API base for sitemap crawls (Node-safe). */
export function getServerApiBase(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
  if (publicUrl.startsWith('http://') || publicUrl.startsWith('https://')) {
    return publicUrl.replace(/\/$/, '')
  }
  const backend = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
  const path = publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`
  return `${backend}${path}`
}
