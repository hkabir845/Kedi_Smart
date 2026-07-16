import JsonLd from '@/components/JsonLd'
import { buildBrandJsonLd, fetchPublicSiteSettings } from '@/lib/seo'

/** Server component: Organization + WebSite JSON-LD with live sameAs / contact. */
export default async function SiteJsonLd() {
  const site = await fetchPublicSiteSettings()
  return <JsonLd data={buildBrandJsonLd(site)} />
}
