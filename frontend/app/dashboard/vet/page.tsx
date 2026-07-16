'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  PanelNotice,
  QuickLink,
  SectionHeading,
  StatCard,
  StatusPill,
} from '@/components/control-centre/PanelPrimitives'

function verificationTone(status?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'pending') return 'warning'
  return 'neutral'
}

export default function VetControlCentrePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/vet')
      return
    }
    api.setToken(token)
    api
      .get('/auth/me')
      .then(async (me) => {
        const [vetProfile, appts] = await Promise.all([
          api.get(`/vets/${me.id}`).catch(() => null),
          api.get('/vets/appointments').catch(() => []),
        ])
        setProfile(vetProfile)
        setAppointments(Array.isArray(appts) ? appts : [])
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return <div className="text-gray-500">Loading clinic centre...</div>
  }

  const requested = appointments.filter((a) => a.status === 'requested').length
  const confirmed = appointments.filter((a) => a.status === 'confirmed').length
  const completed = appointments.filter((a) => a.status === 'completed').length
  const upcoming = appointments
    .filter((a) => ['requested', 'confirmed'].includes(a.status))
    .slice(0, 4)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={verificationTone(profile?.verification_status)}>
          {profile?.verification_status === 'approved'
            ? 'Verified clinic'
            : profile?.verification_status
              ? `Verification: ${profile.verification_status}`
              : 'Profile incomplete'}
        </StatusPill>
        {profile?.online_consultation_enabled && <StatusPill tone="info">Online consults on</StatusPill>}
        {profile?.city && <StatusPill tone="neutral">{profile.city}</StatusPill>}
      </div>

      {!profile?.clinic_name && (
        <PanelNotice tone="warning">
          Finish your clinic profile so pet owners can discover and book you.{' '}
          <Link href="/dashboard/vet/profile" className="font-semibold underline">
            Open clinic profile
          </Link>
        </PanelNotice>
      )}

      {profile?.verification_status !== 'approved' && profile?.clinic_name && (
        <PanelNotice tone="info">
          Your clinic stays private until verification is approved. You can still set availability and manage
          appointment requests.
        </PanelNotice>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="New requests" value={requested} />
        <StatCard label="Confirmed" value={confirmed} />
        <StatCard label="Completed" value={completed} />
        <StatCard label="Total booked" value={appointments.length} />
      </section>

      <section>
        <SectionHeading title="Clinic operations" />
        <div className="grid sm:grid-cols-2 gap-4">
          <QuickLink
            href="/dashboard/vet/appointments"
            title="Manage appointments"
            description="Confirm, complete, or cancel booking requests"
          />
          <QuickLink
            href="/dashboard/vet/availability"
            title="Set availability"
            description="Weekly clinic and online consultation slots"
          />
          <QuickLink
            href="/dashboard/vet/profile"
            title="Clinic profile"
            description="License, specialties, address, and verification docs"
          />
          <QuickLink
            href="/dashboard/vet/earnings"
            title="Earnings & payouts"
            description="Ledger, platform commission, and withdraw balance"
          />
          <QuickLink
            href="/dashboard/vet/account"
            title="Seller account"
            description="Commission plan and bank / wallet payout details"
          />
          <QuickLink
            href="/vets"
            title="Public directory"
            description="See how approved clinics appear to pet parents"
          />
        </div>
      </section>

      <section>
        <SectionHeading
          title="Upcoming schedule"
          action={
            <Link
              href="/dashboard/vet/appointments"
              className="text-sm font-semibold text-primary-600 hover:underline"
            >
              Open inbox
            </Link>
          }
        />
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-xl p-5">
            No upcoming appointments. Keep your profile and availability up to date so owners can book.
          </p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="font-medium text-gray-900">#{appointment.id}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(appointment.scheduled_at).toLocaleString()} · {appointment.mode}
                  </p>
                </div>
                <StatusPill tone={appointment.status === 'confirmed' ? 'info' : 'warning'}>
                  {appointment.status}
                </StatusPill>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
