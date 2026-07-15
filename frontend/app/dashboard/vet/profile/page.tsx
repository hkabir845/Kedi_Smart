'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { PanelNotice, StatusPill } from '@/components/control-centre/PanelPrimitives'

export default function VetProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    clinic_name: '',
    specialties: '' as string,
    years_experience: 0,
    license_no: '',
    address: '',
    city: '',
    country: 'Bangladesh',
    online_consultation_enabled: false,
    verification_doc: '',
  })
  const [verificationStatus, setVerificationStatus] = useState<string>('pending')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/vet/profile')
      return
    }

    api.setToken(token)
    api
      .get('/auth/me')
      .then((userData) => api.get(`/vets/${userData.id}`))
      .then((data) => {
        if (!data) return
        setFormData({
          clinic_name: data.clinic_name || '',
          specialties: Array.isArray(data.specialties) ? data.specialties.join(', ') : '',
          years_experience: data.years_experience || 0,
          license_no: data.license_no || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || 'Bangladesh',
          online_consultation_enabled: data.online_consultation_enabled || false,
          verification_doc: '',
        })
        setVerificationStatus(data.verification_status || 'pending')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      await api.put('/vets/profile', {
        clinic_name: formData.clinic_name,
        specialties: formData.specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        years_experience: formData.years_experience,
        license_no: formData.license_no,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        online_consultation_enabled: formData.online_consultation_enabled,
      })

      if (formData.verification_doc.trim()) {
        await api.post('/users/me/verification', {
          type: 'vet',
          docs_urls: [formData.verification_doc.trim()],
        })
        setVerificationStatus('pending')
      }

      setMessage('Clinic profile saved.')
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading clinic profile...</div>
  }

  const field =
    'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500'

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/vet" className="text-primary-600 hover:text-primary-700 text-sm mb-3 inline-block">
          ← Clinic home
        </Link>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Clinic profile</h2>
          <StatusPill
            tone={
              verificationStatus === 'approved'
                ? 'success'
                : verificationStatus === 'rejected'
                  ? 'danger'
                  : 'warning'
            }
          >
            {verificationStatus}
          </StatusPill>
        </div>
        <p className="text-sm text-gray-600">
          This is what KediSmart and pet parents use to verify and discover your practice.
        </p>
      </div>

      {verificationStatus === 'pending' && (
        <PanelNotice tone="warning">
          Verification pending — you won&apos;t appear in the public vet directory until approved.
        </PanelNotice>
      )}
      {verificationStatus === 'approved' && (
        <PanelNotice tone="success">Your clinic is verified and visible to pet owners.</PanelNotice>
      )}
      {message && <PanelNotice tone="success">{message}</PanelNotice>}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5 max-w-2xl"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clinic name *</label>
          <input
            required
            className={field}
            value={formData.clinic_name}
            onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
          <textarea
            required
            rows={3}
            className={field}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
            <input
              required
              className={field}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
            <input
              required
              className={field}
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Years of experience</label>
            <input
              type="number"
              min={0}
              className={field}
              value={formData.years_experience}
              onChange={(e) =>
                setFormData({ ...formData, years_experience: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License number</label>
            <input
              className={field}
              value={formData.license_no}
              onChange={(e) => setFormData({ ...formData, license_no: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
          <input
            className={field}
            placeholder="e.g. surgery, dermatology, nutrition"
            value={formData.specialties}
            onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Verification document link</label>
          <input
            type="url"
            className={field}
            value={formData.verification_doc}
            onChange={(e) => setFormData({ ...formData, verification_doc: e.target.value })}
            placeholder="URL to veterinary license or certificate"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={formData.online_consultation_enabled}
            onChange={(e) =>
              setFormData({ ...formData, online_consultation_enabled: e.target.checked })
            }
          />
          Enable online consultations
        </label>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save clinic profile'}
        </button>
      </form>
    </div>
  )
}
