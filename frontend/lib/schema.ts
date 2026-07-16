import { absoluteUrl, BRAND_ALIASES, SITE_NAME } from '@/lib/seo'

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
