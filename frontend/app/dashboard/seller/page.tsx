'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  EmptyState,
  PanelNotice,
  QuickLink,
  SectionHeading,
  StatCard,
  StatusPill,
} from '@/components/control-centre/PanelPrimitives'
import { ROLE_LABELS } from '@/lib/auth-routes'

function verificationTypeForRole(role: string): string {
  if (role === 'SHELTER') return 'shelter'
  return 'seller'
}

export default function LiveSellerControlCentrePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [verifications, setVerifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [docUrl, setDocUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState('')

  const refreshVerifications = () =>
    api.get('/users/me/verifications').then((data) => {
      setVerifications(Array.isArray(data) ? data : [])
    })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/seller')
      return
    }
    api.setToken(token)
    Promise.all([
      api.get('/auth/me'),
      api.get('/marketplace/listings?mine=true&limit=100').catch(() => ({ items: [] })),
      api.get('/users/me/verifications').catch(() => []),
    ])
      .then(([me, listingData, verificationData]) => {
        setUser(me)
        setListings(listingData?.items || [])
        setVerifications(Array.isArray(verificationData) ? verificationData : [])
      })
      .finally(() => setLoading(false))
  }, [router])

  const submitVerification = async (e: FormEvent) => {
    e.preventDefault()
    if (!docUrl.trim() || !user) return
    setSubmitting(true)
    setVerifyMessage('')
    try {
      await api.post('/users/me/verification', {
        type: verificationTypeForRole(user.role),
        docs_urls: [docUrl.trim()],
      })
      setDocUrl('')
      setVerifyMessage('Verification submitted for review.')
      await refreshVerifications()
    } catch (err: any) {
      setVerifyMessage(err.message || 'Could not submit verification')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading listing centre...</div>
  }

  if (!user) return null

  const roleLabel = ROLE_LABELS[user.role] || user.role
  const published = listings.filter((l) => l.status === 'published').length
  const pending = listings.filter((l) => l.status === 'pending').length
  const other = listings.length - published - pending
  const latestVerification = verifications[0]
  const sellerCopy =
    user.role === 'SHELTER'
      ? 'Manage adoption and rescue listings with clear moderation status.'
      : user.role === 'TRADER'
        ? 'List animals for trade or sale and track marketplace moderation.'
        : 'Present breeding availability, litters, and adult animals for responsibly vetted buyers.'
  const canSubmitVerification =
    !latestVerification || latestVerification.status === 'rejected'

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="info">{roleLabel}</StatusPill>
          <StatusPill tone="neutral">{listings.length} listings</StatusPill>
          {latestVerification && (
            <StatusPill
              tone={
                latestVerification.status === 'approved'
                  ? 'success'
                  : latestVerification.status === 'rejected'
                    ? 'danger'
                    : 'warning'
              }
            >
              Verification: {latestVerification.status}
            </StatusPill>
          )}
        </div>
        <p className="text-sm text-gray-600 max-w-2xl">{sellerCopy}</p>
      </section>

      {listings.length === 0 && (
        <PanelNotice tone="warning">
          Create your first listing to start reaching pet parents on the marketplace.{' '}
          <Link href="/dashboard/listings/new" className="font-semibold underline">
            Create listing
          </Link>
        </PanelNotice>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total listings" value={listings.length} />
        <StatCard label="Live" value={published} hint="Visible on marketplace" />
        <StatCard label="In review" value={pending} />
        <StatCard label="Other" value={other} hint="Draft / removed / closed" />
      </section>

      <section>
        <SectionHeading title="Listing operations" />
        <div className="grid sm:grid-cols-2 gap-4">
          <QuickLink
            href="/dashboard/listings/new"
            title="Create listing"
            description="Sale, adoption, giveaway, or cubs — reviewed before going live"
          />
          <QuickLink
            href="/dashboard/listings"
            title="Manage listings"
            description="Edit, close, and track moderation status"
          />
          <QuickLink
            href="/dashboard/seller/earnings"
            title="Earnings & payouts"
            description="Ledger, platform commission, and withdraw balance"
          />
          <QuickLink
            href="/dashboard/seller/account"
            title="Seller account"
            description="Commission plan and bank / wallet payout details"
          />
          <QuickLink
            href="/marketplace"
            title="Browse marketplace"
            description="See how buyers discover live-animal offers"
          />
          <QuickLink
            href="/dashboard/account"
            title="Account settings"
            description="Update contact details used on listings and invoices"
          />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <SectionHeading title="Seller verification" />
        <p className="text-sm text-gray-600">
          Submit a public URL to a trade licence, NID, or shelter registration for platform review.
        </p>
        {latestVerification && (
          <PanelNotice
            tone={
              latestVerification.status === 'approved'
                ? 'success'
                : latestVerification.status === 'rejected'
                  ? 'warning'
                  : 'info'
            }
          >
            Latest request: {latestVerification.status}
            {latestVerification.admin_notes ? ` — ${latestVerification.admin_notes}` : ''}
          </PanelNotice>
        )}
        {canSubmitVerification && (
          <form onSubmit={submitVerification} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              required
              placeholder="https://..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit for review'}
            </button>
          </form>
        )}
        {verifyMessage && <p className="text-sm text-gray-700">{verifyMessage}</p>}
      </section>

      <section>
        <SectionHeading
          title="Recent listings"
          action={
            <Link href="/dashboard/listings" className="text-sm font-semibold text-primary-600 hover:underline">
              View all
            </Link>
          }
        />
        {listings.length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="Listings need a short description, location, and type before our team can review them."
            actionHref="/dashboard/listings/new"
            actionLabel="Create listing"
          />
        ) : (
          <div className="space-y-3">
            {listings.slice(0, 5).map((listing) => (
              <Link
                key={listing.id}
                href={`/marketplace/${listing.id}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm hover:border-primary-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {listing.species}
                    {listing.breed ? ` · ${listing.breed}` : ''}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {listing.type} · {listing.location_text}
                  </p>
                </div>
                <StatusPill
                  tone={
                    listing.status === 'published'
                      ? 'success'
                      : listing.status === 'pending'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {listing.status}
                </StatusPill>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
