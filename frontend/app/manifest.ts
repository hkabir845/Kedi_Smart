import type { MetadataRoute } from 'next'
import { SITE_NAME, absoluteUrl } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Pet & Animal Marketplace`,
    short_name: SITE_NAME,
    description:
      'KediSmart (Kedi Smart, kedismart) — shop products, live animals marketplace, vets, and NFC pet tags in Bangladesh.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#0d9488',
    lang: 'en-BD',
    categories: ['shopping', 'lifestyle', 'pets'],
    icons: [
      {
        src: absoluteUrl('/brand/kedismart-mark.png'),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: absoluteUrl('/brand/kedismart-logo.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
