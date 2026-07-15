'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import KediSmartLogo from '@/components/KediSmartLogo'

type Step = 'email' | 'otp'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
      setInfo(res.message || 'If that email is registered, a 6-digit OTP has been sent.')
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const resetWithOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit code from your email')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        new_password: password,
      })
      setInfo('Password updated. Redirecting to sign in…')
      setTimeout(() => router.push('/login'), 1500)
    } catch (err: any) {
      setError(err.message || 'Could not reset password')
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
          <h2 className="text-center text-2xl font-extrabold text-gray-900">
            {step === 'email' ? 'Forgot password' : 'Enter OTP'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'email'
              ? 'We will email a 6-digit code to verify it is you.'
              : `Enter the code sent to ${email}, then choose a new password.`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm">
            {info}
          </div>
        )}

        {step === 'email' ? (
          <form className="space-y-5" onSubmit={sendOtp}>
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
                className={field}
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send email OTP'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={resetWithOtp}>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                6-digit OTP
              </label>
              <input
                id="otp"
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
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={field}
              />
              <p className="text-xs text-gray-500 mt-1">At least 8 characters with letters and numbers.</p>
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
                Confirm new password
              </label>
              <input
                id="confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={field}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Reset password'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => sendOtp()}
              className="w-full py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Resend OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setOtp('')
                setPassword('')
                setConfirmPassword('')
                setError('')
                setInfo('')
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-800"
            >
              Use a different email
            </button>
          </form>
        )}

        <div className="text-center">
          <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
