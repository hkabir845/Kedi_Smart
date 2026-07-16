'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import PetTagManager from '@/components/nfc/PetTagManager'
import PetLostModePanel from '@/components/nfc/PetLostModePanel'
import PetMessagesInbox from '@/components/nfc/PetMessagesInbox'
import PetFoundReportsInbox from '@/components/nfc/PetFoundReportsInbox'
import PetPhotoManager from '@/components/nfc/PetPhotoManager'
import PetImage from '@/components/PetImage'

export default function PetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const petId = String(params.id)
  const [pet, setPet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [primaryPhoto, setPrimaryPhoto] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    species: '',
    breed: '',
    gender: 'unknown',
    age_text: '',
    color_markings: '',
    instructions_if_found: '',
  })

  const load = useCallback(async () => {
    const data = await api.get(`/pets/${petId}`)
    setPet(data)
    setForm({
      name: data.name || '',
      species: data.species || '',
      breed: data.breed || '',
      gender: data.gender || 'unknown',
      age_text: data.age_text || '',
      color_markings: data.color_markings || '',
      instructions_if_found: data.instructions_if_found || '',
    })
  }, [petId])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push(`/login?next=/dashboard/pets/${petId}`)
      return
    }

    api.setToken(token)
    load()
      .catch(() => router.push('/dashboard/pets'))
      .finally(() => setLoading(false))
  }, [petId, router, load])

  useEffect(() => {
    if (loading || !pet) return
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : ''
    if (!hash) return
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [loading, pet])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const updated = await api.put(`/pets/${petId}`, form)
      setPet(updated)
      setEditing(false)
    } catch (err: any) {
      setError(err.message || 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500 py-8">Loading pet…</div>
  }

  if (!pet) {
    return null
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/dashboard/pets"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 mb-3 inline-block"
        >
          ← Back to pets
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-24 h-24 rounded-xl bg-gray-100 border border-gray-100 overflow-hidden flex items-center justify-center shrink-0">
            {primaryPhoto ? (
              <PetImage
                src={primaryPhoto}
                alt={pet.name}
                fit="contain"
                className="max-w-full max-h-full w-auto h-auto"
                fallbackClassName="w-full h-full"
              />
            ) : (
              <span className="text-2xl text-gray-300">🐾</span>
            )}
          </div>
          <div className="flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{pet.name}</h1>
              <p className="text-sm text-gray-600 mt-1 capitalize">
                {pet.species}
                {pet.breed ? ` · ${pet.breed}` : ''}
                {pet.gender ? ` · ${pet.gender}` : ''}
                {pet.age_text ? ` · ${pet.age_text}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="inline-flex px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200"
              >
                {editing ? 'Cancel edit' : 'Edit profile'}
              </button>
              <Link
                href={`/dashboard/pets/${petId}/medical`}
                className="inline-flex px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
              >
                Medical
              </Link>
              <Link
                href={`/dashboard/pets/${petId}/privacy`}
                className="inline-flex px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={save}
          className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Edit profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                ['name', 'Name'],
                ['species', 'Species'],
                ['breed', 'Breed'],
                ['gender', 'Gender'],
                ['age_text', 'Age'],
                ['color_markings', 'Color / markings'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm font-medium text-gray-800">
                {label}
                <input
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                  required={key === 'name' || key === 'species'}
                />
              </label>
            ))}
          </div>
          <label className="block text-sm font-medium text-gray-800">
            If found instructions
            <textarea
              value={form.instructions_if_found}
              onChange={(e) => setForm({ ...form, instructions_if_found: e.target.value })}
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      ) : (
        <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Profile</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Species</dt>
              <dd className="text-gray-900 capitalize font-medium">{pet.species}</dd>
            </div>
            {pet.breed && (
              <div>
                <dt className="text-gray-500">Breed</dt>
                <dd className="text-gray-900 font-medium">{pet.breed}</dd>
              </div>
            )}
            {pet.gender && (
              <div>
                <dt className="text-gray-500">Gender</dt>
                <dd className="text-gray-900 capitalize font-medium">{pet.gender}</dd>
              </div>
            )}
            {pet.age_text && (
              <div>
                <dt className="text-gray-500">Age</dt>
                <dd className="text-gray-900 font-medium">{pet.age_text}</dd>
              </div>
            )}
            {pet.color_markings && (
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Color / markings</dt>
                <dd className="text-gray-900 font-medium">{pet.color_markings}</dd>
              </div>
            )}
            {pet.instructions_if_found && (
              <div className="sm:col-span-2">
                <dt className="text-gray-500">If found instructions</dt>
                <dd className="text-gray-900 whitespace-pre-wrap">{pet.instructions_if_found}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <div id="photos">
        <PetPhotoManager petId={petId} onPrimaryChange={setPrimaryPhoto} />
      </div>
      <div id="nfc-tags">
        <PetTagManager petId={petId} />
      </div>
      <div id="lost-mode">
        <PetLostModePanel petId={petId} petName={pet.name} />
      </div>
      <div id="finder-messages">
        <PetMessagesInbox petId={petId} />
      </div>
      <div id="found-reports">
        <PetFoundReportsInbox petId={petId} />
      </div>
    </div>
  )
}
