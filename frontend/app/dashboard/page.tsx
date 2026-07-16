'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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

export default function ShopperControlCentrePage() {
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [pets, setPets] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    api.setToken(token)
    Promise.all([
      api.get('/auth/me'),
      api.get('/shop/orders').catch(() => []),
      api.get('/pets?limit=50').catch(() => ({ items: [] })),
      api.get('/vets/appointments').catch(() => []),
    ])
      .then(([me, orderList, petList, apptList]) => {
        setUser(me)
        setOrders(Array.isArray(orderList) ? orderList : [])
        setPets(petList?.items || [])
        setAppointments(Array.isArray(apptList) ? apptList : [])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-gray-500 py-8">Loading your control centre...</div>
  }

  if (!user) return null

  const openOrders = orders.filter((o) => !['delivered', 'cancelled', 'refunded'].includes(o.status)).length
  const upcomingAppts = appointments.filter((a) =>
    ['requested', 'confirmed'].includes(a.status)
  ).length
  const recentOrders = orders.slice(0, 3)

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="info">{ROLE_LABELS[user.role] || 'Shopper'}</StatusPill>
          <StatusPill tone="neutral">{pets.length} pets registered</StatusPill>
        </div>
        <p className="text-sm text-gray-600 max-w-2xl">
          Your Pet Parent Centre — track orders, manage pets, and book veterinary care in one place.
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Orders" value={orders.length} hint={`${openOrders} open`} />
        <StatCard label="My pets" value={pets.length} />
        <StatCard label="Appointments" value={appointments.length} hint={`${upcomingAppts} upcoming`} />
        <StatCard
          label="Account"
          value={user.profile?.full_name ? 'Ready' : 'Incomplete'}
          hint={user.email}
        />
      </section>

      {pets.length === 0 && (
        <PanelNotice tone="warning">
          Add your first pet to unlock medical records, privacy controls, and vet bookings.{' '}
          <Link href="/dashboard/pets/new" className="font-semibold underline">
            Add a pet
          </Link>
        </PanelNotice>
      )}

      <section>
        <SectionHeading title="Quick actions" />
        <div className="grid sm:grid-cols-2 gap-4">
          <QuickLink
            href="/shop"
            title="Shop pet products"
            description="Food, toys, electronics, and everyday essentials"
          />
          <QuickLink
            href="/dashboard/pets/new"
            title="Add a pet"
            description="Build a profile for health records and lost-pet safety"
          />
          <QuickLink
            href="/dashboard/pets/tags"
            title="Tags & lost/found"
            description="Link NFC/QR tags, enable lost mode, and reply to finders"
          />
          <QuickLink
            href="/vets"
            title="Find a veterinarian"
            description="Book clinic visits or online consultations"
          />
          <QuickLink
            href="/marketplace"
            title="Browse live animals"
            description="Adoption, sale, and shelter listings near you"
          />
        </div>
      </section>

      <section>
        <SectionHeading
          title="Recent orders"
          action={
            <Link href="/dashboard/orders" className="text-sm font-semibold text-primary-600 hover:underline">
              View all
            </Link>
          }
        />
        {recentOrders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="When you shop on KediSmart, your purchases and invoices will show up here."
            actionHref="/shop"
            actionLabel="Start shopping"
          />
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm hover:border-primary-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">Order #{order.id}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()} · {order.status}
                  </p>
                </div>
                <p className="text-sm font-semibold text-primary-600">
                  {order.currency} {Number(order.total).toFixed(0)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account details</h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt className="text-gray-500 mb-0.5">Email</dt>
            <dd className="font-medium text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-0.5">Account type</dt>
            <dd className="font-medium text-gray-900">{ROLE_LABELS[user.role] || user.role}</dd>
          </div>
          {user.profile?.full_name && (
            <div>
              <dt className="text-gray-500 mb-0.5">Full name</dt>
              <dd className="font-medium text-gray-900">{user.profile.full_name}</dd>
            </div>
          )}
          {user.profile?.phone && (
            <div>
              <dt className="text-gray-500 mb-0.5">Phone</dt>
              <dd className="font-medium text-gray-900">{user.profile.phone}</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  )
}
