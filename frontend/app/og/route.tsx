import { ImageResponse } from 'next/og'
import { SITE_NAME } from '@/lib/seo'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = (searchParams.get('title') || SITE_NAME).slice(0, 90)
  const subtitle = (searchParams.get('subtitle') || 'Pet & Animal Marketplace · Bangladesh').slice(
    0,
    120,
  )

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f766e 0%, #115e59 45%, #134e4a 100%)',
          color: 'white',
          padding: '56px 64px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'white',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            K
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 980 }}>
          <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.15 }}>{title}</div>
          <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.88)', lineHeight: 1.4 }}>
            {subtitle}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, opacity: 0.9 }}>
          <span>kedismart.com</span>
          <span>Pets · Vets · Marketplace</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
