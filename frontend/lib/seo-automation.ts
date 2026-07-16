/**
 * SEO automation helpers — call whenever Product, Blog, FAQ, Guide, or Category pages render.
 * Generates consistent metadata, breadcrumbs, canonicals, and related-link suggestions.
 */

import type { Metadata } from 'next'
import { breadcrumbList, faqPageSchema, webPageSchema, type BreadcrumbItem, type FaqEntry } from '@/lib/schema'
import { absoluteUrl, buildPageMetadata, plainText } from '@/lib/seo'
import { TOPIC_CLUSTERS } from '@/lib/content/topic-clusters'

// Re-export buildPageMetadata path typing — BuildOpts is not exported; use parameters.
export type ContentKind = 'product' | 'blog' | 'faq' | 'guide' | 'comparison' | 'category' | 'landing' | 'policy'

export type AutoSeoInput = {
  kind: ContentKind
  title: string
  description: string
  path: string
  keywords?: string[]
  image?: string | null
  noIndex?: boolean
  crumbs?: BreadcrumbItem[]
  faqs?: FaqEntry[]
  type?: 'website' | 'article' | 'profile'
  publishedTime?: string | null
  modifiedTime?: string | null
  authors?: string[]
  aiSummary?: string
  clusterId?: string
}

export type AutoSeoResult = {
  metadata: Metadata
  canonical: string
  breadcrumbs: BreadcrumbItem[]
  breadcrumbJsonLd: Record<string, unknown>
  webPageJsonLd: Record<string, unknown>
  faqJsonLd: Record<string, unknown> | null
  schemas: Record<string, unknown>[]
  relatedLinks: { label: string; path: string }[]
  aiSummary: string
}

const KIND_DEFAULT_CRUMB: Record<ContentKind, BreadcrumbItem | null> = {
  product: { name: 'Shop', path: '/shop' },
  blog: { name: 'Blog', path: '/blog' },
  faq: { name: 'FAQ', path: '/faq' },
  guide: { name: 'Guides', path: '/guides' },
  comparison: { name: 'Compare', path: '/compare' },
  category: { name: 'Learn', path: '/learn' },
  landing: { name: 'Learn', path: '/learn' },
  policy: { name: 'Policies', path: '/site-map' },
}

/** Build full SEO package for a content entity. */
export function automatePageSeo(input: AutoSeoInput): AutoSeoResult {
  const description = plainText(input.description || input.aiSummary, 160)
  const aiSummary = plainText(input.aiSummary || input.description, 300)
  const metadata = buildPageMetadata({
    title: input.title,
    description,
    path: input.path,
    keywords: input.keywords,
    image: input.image,
    noIndex: input.noIndex,
    type: input.type || (input.kind === 'blog' || input.kind === 'guide' ? 'article' : 'website'),
    publishedTime: input.publishedTime,
    modifiedTime: input.modifiedTime,
    authors: input.authors,
  })

  const parent = KIND_DEFAULT_CRUMB[input.kind]
  const breadcrumbs: BreadcrumbItem[] =
    input.crumbs ||
    [
      { name: 'Home', path: '/' },
      ...(parent ? [parent] : []),
      { name: input.title, path: input.path },
    ]

  const breadcrumbJsonLd = breadcrumbList(breadcrumbs)
  const webPageJsonLd = webPageSchema({
    name: input.title,
    description,
    path: input.path,
    type: input.kind === 'faq' ? 'FAQPage' : 'WebPage',
  })
  const faqJsonLd = input.faqs?.length ? faqPageSchema(input.faqs) : null
  const schemas = [webPageJsonLd, breadcrumbJsonLd, faqJsonLd].filter(Boolean) as Record<
    string,
    unknown
  >[]

  const relatedLinks = suggestRelatedLinks(input)

  return {
    metadata,
    canonical: absoluteUrl(input.path),
    breadcrumbs,
    breadcrumbJsonLd,
    webPageJsonLd,
    faqJsonLd,
    schemas,
    relatedLinks,
    aiSummary,
  }
}

/** Suggest internal links from topic cluster graph. */
export function suggestRelatedLinks(input: AutoSeoInput): { label: string; path: string }[] {
  const links: { label: string; path: string }[] = [
    { label: 'Smart Tags', path: '/tags' },
    { label: 'Emergency Center', path: '/emergency' },
    { label: 'Guides', path: '/guides' },
    { label: 'Compare', path: '/compare' },
    { label: 'FAQ', path: '/faq' },
  ]

  const cluster = TOPIC_CLUSTERS.find((c) => c.id === input.clusterId)
  if (cluster) {
    links.unshift({ label: cluster.name, path: cluster.cornerstonePath })
    links.push({ label: 'Related products', path: cluster.relatedProductPath })
  }

  if (input.kind === 'product') {
    links.push({ label: 'Shop', path: '/shop' }, { label: 'Pet care guides', path: '/pets' })
  }
  if (input.kind === 'blog') {
    links.push({ label: 'Blog', path: '/blog' }, { label: 'Learn hub', path: '/learn' })
  }

  const seen = new Set<string>()
  return links.filter((l) => {
    if (seen.has(l.path) || l.path === input.path) return false
    seen.add(l.path)
    return true
  })
}

/** Shop breadcrumb with optional category silo. */
export function productBreadcrumbs(opts: {
  title: string
  slug: string
  categoryName?: string | null
  categorySlug?: string | null
}): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
  ]
  if (opts.categoryName && opts.categorySlug) {
    items.push({
      name: opts.categoryName,
      path: `/shop?category=${encodeURIComponent(opts.categorySlug)}`,
    })
  } else if (opts.categoryName) {
    items.push({ name: opts.categoryName, path: '/shop' })
  }
  items.push({ name: opts.title, path: `/product/${opts.slug}` })
  return items
}

/** One-sentence AI-overview style definition block. */
export function definitionBlock(term: string, definition: string): string {
  return `${term}: ${plainText(definition, 280)}`
}
