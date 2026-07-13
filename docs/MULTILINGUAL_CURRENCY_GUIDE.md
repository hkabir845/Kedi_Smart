# Multi-Language & Multi-Currency Support Guide

## 🌍 Overview

Kedi Smart now supports multiple languages and currencies. All products are stored in BDT (Bangladeshi Taka) as the base currency, and prices are converted based on the selected language/locale.

## 📋 Supported Languages & Currencies

### Languages
- **English (en)** - Currency: BDT (৳)
- **Bangla (bn)** - Currency: BDT (৳)
- **Arabic (ar)** - Currency: SAR (﷼) - Saudi Riyal
- **Hindi (hi)** - Currency: INR (₹) - Indian Rupee

### Currency Conversion
- Base currency: **BDT (Bangladeshi Taka)**
- Exchange rates are approximate and should be updated regularly
- Current rates (BDT = 1):
  - USD: 0.0091 (1 BDT ≈ $0.0091)
  - EUR: 0.0083 (1 BDT ≈ €0.0083)
  - INR: 0.85 (1 BDT ≈ ₹0.85)
  - SAR: 0.035 (1 BDT ≈ ﷼0.035)

## 🚀 Quick Start

### 1. Seed Comprehensive Products

Run the comprehensive product seed script to populate the database:

```bash
cd backend
python ../scripts/seed_comprehensive_products.py
```

This will create **150+ products** across all categories:
- Pet Food (Cat, Dog, Bird, Fish, Small Animals)
- Toys & Play
- Accessories
- Grooming
- Health & Medicine
- Beds & Comfort
- Litter & Waste
- Training
- Travel & Carriers
- Feeding

All products are priced in **BDT** and will be automatically converted based on the user's selected language.

### 2. Using i18n Utilities

```typescript
import { formatPrice, getLocale, setLocale, convertCurrency } from '@/lib/i18n'

// Format price for current locale
const price = formatPrice(1500, 'en') // "৳ 1,500.00"
const priceBN = formatPrice(1500, 'bn') // "৳ ১,৫০০.০০"
const priceAR = formatPrice(1500, 'ar') // "﷼ 52.50" (converted to SAR)
const priceHI = formatPrice(1500, 'hi') // "₹ 1,275.00" (converted to INR)

// Get current locale
const locale = getLocale() // 'en' | 'bn' | 'ar' | 'hi'

// Set locale (saves to localStorage and reloads page)
setLocale('bn')

// Convert currency
const converted = convertCurrency(1000, 'BDT', 'USD') // 9.1
```

### 3. Language Selector Component

Add the language selector to your layout or header:

```tsx
import LanguageSelector from '@/components/LanguageSelector'

// In your component
<LanguageSelector />
```

## 📝 Implementation Details

### File Structure

```
frontend/
├── lib/
│   └── i18n.ts                 # i18n utilities and currency conversion
├── components/
│   └── LanguageSelector.tsx    # Language switcher component
scripts/
└── seed_comprehensive_products.py  # Comprehensive product seed script
```

### Product Data Structure

All products in the database are stored with:
- **Currency**: BDT (base currency)
- **Price**: In Bangladeshi Taka
- **Display**: Automatically converted based on user's locale

### Currency Conversion Flow

1. Products stored in database with BDT prices
2. User selects language → determines currency
3. Frontend converts prices using exchange rates
4. Prices displayed in selected currency

## 🔧 Integration Examples

### Displaying Product Prices

```tsx
'use client'

import { formatPrice, getLocale } from '@/lib/i18n'
import { useEffect, useState } from 'react'

export default function ProductCard({ product }) {
  const [locale, setLocale] = useState('en')
  
  useEffect(() => {
    setLocale(getLocale())
  }, [])

  const price = product.variants?.[0]?.price
  const displayPrice = price ? formatPrice(price, locale) : 'N/A'

  return (
    <div>
      <h3>{product.title}</h3>
      <p className="text-2xl font-bold">{displayPrice}</p>
    </div>
  )
}
```

### In Shop Page

