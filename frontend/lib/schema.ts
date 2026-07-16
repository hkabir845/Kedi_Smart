import {
  absoluteMediaUrl,
  absoluteUrl,
  BRAND_ALIASES,
  getSiteUrl,
  plainText,
  SITE_NAME,
} from '@/lib/seo'

const ORG_ID = () => `${getSiteUrl()}/#organization`
const WEBSITE_ID = () => `${getSiteUrl()}/#website`
const LOCAL_ID = () => `${getSiteUrl()}/#localbusiness`

export type BreadcrumbItem = { name: string; path: string }

/** schema.org BreadcrumbList for SERP trail + entity context. */
export function breadcrumbList(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

type ItemListEntry = {
  name: string
  url: string
  image?: string | null
  description?: string | null
}

/** schema.org ItemList for category / marketplace / blog index pages. */
export function itemListSchema(
  name: string,
  items: ItemListEntry[],
  opts?: { description?: string; path?: string },
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description: opts?.description,
    url: opts?.path ? absoluteUrl(opts.path) : undefined,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url.startsWith('http') ? item.url : absoluteUrl(item.url),
      ...(item.image ? { image: item.image } : {}),
      ...(item.description ? { description: item.description } : {}),
    })),
  }
}

export function brandEntitySnippet(): Record<string, unknown> {
  return {
    '@type': 'Brand',
    name: SITE_NAME,
    alternateName: BRAND_ALIASES.filter((n) => n !== SITE_NAME),
  }
}

export type FaqEntry = { question: string; answer: string }

/** schema.org FAQPage — pairs with visible FAQ content on the page. */
export function faqPageSchema(faqs: FaqEntry[]): Record<string, unknown> | null {
  const clean = faqs
    .map((f) => ({
      question: String(f.question || '').trim(),
      answer: plainText(f.answer, 5000),
    }))
    .filter((f) => f.question && f.answer)
  if (!clean.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: clean.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }
}

/** WebPage entity linked to Organization / WebSite. */
export function webPageSchema(opts: {
  name: string
  description?: string
  path: string
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'FAQPage' | 'ProfilePage'
  inLanguage?: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': opts.type || 'WebPage',
    '@id': `${absoluteUrl(opts.path)}#webpage`,
    url: absoluteUrl(opts.path),
    name: opts.name,
    description: opts.description ? plainText(opts.description, 300) : undefined,
    isPartOf: { '@id': WEBSITE_ID() },
    about: { '@id': ORG_ID() },
    inLanguage: opts.inLanguage || 'en-BD',
    publisher: { '@id': ORG_ID() },
  }
}

/** LocalBusiness + NAP for Gulshan HQ (matches footer). */
export function localBusinessSchema(site: Record<string, any> = {}): Record<string, unknown> {
  const name = site['brand.app_name'] || SITE_NAME
  const email = String(site['contact.email'] || 'info@kedismart.com').trim()
  const phone = String(site['contact.phone'] || site['contact.whatsapp'] || '+8801898941782').trim()
  const address = String(site['contact.address'] || 'A.B.M Tower, Gulshan 2, Dhaka 1212, Bangladesh').trim()
  const logo =
    absoluteMediaUrl(site['brand.logo_url']) || absoluteUrl('/brand/kedismart-logo.png')

  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'PetStore', 'OnlineStore'],
    '@id': LOCAL_ID(),
    name,
    alternateName: BRAND_ALIASES.filter((n) => n !== name),
    url: absoluteUrl('/'),
    image: logo,
    logo,
    email,
    telephone: phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.includes('Gulshan') ? 'A.B.M Tower, Gulshan 2' : address,
      addressLocality: 'Dhaka',
      postalCode: '1212',
      addressCountry: 'BD',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 23.7947,
      longitude: 90.4143,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '20:00',
      },
    ],
    priceRange: '৳৳',
    areaServed: { '@type': 'Country', name: 'Bangladesh' },
    parentOrganization: { '@id': ORG_ID() },
  }
}

