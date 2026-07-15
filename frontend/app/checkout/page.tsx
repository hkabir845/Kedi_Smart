'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getCartSessionId } from '@/lib/cart-session'
import { useCart } from '@/lib/cart-context'
import { calculateCartTotals, PAYMENT_METHODS, type FulfillmentType } from '@/lib/cart-totals'

type CheckoutMode = 'register' | 'login'

type UserProfile = {
  full_name?: string
  phone?: string
  address?: string
  city?: string
  country?: string
}

const inputClass =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:outline-none'

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, refreshCart } = useCart()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [mode, setMode] = useState<CheckoutMode>('register')
  const [showPassword, setShowPassword] = useState(false)

  const [account, setAccount] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [shipping, setShipping] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    country: 'Bangladesh',
    notes: '',
    payment_method: 'COD',
    wallet_txn_id: '',
    wallet_phone: '',
  })
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponLabel, setCouponLabel] = useState('')
  const [couponMsg, setCouponMsg] = useState('')
  const [payOptions, setPayOptions] = useState<{
    methods?: { value: string; label: string; fulfillment: string }[]
    bkash_number?: string
    nagad_number?: string
    pickup_address?: string
    sslcommerz_enabled?: boolean
  } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) api.setToken(token)

    const load = async () => {
      try {
        if (token) {
          const me = await api.get('/auth/me')
          setIsLoggedIn(true)
          setUserEmail(me.email || '')
          const profile: UserProfile = me.profile || {}
          setShipping((prev) => ({
            ...prev,
            name: profile.full_name || prev.name,
            phone: profile.phone || prev.phone,
            address: profile.address || prev.address,
            city: profile.city || prev.city,
            country: profile.country || prev.country,
            wallet_phone: profile.phone || prev.wallet_phone,
          }))
        }
      } catch {
        setIsLoggedIn(false)
      } finally {
        await refreshCart()
        api.get('/shop/payment-options').then(setPayOptions).catch(() => setPayOptions(null))
        setLoading(false)
      }
    }
    load()
  }, [refreshCart])

  const paymentMethods = (payOptions?.methods?.length
    ? payOptions.methods.map((m) => {
        const fallback = PAYMENT_METHODS.find((p) => p.value === m.value)
        return {
          value: m.value,
          label: m.label,
          desc: fallback?.desc || m.label,
          fulfillment: (m.fulfillment as FulfillmentType) || 'delivery',
        }
      })
    : PAYMENT_METHODS.filter((m) => m.value !== 'SSLCOMMERZ' || payOptions?.sslcommerz_enabled)
  ) as typeof PAYMENT_METHODS | Array<{
    value: string
    label: string
    desc: string
    fulfillment: FulfillmentType
  }>

  const selectedPayment =
    paymentMethods.find((m) => m.value === shipping.payment_method) || paymentMethods[0]
  const fulfillment: FulfillmentType = selectedPayment.fulfillment
  const isPickup = fulfillment === 'store_pickup'
  const isWallet = shipping.payment_method === 'BKASH' || shipping.payment_method === 'NAGAD'
  const totals = calculateCartTotals(cart.subtotal, fulfillment, couponDiscount)

  const applyCoupon = async () => {
    setCouponMsg('')
    if (!couponCode.trim()) {
      setCouponDiscount(0)
      setCouponLabel('')
      return
    }
    try {
      const res = await api.post('/shop/coupons/validate', {
        code: couponCode.trim(),
        subtotal: cart.subtotal,
      })
      setCouponDiscount(Number(res.discount || 0))
      setCouponLabel(res.code || couponCode.trim().toUpperCase())
      setCouponMsg(`Coupon applied — save BDT ${Number(res.discount || 0).toLocaleString()}`)
    } catch (err: unknown) {
      setCouponDiscount(0)
      setCouponLabel('')
      setCouponMsg(err instanceof Error ? err.message : 'Invalid coupon')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isLoggedIn && mode === 'register') {
      if (account.password.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }
      if (account.password !== account.confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('access_token')
      const orderData: Record<string, unknown> = {
        shipping_address: {
          name: shipping.name,
          phone: shipping.phone,
          address: shipping.address,
          city: shipping.city,
          country: shipping.country,
          notes: shipping.notes,
        },
        payment_method: shipping.payment_method,
        fulfillment_type: fulfillment,
        wallet_txn_id: shipping.wallet_txn_id || undefined,
        wallet_phone: shipping.wallet_phone || shipping.phone,
        coupon_code: couponLabel || couponCode || undefined,
      }

      if (!token) {
        orderData.session_id = getCartSessionId()
        if (mode === 'register') {
          orderData.create_account = {
            email: account.email,
            password: account.password,
            full_name: shipping.name,
            phone: shipping.phone,
          }
        } else {
          orderData.login = {
            email: account.email,
            password: account.password,
          }
        }
      }

      const order = await api.post('/shop/checkout', orderData)

      if (order.auth?.access_token) {
        api.setSession(order.auth.access_token, order.auth.refresh_token)
        setIsLoggedIn(true)
      }

      await refreshCart()
      sessionStorage.setItem(`order_${order.id}`, JSON.stringify(order))
      if (order.track_token) {
        localStorage.setItem(`track_token_${order.id}`, order.track_token)
      }

      if (order.gateway_url) {
        window.location.href = order.gateway_url
        return
      }
      if (order.gateway_error) {
        setError(order.gateway_error)
      }

      router.push(`/order/confirmation/${order.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Checkout failed'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-gray-500">Loading checkout...</div>
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <p className="text-gray-600 mb-4">Your cart is empty.</p>
        <Link href="/shop" className="text-primary-600 font-medium hover:underline">
          Continue shopping
        </Link>
      </div>
    )
  }

  const { subtotal, discount, shipping: shippingFee, tax, total } = totals

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/cart" className="hover:text-primary-600">
          Cart
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">Checkout</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
      <p className="text-gray-600 mb-8">
        {isLoggedIn
          ? `Signed in as ${userEmail}. Confirm to get your order receipt instantly.`
          : 'Create an account or sign in. Your receipt is created as soon as you confirm.'}
      </p>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {!isLoggedIn && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Your account</h2>
              <p className="text-sm text-gray-500 mb-5">
                Save your details to view receipts and order history.
              </p>

              <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                    mode === 'register' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                    mode === 'login' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Sign in
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className={inputClass}
                    value={account.email}
                    onChange={(e) => setAccount({ ...account, email: e.target.value })}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      className={`${inputClass} pr-11`}
                      value={account.password}
                      onChange={(e) => setAccount({ ...account, password: e.target.value })}
                      placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 text-sm"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                {mode === 'register' && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password *</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      className={inputClass}
                      value={account.confirmPassword}
                      onChange={(e) => setAccount({ ...account, confirmPassword: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {isPickup ? 'Contact for pickup' : 'Delivery address'}
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                <input
                  required
                  className={inputClass}
                  value={shipping.name}
                  onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                  placeholder="Receiver name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  required
                  type="tel"
                  className={inputClass}
                  value={shipping.phone}
                  onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              {!isPickup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    required
                    className={inputClass}
                    value={shipping.city}
                    onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    placeholder="Dhaka"
                  />
                </div>
              )}
              {!isPickup && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street address *</label>
                  <textarea
                    required
                    rows={3}
                    className={inputClass}
                    value={shipping.address}
                    onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                    placeholder="House, road, area"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  className={inputClass}
                  value={shipping.notes}
                  onChange={(e) => setShipping({ ...shipping, notes: e.target.value })}
                  placeholder={isPickup ? 'Preferred pickup time' : 'Landmark, gate code, etc.'}
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment & fulfillment</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {paymentMethods.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    shipping.payment_method === opt.value
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment_method"
                      value={opt.value}
                      checked={shipping.payment_method === opt.value}
                      onChange={() => setShipping({ ...shipping, payment_method: opt.value })}
                    />
                    <span className="font-semibold text-gray-900 text-sm">{opt.label}</span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 ml-6">{opt.desc}</span>
                  {opt.value === 'BKASH' && payOptions?.bkash_number && (
                    <span className="text-xs text-primary-700 mt-1 ml-6 font-medium">
                      Send to {payOptions.bkash_number}
                    </span>
                  )}
                  {opt.value === 'NAGAD' && payOptions?.nagad_number && (
                    <span className="text-xs text-primary-700 mt-1 ml-6 font-medium">
                      Send to {payOptions.nagad_number}
                    </span>
                  )}
                  {opt.value === 'STORE_PICKUP' && payOptions?.pickup_address && (
                    <span className="text-xs text-gray-600 mt-1 ml-6">{payOptions.pickup_address}</span>
                  )}
                </label>
              ))}
            </div>

            {isWallet && (
              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wallet phone <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    className={inputClass}
                    value={shipping.wallet_phone}
                    onChange={(e) => setShipping({ ...shipping, wallet_phone: e.target.value })}
                    placeholder="bKash / Nagad number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Txn ID <span className="text-gray-400 font-normal">(optional now)</span>
                  </label>
                  <input
                    className={inputClass}
                    value={shipping.wallet_txn_id}
                    onChange={(e) => setShipping({ ...shipping, wallet_txn_id: e.target.value })}
                    placeholder="Add after sending money"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit lg:sticky lg:top-24">
          <h2 className="font-bold text-gray-900 mb-4">Order summary</h2>
          <ul className="space-y-3 text-sm mb-4 max-h-52 overflow-y-auto">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="text-gray-700 line-clamp-2">{item.variant?.product?.title}</span>
                <span className="shrink-0 text-gray-500">×{item.qty}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
            <div className="flex gap-2 mb-3">
              <input
                className={inputClass}
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              />
              <button
                type="button"
                onClick={applyCoupon}
                className="shrink-0 px-4 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50"
              >
                Apply
              </button>
            </div>
            {couponMsg && (
              <p className={`text-xs mb-2 ${couponDiscount > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {couponMsg}
              </p>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>BDT {subtotal.toFixed(0)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount{couponLabel ? ` (${couponLabel})` : ''}</span>
                <span>− BDT {discount.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">{isPickup ? 'Pickup' : 'Shipping'}</span>
              <span>{shippingFee === 0 ? 'Free' : `BDT ${shippingFee}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax (5%)</span>
              <span>BDT {tax.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>BDT {total.toFixed(0)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 bg-primary-600 text-white py-3.5 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {submitting
              ? 'Confirming…'
              : shipping.payment_method === 'SSLCOMMERZ'
                ? 'Pay securely with SSLCommerz'
                : 'Confirm order & get receipt'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-4">
            Free delivery on orders over BDT 1,500 · Stock held in cart for ~30 minutes
          </p>
        </aside>
      </form>
    </div>
  )
}
