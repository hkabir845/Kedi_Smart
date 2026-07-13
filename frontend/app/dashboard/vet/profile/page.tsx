'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function VetProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    clinic_name: '',
    specialties: [] as string[],
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
      router.push('/login')
      return
    }

    api.setToken(token)
    // Get current user to find vet profile
    api.get('/auth/me')
      .then((userData) => {
        // Fetch vet profile using user ID
        return api.get(`/vets/${userData.id}`)
      })
      .then((data) => {
        setProfile(data)
        if (data) {
          setFormData({
            clinic_name: data.clinic_name || '',
            specialties: Array.isArray(data.specialties) ? data.specialties : [],
            years_experience: data.years_experience || 0,
            license_no: data.license_no || '',
            address: data.address || '',
            city: data.city || '',
            country: data.country || 'Bangladesh',
            online_consultation_enabled: data.online_consultation_enabled || false,
            verification_doc: '',
          })
          setVerificationStatus(data.verification_status || 'pending')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await api.put('/vets/profile', {
        clinic_name: formData.clinic_name,
        specialties: formData.specialties,
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

      alert('Profile saved successfully')
    } catch (err: any) {
      alert(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Vet Profile</h1>

        {verificationStatus === 'pending' && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Verification pending — you won&apos;t appear in the public vet directory until approved.
          </div>
        )}
        {verificationStatus === 'approved' && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Your vet profile is verified and visible to pet owners.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinic Name *
            </label>
            <input
              type="text"
              required
              value={formData.clinic_name}
              onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Years of Experience
            </label>
            <input
              type="number"
              value={formData.years_experience}
              onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License number
            </label>
            <input
              type="text"
              value={formData.license_no}
              onChange={(e) => setFormData({ ...formData, license_no: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification document link
            </label>
            <input
              type="url"
              value={formData.verification_doc}
              onChange={(e) => setFormData({ ...formData, verification_doc: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="URL to veterinary license or certificate"
            />
            <p className="text-xs text-gray-500 mt-1">Submit or update your license for admin review.</p>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.online_consultation_enabled}
                onChange={(e) => setFormData({ ...formData, online_consultation_enabled: e.target.checked })}
                className="mr-2"
              />
              Enable Online Consultations
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </main>
  )
}