export function personSchema(opts: {
  name: string
  jobTitle?: string
  path: string
  image?: string | null
  description?: string
  sameAs?: string[]
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${absoluteUrl(opts.path)}#person`,
    name: opts.name,
    jobTitle: opts.jobTitle,
    url: absoluteUrl(opts.path),
    description: opts.description ? plainText(opts.description, 300) : undefined,
    image: absoluteMediaUrl(opts.image) || undefined,
    worksFor: { '@id': ORG_ID() },
    ...(opts.sameAs?.length ? { sameAs: opts.sameAs } : {}),
  }
}

export function reviewSchemas(
  reviews: Array<{
    rating?: number
    title?: string | null
    body?: string | null
    created_at?: string | null
    author_name?: string | null
  }>,
): Record<string, unknown>[] {
  return reviews
    .filter((r) => r.rating && r.rating >= 1)
    .slice(0, 10)
    .map((r) => ({
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      name: r.title || undefined,
      reviewBody: r.body ? plainText(r.body, 500) : undefined,
      datePublished: r.created_at || undefined,
      author: {
        '@type': 'Person',
        name: r.author_name || 'KediSmart customer',
      },
    }))
}

export function aggregateRatingSchema(
  average: number | null | undefined,
  count: number,
): Record<string, unknown> | null {
  if (!average || !count || count < 1) return null
  return {
    '@type': 'AggregateRating',
    ratingValue: average,
    reviewCount: count,
    bestRating: 5,
    worstRating: 1,
  }
}

export function videoObjectSchema(opts: {
  name: string
  description?: string
  contentUrl: string
  posterUrl?: string | null
  uploadDate?: string | null
  durationSeconds?: number | null
}): Record<string, unknown> {
  const duration =
    opts.durationSeconds && opts.durationSeconds > 0
      ? `PT${Math.floor(opts.durationSeconds / 60)}M${Math.floor(opts.durationSeconds % 60)}S`
      : undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: opts.name,
    description: opts.description ? plainText(opts.description, 200) : opts.name,
    contentUrl: opts.contentUrl,
    thumbnailUrl: absoluteMediaUrl(opts.posterUrl) || absoluteUrl('/brand/kedismart-logo.png'),
    uploadDate: opts.uploadDate || undefined,
    duration,
    publisher: { '@id': ORG_ID() },
  }
}

/** Approximate reading time from markdown/HTML body. */
export function readingTimeMinutes(raw?: string | null): number {
  if (!raw) return 1
  const words = plainText(raw, 500000).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** Extract markdown/HTML headings for a table of contents. */
export function extractToc(
  body?: string | null,
): Array<{ id: string; text: string; level: 2 | 3 }> {
  if (!body) return []
  const out: Array<{ id: string; text: string; level: 2 | 3 }> = []
  const md = body.matchAll(/^(#{2,3})\s+(.+)$/gm)
  for (const m of md) {
    const level = m[1].length === 2 ? 2 : 3
    const text = m[2].replace(/[#*_`]/g, '').trim()
    if (!text) continue
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF]+/gi, '-')
      .replace(/^-|-$/g, '')
    out.push({ id, text, level: level as 2 | 3 })
  }
  if (out.length) return out.slice(0, 24)

  const html = body.matchAll(/<h([23])[^>]*>(.*?)<\/h\1>/gi)
  for (const m of html) {
    const level = Number(m[1]) === 2 ? 2 : 3
    const text = plainText(m[2], 120)
    if (!text) continue
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF]+/gi, '-')
      .replace(/^-|-$/g, '')
    out.push({ id, text, level: level as 2 | 3 })
  }
  return out.slice(0, 24)
}

export function defaultProductFaqs(product: {
  title?: string
  brand?: string
  currency?: string
}): FaqEntry[] {
  const title = product.title || 'this product'
  return [
    {
      question: `Is ${title} available for delivery in Bangladesh?`,
      answer: `Yes. KediSmart delivers ${title} across Bangladesh with cash on delivery and secure online payment options where available.`,
    },
    {
      question: `How do I know ${title} is authentic?`,
      answer: `${product.brand ? `${product.brand} products on` : 'Products on'} KediSmart are sold by verified vendors. Check the product page for stock, seller details, and customer reviews before ordering.`,
    },
    {
      question: `Can I return ${title} if it is not right for my pet or home?`,
      answer:
        'Eligible unused items can be returned according to KediSmart return policy. Contact support from your order page or info@kedismart.com for help.',
    },
  ]
}
