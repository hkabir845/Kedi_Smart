'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import KediSmartLogo from '@/components/KediSmartLogo'
import { getDjangoAdminUrl } from '@/lib/auth-routes'
import { api } from '@/lib/api'

type SocialLinks = {
  facebook?: string
  instagram?: string
  youtube?: string
  tiktok?: string
}

function normalizeUrl(raw?: string): string | null {
  const v = (raw || '').trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

function SocialGlyph({ network }: { network: 'facebook' | 'instagram' | 'youtube' | 'tiktok' }) {
  if (network === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M14 8h2.5V4.5H14c-2.5 0-4.5 2-4.5 4.5V12H7v3.5h2.5V22h3.5v-6.5H16L17 12h-3.5V9c0-.6.4-1 1-1z" />
      </svg>
    )
  }
  if (network === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7zm5 2.8A4.2 4.2 0 1 1 7.8 12 4.2 4.2 0 0 1 12 7.8zm0 2A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8zM17.4 6.3a1 1 0 1 1-1 1 1 1 0 0 1 1-1z" />
      </svg>
    )
  }
  if (network === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M23 12.2s0-3.4-.4-5a3 3 0 0 0-2.1-2.1C18.9 4.6 12 4.6 12 4.6s-6.9 0-8.5.5A3 3 0 0 0 1.4 7.2C1 8.8 1 12.2 1 12.2s0 3.4.4 5a3 3 0 0 0 2.1 2.1c1.6.5 8.5.5 8.5.5s6.9 0 8.5-.5a3 3 0 0 0 2.1-2.1c.4-1.6.4-5 .4-5zM9.8 15.5v-6.6l5.8 3.3-5.8 3.3z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M16.6 4.2c.7 1.5 1.9 2.7 3.4 3.3V10c-1.5-.1-2.9-.6-4.1-1.5v6.3a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.8a2.9 2.9 0 1 0 2 2.8V3h3.5v1.2z" />
    </svg>
  )
}

function SocialIcon({
  network,
  href,
  className = 'inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 hover:bg-white hover:text-primary-600 transition-colors',
}: {
  network: 'facebook' | 'instagram' | 'youtube' | 'tiktok'
  href: string
  className?: string
}) {
  const label =
    network === 'facebook'
      ? 'Facebook'
      : network === 'instagram'
        ? 'Instagram'
        : network === 'youtube'
          ? 'YouTube'
          : 'TikTok'

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={className}
    >
      <SocialGlyph network={network} />
    </a>
  )
}

