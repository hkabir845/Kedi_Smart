'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/cart-context'
import { calculateCartTotals } from '@/lib/cart-totals'

export default function CartPage() {
  const { cart, loading, removeItem, refreshCart } = useCart()

  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  const { subtotal, shipping, tax, total } = calculateCartTotals(cart.subtotal)

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500">Loading cart...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
      <p className="text-gray-500 mb-8">{cart.items.length} item(s)</p>

      {cart.items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Discover pet essentials and general products.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/shop" className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700">
              Shop Pet Products
            </Link>
            <Link href="/shop?catalog=general" className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700">
              Shop General
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4 shadow-sm"
              >
                <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-3xl shrink-0">
                  {item.variant?.product?.title ? '📦' : '🐾'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg line-clamp-2">
                    {item.variant?.product?.title || 'Product'}
                  </h3>
                  {item.variant?.product?.brand && (
                    <p className="text-sm text-gray-500">{item.variant.product.brand}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">Quantity: {item.qty}</p>
                  <p className="text-lg font-bold text-primary-600 mt-2">
                    {item.variant?.currency || 'BDT'}{' '}
                    {((parseFloat(item.variant?.price || '0')) * item.qty).toFixed(0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 text-sm font-medium hover:text-red-700 h-fit"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-fit sticky top-24">
            <h2 className="font-bold text-lg mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">BDT {cart.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>BDT {shipping}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (5%)</span>
                <span>BDT {tax.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-3 border-t">
                <span>Total</span>
                <span className="text-primary-600">BDT {total.toFixed(0)}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="mt-6 block w-full text-center bg-primary-600 text-white py-3.5 rounded-xl font-semibold hover:bg-primary-700 shadow-lg shadow-primary-600/20"
            >
              Proceed to Checkout
            </Link>
            <Link href="/shop" className="mt-3 block text-center text-sm text-primary-600 hover:underline">
              Continue shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
