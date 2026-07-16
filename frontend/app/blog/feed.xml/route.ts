import { getServerApiBase, getSiteUrl, plainText, SITE_NAME } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function fetchPosts(): Promise<any[]> {
  try {
    const res = await fetch(`${getServerApiBase()}/blog/posts?limit=50`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    if (Array.isArray(data)) return data
    if (Array.isArray(data.items)) return data.items
    if (Array.isArray(data.results)) return data.results
    return []
  } catch {
    return []
  }
}

/** RSS 2.0 feed — syndicates KediSmart blog to aggregators & AI crawlers. */
export async function GET() {
  const base = getSiteUrl()
  const posts = await fetchPosts()
  const items = posts
    .filter((p) => p?.slug)
    .map((post) => {
      const link = `${base}/blog/${post.slug}`
      const title = xmlEscape(String(post.title || 'Untitled'))
      const desc = xmlEscape(plainText(post.excerpt || post.body_md || post.title, 280))
      const pub = post.published_at || post.created_at || new Date().toISOString()
      const guid = xmlEscape(link)
      return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${guid}</guid>
      <pubDate>${new Date(pub).toUTCString()}</pubDate>
      <description>${desc}</description>
      <category>KediSmart</category>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(SITE_NAME)} Blog</title>
    <link>${base}/blog</link>
    <description>Pet care tips, animal welfare, and marketplace updates from ${xmlEscape(SITE_NAME)} (Kedi Smart, kedismart, Kedi_Smart, Kedi-Smart).</description>
    <language>en-bd</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${base}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${base}/brand/kedismart-logo.png</url>
      <title>${xmlEscape(SITE_NAME)}</title>
      <link>${base}</link>
    </image>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
