'use client'

import { useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { api } from '@/lib/api'
import { getCartSessionId } from '@/lib/cart-session'

type Props = {
  variantId: number
  className?: string
  label?: string
  showDrawer?: boolean
  qty?: number
}

export default function AddToCartButton({
  variantId,
  className,
  label = 'Add to Cart',
  showDrawer = true,
  qty = 1,
}: Props) {
  const { refreshCart, openDrawer } = useCart()
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  const handleAdd = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (token) api.setToken(token)

      const payload: Record<string, unknown> = { variant_id: variantId, qty }
      if (!token) payload.session_id = getCartSessionId()

      await api.post('/shop/cart/items', payload)
      await refreshCart()
      setAdded(true)
      if (showDrawer) openDrawer()
      setTimeout(() => setAdded(false), 2000)
    } catch {
      alert('Could not add to cart. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={loading}
      className={
        className ||
        'w-full sm:w-auto bg-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg shadow-primary-600/20'
      }
    >
      {loading ? 'Adding...' : added ? '✓ Added!' : label}
    </button>
  )
}
