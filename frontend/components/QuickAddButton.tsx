'use client'

import { useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { api } from '@/lib/api'
import { getCartSessionId } from '@/lib/cart-session'

type Props = {
  variantId: number
  className?: string
}

export default function QuickAddButton({ variantId, className }: Props) {
  const { refreshCart, openDrawer } = useCart()
  const [loading, setLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (token) api.setToken(token)
      const payload: Record<string, unknown> = { variant_id: variantId, qty: 1 }
      if (!token) payload.session_id = getCartSessionId()
      await api.post('/shop/cart/items', payload)
      await refreshCart()
      openDrawer()
    } catch {
      alert('Could not add to cart')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ||
        'absolute bottom-3 right-3 bg-primary-600 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg hover:bg-primary-700 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50'
      }
    >
      {loading ? '…' : '+ Cart'}
    </button>
  )
}
