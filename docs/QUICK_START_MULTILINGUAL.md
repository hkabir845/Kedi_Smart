# Quick Start: Multi-Language & Currency Support

## 🚀 Step 1: Seed Comprehensive Products

Run the comprehensive product seed script to populate your database with 150+ products:

```bash
cd backend
python ../scripts/seed_comprehensive_products.py
```

This creates products in BDT (Bangladeshi Taka) across all categories:
- ✅ Pet Food (30+ products)
- ✅ Toys & Play (15+ products)
- ✅ Accessories (15+ products)
- ✅ Grooming (18+ products)
- ✅ Health & Medicine (15+ products)
- ✅ Beds & Comfort (10+ products)
- ✅ Litter & Waste (11+ products)
- ✅ Training (8+ products)
- ✅ Travel & Carriers (9+ products)
- ✅ Feeding (10+ products)

**Total: 150+ products, all priced in BDT**

## 🌍 Step 2: Add Language Selector

The language selector component is ready. Add it to your header/navigation:

```tsx
import LanguageSelector from '@/components/LanguageSelector'

// In your header/nav component
<LanguageSelector />
```

## 💰 Step 3: Use Currency Formatting

Update product displays to use `formatPrice`:

```tsx
import { formatPrice, getLocale } from '@/lib/i18n'

// In your component
const locale = getLocale()
const price = formatPrice(product.price, locale)
// Result: "৳ 1,500.00" (English/Bangla) or "₹ 1,275.00" (Hindi) or "﷼ 52.50" (Arabic)
```

## 📋 Supported Languages & Currencies

| Language | Code | Currency | Symbol | Example (BDT 1500) |
|----------|------|----------|--------|-------------------|
| English | en | BDT | ৳ | ৳ 1,500.00 |
| Bangla | bn | BDT | ৳ | ৳ ১,৫০০.০০ |
| Hindi | hi | INR | ₹ | ₹ 1,275.00 |
| Arabic | ar | SAR | ﷼ | ﷼ 52.50 |

## ✅ What's Included

1. ✅ **Comprehensive Product Seed Script** (`scripts/seed_comprehensive_products.py`)
   - 150+ products in BDT
   - All categories covered
   - Realistic pricing

2. ✅ **i18n Utilities** (`frontend/lib/i18n.ts`)
   - Language detection
   - Currency conversion
   - Price formatting
   - Locale management

3. ✅ **Language Selector Component** (`frontend/components/LanguageSelector.tsx`)
   - Dropdown selector
   - Visual feedback
   - Automatic page reload

4. ✅ **Documentation** (`docs/MULTILINGUAL_CURRENCY_GUIDE.md`)
   - Complete guide
   - Examples
   - Integration instructions

## 🔧 Next Steps

1. **Run the seed script** to populate products
2. **Add LanguageSelector** to your layout/header
3. **Update product displays** to use `formatPrice()`
4. **Test language switching** and currency conversion

## 📚 Full Documentation

See `docs/MULTILINGUAL_CURRENCY_GUIDE.md` for complete documentation.

---

**Ready to use!** All products are in BDT, and prices will automatically convert based on the selected language.
