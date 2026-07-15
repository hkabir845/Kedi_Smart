export const SHIPPING_FEE = 100
export const TAX_RATE = 0.05
export const FREE_DELIVERY_THRESHOLD = 1500

export type FulfillmentType = 'delivery' | 'store_pickup'

export function calculateCartTotals(
  subtotal: number,
  fulfillment: FulfillmentType = 'delivery',
  discount = 0,
) {
  const safeDiscount = Math.min(Math.max(discount || 0, 0), subtotal)
  const taxable = Math.max(0, subtotal - safeDiscount)
  const shipping =
    fulfillment === 'store_pickup'
      ? 0
      : taxable >= FREE_DELIVERY_THRESHOLD
        ? 0
        : taxable > 0 || subtotal > 0
          ? SHIPPING_FEE
          : 0
  const tax = taxable * TAX_RATE
  const total = taxable + shipping + tax
  return { subtotal, discount: safeDiscount, shipping, tax, total }
}

export const PAYMENT_METHODS = [
  {
    value: 'COD',
    label: 'Cash on Delivery',
    desc: 'Pay when your order arrives',
    fulfillment: 'delivery' as FulfillmentType,
  },
  {
    value: 'SSLCOMMERZ',
    label: 'Card / Mobile Banking',
    desc: 'Pay securely via SSLCommerz (cards, bKash, Nagad apps)',
    fulfillment: 'delivery' as FulfillmentType,
  },
  {
    value: 'BKASH',
    label: 'bKash (manual)',
    desc: 'Send money — we verify your Txn ID',
    fulfillment: 'delivery' as FulfillmentType,
  },
  {
    value: 'NAGAD',
    label: 'Nagad (manual)',
    desc: 'Send money — we verify your Txn ID',
    fulfillment: 'delivery' as FulfillmentType,
  },
  {
    value: 'STORE_PICKUP',
    label: 'Store pickup',
    desc: 'Collect & pay at Gulshan store',
    fulfillment: 'store_pickup' as FulfillmentType,
  },
] as const
