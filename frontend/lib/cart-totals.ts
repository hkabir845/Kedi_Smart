export const SHIPPING_FEE = 100
export const TAX_RATE = 0.05

export function calculateCartTotals(subtotal: number) {
  const shipping = subtotal > 0 ? SHIPPING_FEE : 0
  const tax = subtotal * TAX_RATE
  const total = subtotal + shipping + tax
  return { subtotal, shipping, tax, total }
}
