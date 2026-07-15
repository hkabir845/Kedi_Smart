'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

const field =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500'

export default function PetMedicalPage() {
  const router = useRouter()
  const params = useParams()
  const petId = params.id
  const [records, setRecords] = useState<any[]>([])
  const [vaccinations, setVaccinations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showVaxForm, setShowVaxForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    type: 'checkup',
    title: '',
    notes: '',
    record_date: new Date().toISOString().slice(0, 10),
  })
  const [vaxForm, setVaxForm] = useState({
    vaccine_name: '',
    date_given: new Date().toISOString().slice(0, 10),
    next_due_date: '',
    notes: '',
  })

  const load = async () => {
    const [medical, vax] = await Promise.all([
      api.get(`/pets/${petId}/medical-records`),
      api.get(`/pets/${petId}/vaccinations`).catch(() => []),
    ])
    setRecords(Array.isArray(medical) ? medical : [])
    setVaccinations(Array.isArray(vax) ? vax : [])
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    load()
      .catch(() => router.push(`/dashboard/pets/${petId}`))
      .finally(() => setLoading(false))
  }, [petId, router])

  const addRecord = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post(`/pets/${petId}/medical-records`, form)
      setShowForm(false)
      setForm({
        type: 'checkup',
        title: '',
        notes: '',
        record_date: new Date().toISOString().slice(0, 10),
      })
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not save record')
    } finally {
      setSaving(false)
    }
  }

  const addVaccination = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post(`/pets/${petId}/vaccinations`, {
        ...vaxForm,
        next_due_date: vaxForm.next_due_date || null,
      })
      setShowVaxForm(false)
      setVaxForm({
        vaccine_name: '',
        date_given: new Date().toISOString().slice(0, 10),
        next_due_date: '',
        notes: '',
      })
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not save vaccination')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading medical records...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/dashboard/pets/${petId}`}
          className="text-primary-600 hover:text-primary-700 text-sm mb-3 inline-block"
        >
          ← Back to pet
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Medical records</h2>
            <p className="text-sm text-gray-600">Track checkups, treatments, and vaccinations.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
            >
              {showForm ? 'Cancel' : '+ Add record'}
            </button>
            <button
              type="button"
              onClick={() => setShowVaxForm((v) => !v)}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              {showVaxForm ? 'Cancel' : '+ Add vaccination'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={addRecord} className="bg-white rounded-xl border border-gray-100 p-5 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className={field}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="checkup">Checkup</option>
              <option value="treatment">Treatment</option>
              <option value="surgery">Surgery</option>
              <option value="lab">Lab / test</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              className={field}
              value={form.record_date}
              onChange={(e) => setForm({ ...form, record_date: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              required
              className={field}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Annual wellness exam"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className={field}
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save record'}
            </button>
          </div>
        </form>
      )}

      {showVaxForm && (
        <form onSubmit={addVaccination} className="bg-white rounded-xl border border-gray-100 p-5 grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine name</label>
            <input
              required
              className={field}
              value={vaxForm.vaccine_name}
              onChange={(e) => setVaxForm({ ...vaxForm, vaccine_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date given</label>
            <input
              type="date"
              required
              className={field}
              value={vaxForm.date_given}
              onChange={(e) => setVaxForm({ ...vaxForm, date_given: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next due</label>
            <input
              type="date"
              className={field}
              value={vaxForm.next_due_date}
              onChange={(e) => setVaxForm({ ...vaxForm, next_due_date: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className={field}
              rows={2}
              value={vaxForm.notes}
              onChange={(e) => setVaxForm({ ...vaxForm, notes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save vaccination'}
            </button>
          </div>
        </form>
      )}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Records</h3>
        {records.length === 0 ? (
          <p className="text-sm text-gray-500">No medical records yet.</p>
        ) : (
          records.map((record) => (
            <div key={record.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h4 className="text-lg font-semibold text-gray-900">{record.title}</h4>
              <p className="text-sm text-gray-500 mt-1 capitalize">
                {record.type} · {record.record_date ? new Date(record.record_date).toLocaleDateString() : '—'}
              </p>
              {record.notes && <p className="text-sm text-gray-700 mt-2">{record.notes}</p>}
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Vaccinations</h3>
        {vaccinations.length === 0 ? (
          <p className="text-sm text-gray-500">No vaccinations logged yet.</p>
        ) : (
          vaccinations.map((vax) => (
            <div key={vax.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h4 className="text-lg font-semibold text-gray-900">{vax.vaccine_name}</h4>
              <p className="text-sm text-gray-500 mt-1">
                Given {vax.date_given ? new Date(vax.date_given).toLocaleDateString() : '—'}
                {vax.next_due_date
                  ? ` · Next due ${new Date(vax.next_due_date).toLocaleDateString()}`
                  : ''}
              </p>
              {vax.notes && <p className="text-sm text-gray-700 mt-2">{vax.notes}</p>}
            </div>
          ))
        )}
      </section>
    </div>
  )
}