export default function Footer() {
  const adminUrl = getDjangoAdminUrl()
  const [social, setSocial] = useState<SocialLinks>({})

  useEffect(() => {
    let cancelled = false
    api
      .get('/site/public')
      .then((data) => {
        if (cancelled) return
        const s = data?.social || {}
        setSocial({
          facebook: s.facebook || data?.['social.facebook'] || '',
          instagram: s.instagram || data?.['social.instagram'] || '',
          youtube: s.youtube || data?.['social.youtube'] || '',
          tiktok: s.tiktok || data?.['social.tiktok'] || '',
        })
      })
      .catch(() => {
        /* keep footer usable offline / if API down */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const networks: Array<{ key: keyof SocialLinks; network: 'facebook' | 'instagram' | 'youtube' | 'tiktok' }> = [
    { key: 'facebook', network: 'facebook' },
    { key: 'instagram', network: 'instagram' },
    { key: 'youtube', network: 'youtube' },
    { key: 'tiktok', network: 'tiktok' },
  ]
  const links = networks
    .map(({ key, network }) => ({ network, href: normalizeUrl(social[key]) }))
    .filter((x): x is { network: typeof x.network; href: string } => Boolean(x.href))

  return (
    <footer className="mt-auto no-print">
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white py-6 sm:py-7">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-block bg-white rounded-lg p-2 mb-2 shadow-sm">
                <KediSmartLogo variant="full" size="sm" link={false} />
              </div>
              <p className="text-primary-100 text-base font-medium mb-1">
                Trusted by Pets, Loved by Owners and their needs
              </p>
              <p className="text-primary-50/90 text-sm leading-snug">
                KediSmart is Bangladesh&apos;s trusted marketplace for Pet &amp; Animal care and
                General Products — shop, care, connect, and get everyday essentials.
              </p>
              {links.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  {links.map(({ network, href }) => (
                    <SocialIcon key={network} network={network} href={href} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-4 shrink-0 rounded-2xl bg-black/15 ring-1 ring-white/20 px-3 sm:px-4 py-3">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-lg bg-white">
                <Image
                  src="/brand/jahura-satter-ceo.png"
                  alt="Jahura Satter, CEO of KediSmart"
                  fill
                  sizes="80px"
                  className="object-cover object-[center_18%]"
                />
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-base sm:text-lg leading-tight">
                  Jahura Satter
                </p>
                <p className="text-primary-100 text-sm font-medium mt-0.5">CEO</p>
                <p className="text-primary-50/80 text-xs mt-1 hidden sm:block">
                  Leading KediSmart with care for pets &amp; people
                </p>
              </div>
            </div>

            <div className="text-sm space-y-1 text-primary-50 lg:text-right">
              <p>
                <a href="tel:+8801898941782" className="hover:text-white transition-colors">
                  +880 1898-941782
                </a>
              </p>
              <p>
                <a href="mailto:info@kedismart.com" className="hover:text-white transition-colors">
                  info@kedismart.com
                </a>
              </p>
              <p className="max-w-xs lg:ml-auto">
                A.B.M Tower, Gulshan 2, Dhaka 1212, Bangladesh
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-brand-black text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-3">Pet &amp; Animal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/shop" className="hover:text-primary-400 transition-colors">Shop</Link></li>
                <li><Link href="/marketplace" className="hover:text-primary-400 transition-colors">Live Animals</Link></li>
                <li><Link href="/vets" className="hover:text-primary-400 transition-colors">Find a Vet</Link></li>
                <li><Link href="/pets" className="hover:text-primary-400 transition-colors">Knowledge Hub</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">General Store</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/shop?catalog=general" className="hover:text-white transition-colors">General Products</Link></li>
                <li><Link href="/cart" className="hover:text-white transition-colors">Cart</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Account</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/dashboard" className="hover:text-white transition-colors">My Account</Link></li>
                <li><Link href="/dashboard/vendor" className="hover:text-white transition-colors">Seller Centre</Link></li>
                <li><Link href="/dashboard/orders" className="hover:text-white transition-colors">Orders</Link></li>
                <li><Link href="/track" className="hover:text-white transition-colors">Track order</Link></li>
                <li><Link href="/dashboard/pets" className="hover:text-white transition-colors">My Pets</Link></li>
                <li>
                  <a href={adminUrl} className="hover:text-white transition-colors">
                    Admin
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Sell on KediSmart</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/register?role=VENDOR" className="hover:text-white transition-colors">Open a shop (Vendor)</Link></li>
                <li><Link href="/register?role=BREEDER" className="hover:text-white transition-colors">List live animals</Link></li>
                <li><Link href="/register?role=VET" className="hover:text-white transition-colors">Join as a vet</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Vendor sign in</Link></li>
              </ul>
              {links.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-white font-semibold mb-3">Follow us</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {links.map(({ network, href }) => (
                      <SocialIcon
                        key={`bottom-${network}`}
                        network={network}
                        href={href}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-gray-200 ring-1 ring-white/10 hover:bg-primary-600 hover:text-white transition-colors"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-gray-800 mt-10 pt-6 text-sm flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-gray-500">
            <span>© {new Date().getFullYear()} KediSmart. All rights reserved.</span>
            <span className="hidden sm:inline text-gray-700">·</span>
            <a href={adminUrl} className="hover:text-primary-400 transition-colors">
              Admin
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
