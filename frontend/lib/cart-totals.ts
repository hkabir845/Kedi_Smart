export const SHIPPING_FEE = 120
export const TAX_RATE = 0.05
export const FREE_DELIVERY_THRESHOLD = 1500
export const INSIDE_CITY_SHIPPING = 0

/** Default metro / Dhaka-area cities with free (or inside-city) delivery. */
export const DEFAULT_FREE_CITIES = [
  'dhaka',
  'gulshan',
  'banani',
  'dhanmondi',
  'mirpur',
  'uttara',
  'mohammadpur',
  'motijheel',
]

export type FulfillmentType = 'delivery' | 'store_pickup'

export type ShippingConfig = {
  free_delivery_cities?: string[]
  inside_city_shipping?: number
  outside_city_shipping?: number
  free_delivery_threshold?: number
  tax_rate?: number
}

export function isFreeDeliveryCity(city: string | undefined | null, cities?: string[]): boolean {
  if (!city) return false
  const needle = city.trim().toLowerCase()
  if (!needle) return false
  const list = (cities?.length ? cities : DEFAULT_FREE_CITIES).map((c) => c.toLowerCase())
  return list.some((free) => needle === free || needle.includes(free) || free.includes(needle))
}

/**
 * Daraz-style BD courier:
 * pickup free · free over threshold · free/low inside metro · charged outside.
 */
export function calculateCartTotals(
  subtotal: number,
  fulfillment: FulfillmentType = 'delivery',
  discount = 0,
  city?: string,
  config?: ShippingConfig,
) {
  const threshold = config?.free_delivery_threshold ?? FREE_DELIVERY_THRESHOLD
  const inside = config?.inside_city_shipping ?? INSIDE_CITY_SHIPPING
  const outside = config?.outside_city_shipping ?? SHIPPING_FEE
  const taxRate = config?.tax_rate ?? TAX_RATE

  const safeDiscount = Math.min(Math.max(discount || 0, 0), subtotal)
  const taxable = Math.max(0, subtotal - safeDiscount)

  let shipping = 0
  let shippingNote = 'free'
  if (fulfillment === 'store_pickup') {
    shipping = 0
    shippingNote = 'store_pickup'
  } else if (taxable >= threshold) {
    shipping = 0
    shippingNote = 'threshold'
  } else if (isFreeDeliveryCity(city, config?.free_delivery_cities)) {
    shipping = inside
    shippingNote = inside > 0 ? 'inside_city' : 'inside_city_free'
  } else if (taxable > 0 || subtotal > 0) {
    shipping = outside
    shippingNote = 'outside_city'
  }

  const tax = taxable * taxRate
  const total = taxable + shipping + tax
  return {
    subtotal,
    discount: safeDiscount,
    shipping,
    tax,
    total,
    shippingNote,
    freeDeliveryCity: isFreeDeliveryCity(city, config?.free_delivery_cities),
  }
}

export function shippingLabel(totals: ReturnType<typeof calculateCartTotals>): string {
  switch (totals.shippingNote) {
    case 'store_pickup':
      return 'Store pickup — free'
    case 'threshold':
      return 'Free delivery (order threshold)'
    case 'inside_city_free':
      return 'Free delivery (inside city)'
    case 'inside_city':
      return `Inside-city courier · BDT ${totals.shipping.toFixed(0)}`
    case 'outside_city':
      return `Outside-city courier · BDT ${totals.shipping.toFixed(0)}`
    default:
      return totals.shipping === 0 ? 'Free' : `BDT ${totals.shipping.toFixed(0)}`
  }
}

export const PAYMENT_METHODS = [
  {
    value: 'COD',
    label: 'Cash on Delivery',
    desc: 'Cash on delivery — pay only when you receive the order',
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
