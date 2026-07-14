'use client'

import Link from 'next/link'
import KediSmartLogo from '@/components/KediSmartLogo'
import { getDjangoAdminUrl } from '@/lib/auth-routes'

export default function Footer() {
  const adminUrl = getDjangoAdminUrl()

  return (
    <footer className="mt-auto">
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div className="max-w-md">
              <div className="inline-block bg-white rounded-xl p-4 mb-4 shadow-md">
                <KediSmartLogo variant="full" size="md" link={false} />
              </div>
              <p className="text-primary-100 text-lg font-medium mb-2">
                Trusted by Pets, Loved by Owners
              </p>
              <p className="text-primary-50/90 text-sm leading-relaxed">
                KediSmart is Bangladesh&apos;s trusted pet &amp; animal platform — shop, care, connect, and
                protect your pets. Led by Jahura Satter, CEO.
              </p>
            </div>
            <div className="text-sm space-y-2 text-primary-50">
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
              <p className="max-w-xs">
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
                <li><Link href="/dashboard/orders" className="hover:text-white transition-colors">Orders</Link></li>
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
