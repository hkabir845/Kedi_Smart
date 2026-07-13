'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function PetPrivacyPage() {
  const router = useRouter()
  const params = useParams()
  const petId = params.id
  const [privacy, setPrivacy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    allow_call: false,
    allow_whatsapp: false,
    allow_chat: true,
    show_city_only: true,
    show_reward_note: false
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    api.get(`/pets/${petId}/privacy`)
      .then((data) => {
        setPrivacy(data)
        if (data) {
          setFormData({
            allow_call: data.allow_call || false,
            allow_whatsapp: data.allow_whatsapp || false,
            allow_chat: data.allow_chat !== undefined ? data.allow_chat : true,
            show_city_only: data.show_city_only !== undefined ? data.show_city_only : true,
            show_reward_note: data.show_reward_note || false
          })
        }
      })
      .catch(() => router.push(`/dashboard/pets/${petId}`))
      .finally(() => setLoading(false))
  }, [petId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await api.put(`/pets/${petId}/privacy`, formData)
      alert('Privacy settings updated successfully')
    } catch (err: any) {
      alert(err.message || 'Failed to update privacy settings')
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
        <Link href={`/dashboard/pets/${petId}`} className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Pet Details
        </Link>

        <h1 className="text-4xl font-bold mb-8">Privacy Settings</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Contact Options</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allow_call}
                  onChange={(e) => setFormData({ ...formData, allow_call: e.target.checked })}
                  className="mr-2"
                />
                Allow phone calls
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allow_whatsapp}
                  onChange={(e) => setFormData({ ...formData, allow_whatsapp: e.target.checked })}
                  className="mr-2"
                />
                Allow WhatsApp messages
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allow_chat}
                  onChange={(e) => setFormData({ ...formData, allow_chat: e.target.checked })}
                  className="mr-2"
                />
                Allow masked chat
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Location Privacy</h2>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.show_city_only}
                onChange={(e) => setFormData({ ...formData, show_city_only: e.target.checked })}
                className="mr-2"
              />
              Show city only (hide full address)
            </label>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Lost Pet Settings</h2>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.show_reward_note}
                onChange={(e) => setFormData({ ...formData, show_reward_note: e.target.checked })}
                className="mr-2"
              />
              Show reward note in lost mode
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Privacy Settings'}
          </button>
        </form>
      </div>
    </main>
  )
}