```tsx
// Update shop page to use formatPrice
import { formatPrice, getLocale } from '@/lib/i18n'

// In component
const locale = getLocale()
const priceDisplay = formatPrice(productPrice, locale)
```

### Adding Language Selector to Layout

```tsx
// In your header/navbar component
import LanguageSelector from '@/components/LanguageSelector'

<nav>
  {/* Other nav items */}
  <LanguageSelector />
</nav>
```

## 📊 Product Categories

The comprehensive seed script creates products in these categories:

1. **Pet Food** (30+ products)
   - Cat food (dry, wet, specialty)
   - Dog food (dry, wet, specialty, size-specific)
   - Bird food
   - Fish food
   - Small animal food

2. **Toys & Play** (15+ products)
   - Cat toys
   - Dog toys
   - Bird toys
   - Interactive puzzles

3. **Accessories** (15+ products)
   - Collars, leashes, harnesses
   - ID tags
   - Pet clothing
   - Safety items

4. **Grooming** (18+ products)
   - Shampoos, conditioners
   - Brushes, combs
   - Nail clippers
   - Dental care
   - Grooming tools

5. **Health & Medicine** (15+ products)
   - Vitamins and supplements
   - Flea and tick prevention
   - Dental care
   - First aid
   - Health monitoring

6. **Beds & Comfort** (10+ products)
   - Orthopedic beds
   - Cat beds
   - Blankets
   - Cooling/heating mats

7. **Litter & Waste** (11+ products)
   - Cat litter
   - Litter boxes
   - Waste bags
   - Cleanup supplies

8. **Training** (8+ products)
   - Training aids
   - Treats
   - Training tools

9. **Travel & Carriers** (9+ products)
   - Carriers
   - Travel accessories
   - Car safety

10. **Feeding** (10+ products)
    - Bowls
    - Feeders
    - Storage
    - Water fountains

**Total: 150+ products** covering all pet care needs!

## 🔄 Updating Exchange Rates

Exchange rates are defined in `frontend/lib/i18n.ts`. To update:

1. Open `frontend/lib/i18n.ts`
2. Update the `exchangeRates` object
3. Update rates in `locales` objects if needed

**Note:** For production, consider fetching exchange rates from an API or CMS.

## 🌐 Adding New Languages

To add a new language:

1. Add locale config to `locales` object in `frontend/lib/i18n.ts`:

```typescript
export type Locale = 'en' | 'bn' | 'ar' | 'hi' | 'fr' // Add new locale

export const locales: Record<Locale, LocaleConfig> = {
  // ... existing locales
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    currency: 'EUR',
    currencySymbol: '€',
    exchangeRate: 0.0083,
  },
}
```

2. Add currency to `Currency` type and `exchangeRates` if new
3. Language selector will automatically include it

## 📱 Next Steps

### Immediate
1. ✅ Run comprehensive product seed script
2. ✅ Add LanguageSelector to header/layout
3. ✅ Update product displays to use formatPrice
4. ✅ Test currency conversion

### Future Enhancements
1. **Translation Files**: Create translation JSON files for UI text
2. **Next.js i18n Routing**: Use Next.js built-in i18n routing for URL-based locales
3. **Real-time Exchange Rates**: Fetch rates from API
4. **RTL Support**: Add right-to-left layout for Arabic
5. **Currency Selector**: Allow manual currency selection independent of language
6. **Price History**: Track price changes in different currencies

## 🧪 Testing

### Test Product Seeding
```bash
cd backend
python ../scripts/seed_comprehensive_products.py
```

### Test Currency Conversion
```typescript
import { formatPrice } from '@/lib/i18n'

console.log(formatPrice(1500, 'en')) // BDT
console.log(formatPrice(1500, 'ar')) // SAR
console.log(formatPrice(1500, 'hi')) // INR
```

### Test Language Switching
1. Add LanguageSelector to a page
2. Click to open dropdown
3. Select different language
4. Verify page reloads and prices convert

## 📚 Additional Resources

- Next.js Internationalization: https://nextjs.org/docs/advanced-features/i18n-routing
- Intl.NumberFormat API: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat

---

**Last Updated:** [Current Date]
**Version:** 1.0.0
