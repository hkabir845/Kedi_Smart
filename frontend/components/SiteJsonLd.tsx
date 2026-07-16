import JsonLd from '@/components/JsonLd'
import { localBusinessSchema } from '@/lib/schema'
import { buildBrandJsonLd, fetchPublicSiteSettings } from '@/lib/seo'

/** Server component: Organization + WebSite + LocalBusiness JSON-LD. */
export default async function SiteJsonLd() {
  const site = await fetchPublicSiteSettings()
  return <JsonLd data={[...buildBrandJsonLd(site), localBusinessSchema(site)]} />
}
