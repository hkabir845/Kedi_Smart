'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { cartSessionQuery } from '@/lib/cart-session'

type CartItem = {
  id: number
  qty: number
  variant_id: number
  variant?: {
    id: number
    price: string
    currency: string
    product?: { title: string; slug: string; brand?: string }
  }
}

type CartState = {
  items: CartItem[]
  subtotal: number
}

type CartContextValue = {
  cart: CartState
  itemCount: number
  loading: boolean
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  refreshCart: () => Promise<void>
  removeItem: (itemId: number) => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>({ items: [], subtotal: 0 })
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const refreshCart = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      if (token) api.setToken(token)
      const data = await api.get(`/shop/cart${cartSessionQuery()}`)
      setCart({ items: data?.items || [], subtotal: data?.subtotal || 0 })
    } catch {
      setCart({ items: [], subtotal: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  const removeItem = useCallback(
    async (itemId: number) => {
      await api.delete(`/shop/cart/items/${itemId}${cartSessionQuery()}`)
      await refreshCart()
    },
    [refreshCart]
  )

  const itemCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + (item.qty || 0), 0),
    [cart.items]
  )

  const value = useMemo(
    () => ({
      cart,
      itemCount,
      loading,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      refreshCart,
      removeItem,
    }),
    [cart, itemCount, loading, drawerOpen, refreshCart, removeItem]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
