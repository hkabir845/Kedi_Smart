import { getApiOrigin } from '@/lib/auth-routes'

/**
 * Resolve product/media URLs for the browser.
 * - Absolute http(s) URLs are unchanged
 * - /uploads/... and other API media paths point at the Django origin
 * - /samples/... stay on the Next.js public folder
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed
  }
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return `${getApiOrigin()}${path}`
  }
  return trimmed
}
