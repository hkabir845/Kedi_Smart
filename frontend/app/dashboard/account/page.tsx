'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { PanelNotice, SectionHeading } from '@/components/control-centre/PanelPrimitives'

const field =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500'

export default function AccountSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    city: '',
    country: '',
    address: '',
    emergency_contact: '',
    bio: '',
  })
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/account')
      return
    }
    api.setToken(token)
    api
      .get('/auth/me')
      .then((me) => {
        setEmail(me.email || '')
        const p = me.profile || {}
        setForm({
          full_name: p.full_name || '',
          phone: p.phone || '',
          city: p.city || '',
          country: p.country || '',
          address: p.address || '',
          emergency_contact: p.emergency_contact || '',
          bio: p.bio || '',
        })
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.put('/users/me/profile', form)
      setMessage('Profile saved.')
    } catch (err: any) {
      setError(err.message || 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwdSaving(true)
    setError('')
    setMessage('')
    if (passwords.new_password !== passwords.confirm_password) {
      setError('New passwords do not match')
      setPwdSaving(false)
      return
    }
    try {
      await api.post('/users/me/change-password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      })
      setPasswords({ current_password: '', new_password: '', confirm_password: '' })
      setMessage('Password updated. Sign in again on other devices if needed.')
    } catch (err: any) {
      setError(err.message || 'Could not update password')
    } finally {
      setPwdSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading account...</div>
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Account settings</h2>
        <p className="text-sm text-gray-600">
          Keep your contact details current for orders, appointments, and payouts.
        </p>
      </div>

      {message && <PanelNotice tone="success">{message}</PanelNotice>}
      {error && <PanelNotice tone="warning">{error}</PanelNotice>}

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <SectionHeading title="Profile" />
        <p className="text-sm text-gray-500 mb-4">Signed in as {email}</p>
        <form onSubmit={saveProfile} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              className={field}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              className={field}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              className={field}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input
              className={field}
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency contact</label>
            <input
              className={field}
              value={form.emergency_contact}
              onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              className={field}
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              className={field}
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <SectionHeading title="Change password" />
        <form onSubmit={changePassword} className="grid gap-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
            <input
              type="password"
              className={field}
              value={passwords.current_password}
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input
              type="password"
              className={field}
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">At least 8 characters with letters and numbers.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
            <input
              type="password"
              className={field}
              value={passwords.confirm_password}
              onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
              required
            />
          </div>
          <button
            type="submit"
            disabled={pwdSaving}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 w-fit"
          >
            {pwdSaving ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  )
}
