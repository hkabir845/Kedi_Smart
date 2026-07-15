'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart-context'

export default function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, removeItem, itemCount } = useCart()

  if (!drawerOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={closeDrawer}
        aria-hidden
      />
      <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col animate-slide-in safe-bottom">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold">Your Cart ({itemCount})</h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cart.items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🛒</div>
              <p className="text-gray-600 mb-4">Your cart is empty</p>
              <Link
                href="/shop"
                onClick={closeDrawer}
                className="inline-block bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.id} className="flex gap-3 border-b border-gray-100 pb-4">
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                  {item.variant?.product?.title ? '📦' : '🐾'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2">
                    {item.variant?.product?.title || 'Product'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Qty: {item.qty}</p>
                  <p className="text-sm font-semibold text-primary-600 mt-1">
                    {item.variant?.currency || 'BDT'}{' '}
                    {(parseFloat(item.variant?.price || '0') * item.qty).toFixed(0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 text-sm hover:text-red-700 shrink-0"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="border-t px-5 py-4 space-y-3 bg-gray-50">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-bold">BDT {cart.subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping (est.)</span>
              <span>BDT 100</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="block w-full text-center bg-primary-600 text-white py-3.5 min-h-[48px] rounded-xl font-semibold hover:bg-primary-700"
            >
              Checkout
            </Link>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="block w-full text-center text-primary-600 py-2 text-sm font-medium hover:underline"
            >
              View full cart
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
