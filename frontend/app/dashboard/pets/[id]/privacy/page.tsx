'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

type FormState = {
  public_fields: {
    name: boolean
    species: boolean
    breed: boolean
    photo: boolean
  }
  allow_call: boolean
  allow_whatsapp: boolean
  allow_chat: boolean
  show_city_only: boolean
  show_reward_note: boolean
}

const defaults: FormState = {
  public_fields: {
    name: true,
    species: true,
    breed: false,
    photo: true,
  },
  allow_call: false,
  allow_whatsapp: false,
  allow_chat: true,
  show_city_only: true,
  show_reward_note: true,
}

export default function PetPrivacyPage() {
  const router = useRouter()
  const params = useParams()
  const petId = params.id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState<FormState>(defaults)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push(`/login?next=/dashboard/pets/${petId}/privacy`)
      return
    }

    api.setToken(token)
    api
      .get(`/pets/${petId}/privacy`)
      .then((data) => {
        const pf = data?.public_fields || {}
        setFormData({
          public_fields: {
            name: pf.name !== undefined ? Boolean(pf.name) : true,
            species: pf.species !== undefined ? Boolean(pf.species) : true,
            breed: Boolean(pf.breed),
            photo: pf.photo !== undefined ? Boolean(pf.photo) : true,
          },
          allow_call: Boolean(data.allow_call),
          allow_whatsapp: Boolean(data.allow_whatsapp),
          allow_chat: data.allow_chat !== undefined ? Boolean(data.allow_chat) : true,
          show_city_only: data.show_city_only !== undefined ? Boolean(data.show_city_only) : true,
          show_reward_note:
            data.show_reward_note !== undefined ? Boolean(data.show_reward_note) : true,
        })
      })
      .catch(() => router.push(`/dashboard/pets/${petId}`))
      .finally(() => setLoading(false))
  }, [petId, router])

  const setField = (key: keyof FormState['public_fields'], value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      public_fields: { ...prev.public_fields, [key]: value },
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await api.put(`/pets/${petId}/privacy`, formData)
      setSaved(true)
    } catch (err: any) {
      setError(err.message || 'Failed to update privacy settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500 py-8">Loading privacy settings…</div>
  }

  return (
    <div className="max-w-2xl">
      <Link
        href={`/dashboard/pets/${petId}`}
        className="text-sm font-medium text-primary-600 hover:text-primary-700 mb-3 inline-block"
      >
        ← Back to pet
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Scan profile privacy</h1>
      <p className="text-sm text-gray-600 mb-6">
        Control what strangers see when they tap the NFC chip or scan the QR code.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-8"
      >
        <fieldset>
          <legend className="text-base font-semibold text-gray-900 mb-3">Public fields</legend>
          <div className="space-y-3">
            {(
              [
                ['name', 'Show pet name'],
                ['species', 'Show species'],
                ['breed', 'Show breed'],
                ['photo', 'Show primary photo'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={formData.public_fields[key]}
                  onChange={(e) => setField(key, e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-base font-semibold text-gray-900 mb-1">Contact options</legend>
          <p className="text-xs text-gray-500 mb-3">
            Call / WhatsApp need a phone number on your account profile. Chat stays anonymous.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={formData.allow_call}
                onChange={(e) => setFormData({ ...formData, allow_call: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Allow phone calls
            </label>
            <label className="flex items-center gap-2.5 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={formData.allow_whatsapp}
                onChange={(e) => setFormData({ ...formData, allow_whatsapp: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Allow WhatsApp
            </label>
            <label className="flex items-center gap-2.5 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={formData.allow_chat}
                onChange={(e) => setFormData({ ...formData, allow_chat: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Allow masked chat
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-base font-semibold text-gray-900 mb-3">Location</legend>
          <label className="flex items-center gap-2.5 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={formData.show_city_only}
              onChange={(e) => setFormData({ ...formData, show_city_only: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Show city only (hide country)
          </label>
        </fieldset>

        <fieldset>
          <legend className="text-base font-semibold text-gray-900 mb-3">Lost mode</legend>
          <label className="flex items-center gap-2.5 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={formData.show_reward_note}
              onChange={(e) => setFormData({ ...formData, show_reward_note: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Show reward note when lost mode is on
          </label>
        </fieldset>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Privacy settings saved.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save privacy settings'}
        </button>
      </form>
    </div>
  )
}
