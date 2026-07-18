/** Download packing invoice or receipt PDF for an order the signed-in seller can access. */
export async function downloadOrderPdf(
  orderId: number | string,
  mode: 'invoice' | 'receipt' = 'invoice',
  filenameHint?: string,
): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const res = await fetch(`/api/v1/shop/orders/${orderId}/pdf?mode=${mode}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error('Download failed')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${mode}-${filenameHint || orderId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
