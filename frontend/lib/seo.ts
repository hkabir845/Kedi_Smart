import type { Metadata } from 'next'

export const SITE_NAME = 'KediSmart'
export const DEFAULT_TITLE = 'KediSmart — Pet & Animal and General Products'
export const DEFAULT_DESCRIPTION =
  "Shop Pet & Animal care and General Products on KediSmart. Find vets, care for pets, and get everyday essentials — trusted by pets, loved by owners and their needs."

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
}

export function buildPageMetadata(opts: BuildOpts = {}): Metadata {
  const title = opts.title?.trim() || DEFAULT_TITLE
  const description = plainText(opts.description, 160) || DEFAULT_DESCRIPTION
  const url = absoluteUrl(opts.path || '/')
  const image = absoluteMediaUrl(opts.image) || absoluteUrl('/brand/kedismart-logo.png')

  const pageTitle =
    title === DEFAULT_TITLE || title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`

  return {
    title: { absolute: pageTitle },
    description,
    metadataBase: new URL(getSiteUrl()),
    alternates: { canonical: url },
    openGraph: {
      type: opts.type || 'website',
      locale: 'en_BD',
      url,
      siteName: SITE_NAME,
      title: pageTitle,
      description,
      images: [{ url: image, alt: pageTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [image],
    },
    robots: opts.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
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
