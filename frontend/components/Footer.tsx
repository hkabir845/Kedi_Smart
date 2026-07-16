'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import KediSmartLogo from '@/components/KediSmartLogo'
import { getDjangoAdminUrl } from '@/lib/auth-routes'
import { api } from '@/lib/api'

type SocialKey = 'facebook' | 'instagram' | 'youtube' | 'tiktok'
type SocialLinks = Partial<Record<SocialKey, string>>

const NETWORKS: Array<{ key: SocialKey; label: string }> = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
]

function normalizeUrl(raw?: string | null): string | null {
  if (raw == null) return null
  let v = String(raw).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim()
  }
  if (!v || v === '-' || v.toLowerCase() === 'null') return null
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

function readSocialUrl(data: any, key: SocialKey): string {
  const nested = data?.social?.[key]
  const dotted = data?.[`social.${key}`]
  const raw = nested ?? dotted ?? ''
  if (typeof raw === 'object' && raw !== null && 'url' in raw) {
    return String((raw as { url?: string }).url || '')
  }
  return typeof raw === 'string' ? raw : String(raw || '')
}

function SocialGlyph({ network }: { network: SocialKey }) {
  if (network === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="currentColor" aria-hidden>
        <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.4V9.84c0-2.37 1.41-3.68 3.56-3.68 1.03 0 2.11.18 2.11.18v2.32h-1.19c-1.17 0-1.54.73-1.54 1.48v1.78h2.62l-.42 2.91h-2.2V22c4.78-.75 8.44-4.91 8.44-9.93z" />
      </svg>
    )
  }
  if (network === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="currentColor" aria-hidden>
        <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      </svg>
    )
  }
  if (network === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="currentColor" aria-hidden>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.8 15.5v-7l6.4 3.5-6.4 3.5z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="currentColor" aria-hidden>
      <path d="M16.6 4.2c.7 1.5 1.9 2.7 3.4 3.3V10c-1.5-.1-2.9-.6-4.1-1.5v6.3a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.8a2.9 2.9 0 1 0 2 2.8V3h3.5v1.2z" />
    </svg>
  )
}

function SocialIcon({
  network,
  label,
  href,
  className,
}: {
  network: SocialKey
  label: string
  href: string | null
  className: string
}) {
  const inner = <SocialGlyph network={network} />
  if (!href) {
    return (
      <span
        className={`${className} opacity-70 cursor-default`}
        title={`${label} — add URL in Brand & settings`}
        aria-label={`${label} (not configured)`}
      >
        {inner}
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={className}
    >
      {inner}
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
        setSocial({
          facebook: readSocialUrl(data, 'facebook'),
          instagram: readSocialUrl(data, 'instagram'),
          youtube: readSocialUrl(data, 'youtube'),
          tiktok: readSocialUrl(data, 'tiktok'),
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const items = NETWORKS.map(({ key, label }) => ({
    network: key,
    label,
    href: normalizeUrl(social[key]),
  }))

  const bottomClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/35 hover:bg-primary-600 hover:text-white hover:ring-primary-500 transition-colors'

  return (
    <footer className="mt-auto no-print">
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white py-6 sm:py-7">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-block bg-white rounded-lg p-2 mb-3 shadow-sm">
                <KediSmartLogo variant="full" size="sm" link={false} />
              </div>
              <p className="text-white text-lg sm:text-xl font-semibold mb-2 leading-snug">
                Where every paw, feather, and fin feels at home
              </p>
              <p className="text-primary-50/95 text-sm sm:text-[15px] leading-relaxed">
                From the food they love to the care they deserve — KediSmart brings pet families
                closer to happier, healthier days. Shop with heart. Care with confidence.
              </p>
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
                  Building KediSmart so every pet family feels seen &amp; supported
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

      <div className="bg-brand-black text-gray-400 py-6 sm:py-7">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-5">
            <div>
              <h4 className="text-white font-semibold mb-2">Pet &amp; Animal</h4>
              <ul className="space-y-1.5 text-sm">
                <li><Link href="/shop" className="hover:text-primary-400 transition-colors">Shop</Link></li>
                <li><Link href="/marketplace" className="hover:text-primary-400 transition-colors">Live Animals</Link></li>
                <li><Link href="/vets" className="hover:text-primary-400 transition-colors">Find a Vet</Link></li>
                <li><Link href="/tags" className="hover:text-primary-400 transition-colors">NFC &amp; QR Tags</Link></li>
                <li><Link href="/learn" className="hover:text-primary-400 transition-colors">Knowledge Base</Link></li>
                <li><Link href="/guides" className="hover:text-primary-400 transition-colors">Guides</Link></li>
                <li><Link href="/emergency" className="hover:text-primary-400 transition-colors">Lost Pet Emergency</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Company</h4>
              <ul className="space-y-1.5 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/press" className="hover:text-white transition-colors">Press</Link></li>
                <li><Link href="/authors/jahura-satter" className="hover:text-white transition-colors">CEO</Link></li>
                <li><Link href="/site-map" className="hover:text-white transition-colors">Sitemap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Account</h4>
              <ul className="space-y-1.5 text-sm">
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
              <h4 className="text-white font-semibold mb-2">Sell on KediSmart</h4>
              <ul className="space-y-1.5 text-sm">
                <li><Link href="/register?role=VENDOR" className="hover:text-white transition-colors">Open a shop (Vendor)</Link></li>
                <li><Link href="/register?role=BREEDER" className="hover:text-white transition-colors">List live animals</Link></li>
                <li><Link href="/register?role=VET" className="hover:text-white transition-colors">Join as a vet</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Vendor sign in</Link></li>
              </ul>
              <div className="mt-4">
                <h4 className="text-white font-semibold mb-2">Follow us</h4>
                <div className="flex flex-wrap gap-2.5" aria-label="Follow us on social media">
                  {items.map(({ network, label, href }) => (
                    <SocialIcon
                      key={`bottom-${network}`}
                      network={network}
                      label={label}
                      href={href}
                      className={bottomClass}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 pt-4 text-sm text-center text-gray-500 space-y-2">
            <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/shipping" className="hover:text-white transition-colors">Shipping</Link>
              <Link href="/returns" className="hover:text-white transition-colors">Returns</Link>
              <Link href="/editorial-policy" className="hover:text-white transition-colors">Editorial</Link>
            </nav>
            <span>© {new Date().getFullYear()} KediSmart. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
