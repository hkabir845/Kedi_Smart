/**
 * Internationalization (i18n) and Currency Support
 */

export type Locale = 'en' | 'bn' | 'ar' | 'hi'
export type Currency = 'BDT' | 'USD' | 'EUR' | 'INR' | 'SAR'

export interface LocaleConfig {
  code: Locale
  name: string
  nativeName: string
  currency: Currency
  currencySymbol: string
  exchangeRate: number // Exchange rate from BDT (base currency)
}

export const locales: Record<Locale, LocaleConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    currency: 'BDT',
    currencySymbol: '৳',
    exchangeRate: 1, // BDT is base currency
  },
  bn: {
    code: 'bn',
    name: 'Bangla',
    nativeName: 'বাংলা',
    currency: 'BDT',
    currencySymbol: '৳',
    exchangeRate: 1,
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    currency: 'SAR',
    currencySymbol: '﷼',
    exchangeRate: 0.035, // 1 BDT = 0.035 SAR (approximate)
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    currency: 'INR',
    currencySymbol: '₹',
    exchangeRate: 0.85, // 1 BDT = 0.85 INR (approximate)
  },
}

// Currency exchange rates (BDT as base = 1)
export const exchangeRates: Record<Currency, number> = {
  BDT: 1,
  USD: 0.0091, // 1 BDT = 0.0091 USD (approximate)
  EUR: 0.0083, // 1 BDT = 0.0083 EUR (approximate)
  INR: 0.85,
  SAR: 0.035,
}

export const currencySymbols: Record<Currency, string> = {
  BDT: '৳',
  USD: '$',
  EUR: '€',
  INR: '₹',
  SAR: '﷼',
}

/**
 * Format price based on locale and currency
 */
export function formatPrice(
  price: number | string,
  locale: Locale = 'en',
  showCurrency: boolean = true
): string {
  const localeConfig = locales[locale]
  const amount = typeof price === 'string' ? parseFloat(price) : price
  const convertedAmount = amount * localeConfig.exchangeRate
  
  // Format number with locale-appropriate formatting
  const formatted = new Intl.NumberFormat(localeConfig.code === 'bn' ? 'bn-BD' : localeConfig.code === 'ar' ? 'ar-SA' : localeConfig.code === 'hi' ? 'hi-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertedAmount)
  
  if (showCurrency) {
    return `${localeConfig.currencySymbol} ${formatted}`
  }
  return formatted
}

/**
 * Convert price from BDT to target currency
 */
export function convertCurrency(amount: number, fromCurrency: Currency, toCurrency: Currency): number {
  if (fromCurrency === toCurrency) return amount
  
  // Convert to BDT first (base currency)
  const inBDT = amount / exchangeRates[fromCurrency]
  // Convert from BDT to target currency
  return inBDT * exchangeRates[toCurrency]
}

/**
 * Get locale from browser or default to 'en'
 */
export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  
  const stored = localStorage.getItem('locale') as Locale
  if (stored && locales[stored]) return stored
  
  const browserLang = navigator.language.split('-')[0] as Locale
  if (locales[browserLang]) return browserLang
  
  return 'en'
}

/**
 * Set locale preference
 */
export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('locale', locale)
  // Reload page to apply language changes
  window.location.reload()
}
