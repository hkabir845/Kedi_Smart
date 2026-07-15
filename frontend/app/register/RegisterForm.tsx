'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import KediSmartLogo from '@/components/KediSmartLogo'
import {
  REGISTER_ACCOUNT_TYPES,
  RegisterRole,
  parseRegisterRole,
  resolvePostRegisterPath,
  ROLE_LABELS,
} from '@/lib/auth-routes'
import { api } from '@/lib/api'

export default function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = parseRegisterRole(searchParams.get('role'))
  const sellerSubtype = searchParams.get('seller') as 'TRADER' | 'SHELTER' | null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const effectiveRole: RegisterRole =
    role === 'BREEDER' && sellerSubtype === 'TRADER'
      ? 'TRADER'
      : role === 'BREEDER' && sellerSubtype === 'SHELTER'
        ? 'SHELTER'
        : role

  const accountType =
    REGISTER_ACCOUNT_TYPES.find((t) => t.role === role) || REGISTER_ACCOUNT_TYPES[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/register', {
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName,
        phone,
        role: effectiveRole,
      })
      if (response.access_token) {
        api.setSession(response.access_token, response.refresh_token)
      }

      const next = searchParams.get('next')
      const destination =
        next && next.startsWith('/') && !next.startsWith('//')
          ? next
          : resolvePostRegisterPath(response.user?.role || effectiveRole)

      router.push(destination)
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <KediSmartLogo variant="full" size="md" link={false} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600">{accountType.description}</p>
          <p className="mt-1 text-xs font-medium text-primary-700 uppercase tracking-wide">
            {ROLE_LABELS[effectiveRole] || effectiveRole} account
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REGISTER_ACCOUNT_TYPES.map((type) => {
            const active = type.role === role
            const href = type.query ? `/register?${type.query}` : '/register'
            return (
              <Link
                key={type.role}
                href={href}
                className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary-600 bg-primary-50 text-primary-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300'
                }`}
              >
                {type.label}
              </Link>
            )
          })}
        </div>

        {role === 'BREEDER' && (
          <div className="flex gap-2 justify-center text-sm">
            <Link
              href="/register?role=BREEDER"
              className={`px-3 py-1 rounded-full border ${
                !sellerSubtype ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-200'
              }`}
            >
              Breeder
            </Link>
            <Link
              href="/register?role=BREEDER&seller=TRADER"
              className={`px-3 py-1 rounded-full border ${
                sellerSubtype === 'TRADER' ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-200'
              }`}
            >
              Trader
            </Link>
            <Link
              href="/register?role=BREEDER&seller=SHELTER"
              className={`px-3 py-1 rounded-full border ${
                sellerSubtype === 'SHELTER' ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-200'
              }`}
            >
              Shelter
            </Link>
          </div>
        )}

        <form className="bg-white rounded-lg shadow p-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>
          </div>

          {role === 'VENDOR' && (
            <p className="text-sm text-gray-500 bg-amber-50 border border-amber-100 rounded-md p-3">
              After sign-up you&apos;ll set up your shop profile. Platform admin approval is required before
              products go live.
            </p>
          )}

          {role === 'VET' && (
            <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-md p-3">
              Complete your vet profile and submit verification documents to appear in the public vet directory.
            </p>
          )}

          {(role === 'BREEDER' || effectiveRole === 'TRADER' || effectiveRole === 'SHELTER') && (
            <p className="text-sm text-gray-500 bg-green-50 border border-green-100 rounded-md p-3">
              You can create live-animal listings after registration. Listings are reviewed before publishing.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : `Create ${ROLE_LABELS[effectiveRole] || 'account'}`}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 hover:text-primary-500 font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
