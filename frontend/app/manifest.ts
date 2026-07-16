import type { MetadataRoute } from 'next'
import { SITE_NAME, absoluteUrl } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Digital Pet ID & Smart Tags`,
    short_name: SITE_NAME,
    description:
      'Create a digital pet ID, link an NFC/QR smart tag, and help lost pets return home safely.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#0d9488',
    lang: 'en-BD',
    categories: ['lifestyle', 'pets', 'utilities'],
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
