'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import KediSmartLogo from '@/components/KediSmartLogo'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const legacyToken = searchParams.get('token') || ''

  useEffect(() => {
    const qEmail = searchParams.get('email') || ''
    const qOtp = searchParams.get('otp') || ''
    if (qEmail) setEmail(qEmail)
    if (qOtp) setOtp(qOtp)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, string> = { new_password: password }
      if (legacyToken && !otp) {
        payload.token = legacyToken
        if (email) payload.email = email.trim().toLowerCase()
      } else {
        payload.email = email.trim().toLowerCase()
        payload.otp = otp.trim()
      }
      await api.post('/auth/reset-password', payload)
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const field =
    'mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 text-sm'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full space-y-6 p-6 sm:p-8 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-center">
          <KediSmartLogo variant="full" size="md" link={false} />
        </div>
        <div>
          <h2 className="text-center text-2xl font-extrabold text-gray-900">Set new password</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Use the OTP from your email (or the reset link you opened).
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm">
              Password reset successfully! Redirecting to login…
            </div>
          )}

          {!legacyToken && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">6-digit OTP</label>
                <input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${field} tracking-[0.35em] text-center text-lg font-semibold`}
                  placeholder="000000"
                />
              </div>
            </>
          )}

          {legacyToken && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Reset link verified. Choose a new password below.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={field}
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Resetting…' : 'Reset password'}
          </button>

          <div className="text-center space-y-2">
            <Link href="/forgot-password" className="block text-sm text-primary-600 hover:text-primary-700">
              Request a new OTP
            </Link>
            <Link href="/login" className="block text-sm text-gray-500 hover:text-gray-800">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
