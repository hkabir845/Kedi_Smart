const CART_SESSION_KEY = 'cart_session_id'

export function getCartSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(CART_SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(CART_SESSION_KEY, id)
  }
  return id
}

export function cartSessionQuery(): string {
  const id = getCartSessionId()
  return id ? `?session_id=${encodeURIComponent(id)}` : ''
}
