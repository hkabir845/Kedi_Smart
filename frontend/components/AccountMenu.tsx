'use client'

import Link from 'next/link'
import {
  getControlCentreLabel,
  getDefaultDashboardPath,
  openDjangoAdmin,
  ROLE_LABELS,
} from '@/lib/auth-routes'
import { useEffect, useRef, useState } from 'react'

type UserInfo = {
  email: string
  role: string
  profile?: { full_name?: string }
}

export default function AccountMenu({ user, onLogout }: { user: UserInfo; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const displayName = user.profile?.full_name?.trim() || user.email.split('@')[0]
  const initial = displayName.charAt(0).toUpperCase()
  const isOwner = user.role === 'OWNER'
  const isVendor = user.role === 'VENDOR'
  const isVet = user.role === 'VET'
  const isLiveSeller = user.role === 'BREEDER' || user.role === 'TRADER' || user.role === 'SHELTER'
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
  const accountHome = getDefaultDashboardPath(user.role)
  const roleLabel = ROLE_LABELS[user.role] || user.role
  const centreLabel = getControlCentreLabel(user.role)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  const itemClass =
    'flex items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm text-gray-700 hover:bg-gray-50 transition-colors'

  const handleLogout = () => {
    setOpen(false)
    onLogout()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 min-h-[44px] px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
      >
        <span className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {initial}
        </span>
        <span className="hidden lg:flex flex-col items-start max-w-[140px]">
          <span className="text-xs text-gray-500 leading-tight">{centreLabel}</span>
          <span className="text-sm font-semibold text-gray-900 truncate w-full">{displayName}</span>
        </span>
        <svg
          className={`hidden lg:block w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(16rem,calc(100vw-1.5rem))] bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-[60]">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            <p className="text-xs text-primary-700 mt-1 font-medium">{roleLabel}</p>
          </div>

          <div className="py-1">
            <Link href={accountHome} className={itemClass} onClick={() => setOpen(false)}>
              {centreLabel}
            </Link>

            {isVendor && (
              <>
                <Link href="/dashboard/vendor/products" className={itemClass} onClick={() => setOpen(false)}>
                  My products
                </Link>
                <Link href="/dashboard/vendor/orders" className={itemClass} onClick={() => setOpen(false)}>
                  Customer orders
                </Link>
                <Link href="/dashboard/invoices" className={itemClass} onClick={() => setOpen(false)}>
                  Invoices
                </Link>
                <Link href="/dashboard/vendor/earnings" className={itemClass} onClick={() => setOpen(false)}>
                  Earnings
                </Link>
                <Link href="/dashboard/vendor/profile" className={itemClass} onClick={() => setOpen(false)}>
                  Shop profile
                </Link>
              </>
            )}

            {isOwner && (
              <>
                <Link href="/dashboard/pets" className={itemClass} onClick={() => setOpen(false)}>
                  My pets
                </Link>
                <Link href="/dashboard/appointments" className={itemClass} onClick={() => setOpen(false)}>
                  Appointments
                </Link>
              </>
            )}

            {isVet && (
              <>
                <Link href="/dashboard/vet/appointments" className={itemClass} onClick={() => setOpen(false)}>
                  Appointment inbox
                </Link>
                <Link href="/dashboard/vet/availability" className={itemClass} onClick={() => setOpen(false)}>
                  Availability
                </Link>
                <Link href="/dashboard/invoices" className={itemClass} onClick={() => setOpen(false)}>
                  Invoices
                </Link>
                <Link href="/dashboard/vet/profile" className={itemClass} onClick={() => setOpen(false)}>
                  Clinic profile
                </Link>
              </>
            )}

            {isLiveSeller && (
              <>
                <Link href="/dashboard/listings" className={itemClass} onClick={() => setOpen(false)}>
                  My listings
                </Link>
                <Link href="/dashboard/listings/new" className={itemClass} onClick={() => setOpen(false)}>
                  Create listing
                </Link>
                <Link href="/dashboard/invoices" className={itemClass} onClick={() => setOpen(false)}>
                  Invoices
                </Link>
              </>
            )}

            {isAdmin && (
              <button
                type="button"
                className={`${itemClass} w-full text-left`}
                onClick={() => {
                  setOpen(false)
                  openDjangoAdmin(localStorage.getItem('access_token'))
                }}
              >
                Django admin
              </button>
            )}

            <Link href="/dashboard/orders" className={itemClass} onClick={() => setOpen(false)}>
              {isVendor || isVet || isLiveSeller ? 'My purchases' : 'Order history'}
            </Link>
            <Link
              href={isLiveSeller ? '/marketplace' : isVet ? '/vets' : '/shop'}
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              {isVendor ? 'View storefront' : isVet ? 'Public directory' : isLiveSeller ? 'Marketplace' : 'Continue shopping'}
            </Link>
          </div>

          <div className="border-t border-gray-100 pt-1">
            <button type="button" onClick={handleLogout} className={`${itemClass} w-full text-left text-red-600`}>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
