'use client'

import Image from 'next/image'
import Link from 'next/link'
import KediSmartLogo from '@/components/KediSmartLogo'
import { getDjangoAdminUrl } from '@/lib/auth-routes'

export default function Footer() {
  const adminUrl = getDjangoAdminUrl()

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
