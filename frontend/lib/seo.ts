import type { Metadata } from 'next'

export const SITE_NAME = 'KediSmart'
export const DEFAULT_TITLE = 'KediSmart — Pet & Animal and General Products'
export const DEFAULT_DESCRIPTION =
  "Shop Pet & Animal care and General Products on KediSmart. Find vets, care for pets, and get everyday essentials — trusted by pets, loved by owners and their needs."

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
]

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
  const email = String(site['contact.email'] || '').trim()
  const phone = String(site['contact.phone'] || site['contact.whatsapp'] || '').trim()
  const address = String(site['contact.address'] || '').trim()
  const ceo = String(site['brand.ceo_name'] || '').trim()
  const aliases = [...BRAND_ALIASES].filter((n) => n !== name && n !== SITE_NAME)

  const org: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'OnlineStore'],
    '@id': `${getSiteUrl()}/#organization`,
    name,
    legalName: name,
    alternateName: aliases.length ? aliases : [...BRAND_ALIASES].filter((n) => n !== SITE_NAME),
    url: getSiteUrl(),
    logo: {
      '@type': 'ImageObject',
      url: logo,
    },
    image: logo,
    description,
    slogan: String(site['brand.tagline'] || '').trim() || undefined,
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
      ...BRAND_ALIASES,
    ],
  }

  if (email || phone) {
    org.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['en', 'bn'],
      ...(email ? { email } : {}),
      ...(phone ? { telephone: phone } : {}),
      areaServed: 'BD',
    }
  }

  if (address) {
    org.address = {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressCountry: 'BD',
    }
  }

  if (ceo) {
    org.founder = {
      '@type': 'Person',
      name: ceo,
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
    inLanguage: 'en-BD',
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
  const url = absoluteUrl(opts.path || '/')
  const image = absoluteMediaUrl(opts.image) || absoluteUrl('/brand/kedismart-logo.png')
  const keywords = mergeKeywords(DEFAULT_KEYWORDS, opts.keywords)

  const pageTitle =
    title === DEFAULT_TITLE || title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`

  const openGraph: Metadata['openGraph'] = {
    type: opts.type || 'website',
    locale: 'en_BD',
    url,
    siteName: SITE_NAME,
    title: pageTitle,
    description,
    images: [{ url: image, alt: pageTitle }],
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
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: url,
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
    },
    robots: opts.noIndex
      ? { index: false, follow: false }
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
