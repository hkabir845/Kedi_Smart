/** Normalize phone for tel: / wa.me (BD local 01… → 8801…). */
export function toWhatsAppDigits(phone?: string | null): string {
  if (!phone) return ''
  let digits = String(phone).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `880${digits.slice(1)}`
  } else if (!digits.startsWith('880') && digits.length === 10 && digits.startsWith('1')) {
    digits = `880${digits}`
  }
  return digits
}
