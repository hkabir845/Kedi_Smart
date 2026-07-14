export const SHIPPING_FEE = 100
export const TAX_RATE = 0.05
export const FREE_DELIVERY_THRESHOLD = 1500

export type FulfillmentType = 'delivery' | 'store_pickup'

export function calculateCartTotals(
  subtotal: number,
  fulfillment: FulfillmentType = 'delivery',
) {
  const shipping =
    fulfillment === 'store_pickup'
      ? 0
      : subtotal >= FREE_DELIVERY_THRESHOLD
        ? 0
        : subtotal > 0
          ? SHIPPING_FEE
          : 0
  const tax = subtotal * TAX_RATE
  const total = subtotal + shipping + tax
  return { subtotal, shipping, tax, total }
}

export const PAYMENT_METHODS = [
  {
    value: 'COD',
    label: 'Cash on Delivery',
    desc: 'Pay when your order arrives',
    fulfillment: 'delivery' as FulfillmentType,
  },
  {
    value: 'BKASH',
    label: 'bKash',
    desc: 'Send money — we verify your Txn ID',
    fulfillment: 'delivery' as FulfillmentType,
  },
  {
    value: 'NAGAD',
    label: 'Nagad',
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
