# Publish KediSmart on Google Play

KediSmart is a Next.js web app. The Play listing ships as a **Trusted Web Activity (TWA)** that opens https://kedismart.com inside Chrome — same product, Play Store distribution.

Your Play Console: [Google Play Console](https://play.google.com/console/)

## What was prepared in the repo

| Piece | Location |
|-------|----------|
| PWA manifest + icons | `frontend/app/manifest.ts`, `frontend/public/icons/` |
| Service worker (installable) | `frontend/public/sw.js` + `RegisterServiceWorker` |
| Digital Asset Links stub | `frontend/public/.well-known/assetlinks.json` |
| TWA / Bubblewrap config | `android-twa/` |
| Listing graphics seed | `frontend/public/play/` (icon + feature graphic) |

## Checklist before first upload

### A. Website (deploy first)

1. Deploy frontend so production has:
   - `https://kedismart.com/manifest.webmanifest`
   - `https://kedismart.com/sw.js`
   - `https://kedismart.com/icons/icon-512.png`
   - `https://kedismart.com/.well-known/assetlinks.json` (real SHA-256, not placeholder)
2. Confirm HTTPS works and the site loads on a phone Chrome browser.
3. Optional: Chrome → Install app / Add to Home screen should work.

### B. Android packaging

1. Install JDK 17 + Android Studio (see `android-twa/README.md`).
2. Create upload keystore and update `assetlinks.json`.
3. Redeploy site with fingerprints.
4. `npx bubblewrap init` + `npx bubblewrap build` → get `.aab`.

### C. Create the app in Play Console

1. **All apps → Create app**
   - App name: `KediSmart`
   - Default language: English (United States) or English (UK)
   - App or game: **App**
   - Free / Paid: **Free** (or Paid if you sell the APK itself — usually Free + in-app commerce on web)
2. Accept declarations (Developer Program Policies, US export laws, etc.).

### D. Store listing (main store listing)

| Field | Suggested copy |
|-------|----------------|
| Short description (80 chars) | Digital pet ID, NFC/QR tags, shop & vets — Trusted by Pets, Loved by Owners |
| Full description | See “Full description” below |
| App icon | `frontend/public/play/icon-512.png` (512×512) |
| Feature graphic | `frontend/public/play/feature-graphic.png` (1024×500) |
| Phone screenshots | 2–8 screenshots from a real device (home, shop, pet ID, vet) |
| Category | Lifestyle or Shopping |
| Contact email | info@kedismart.com |
| Privacy policy URL | https://kedismart.com/privacy (must exist and be accurate) |

**Full description (edit as needed):**

```
KediSmart is Bangladesh’s pet & animal platform — digital pet ID, NFC/QR smart tags, shop, live-animal marketplace, and vet discovery.

• Create a digital pet ID and link a smart tag so finders can help lost pets return home
• Shop pet products and manage orders
• Browse live animals from trusted sellers
• Find veterinary care near you
• Vendor and breeder tools for sellers

Trusted by Pets, Loved by Owners.

Website: https://kedismart.com
Support: info@kedismart.com
```

### E. App content / policy forms

Complete every required questionnaire in Play Console:

- Privacy policy
- Ads (yes/no)
- Target audience & content
- News app (no)
- Data safety form (collect email/account/orders → declare accurately)
- Government apps (no)
- Financial features if applicable
- Health features if you claim medical advice (usually no for marketplace)

### F. Release

1. **Testing → Internal testing** first (add your Gmail as tester).
2. Upload the `.aab`, set release notes: `Initial release of KediSmart for Android.`
3. Roll out internal → closed → production when checks pass.

## Important Play policies for web wrappers

- The TWA must open **your** verified domain (`kedismart.com`) with working Digital Asset Links.
- Privacy policy must match what the app/site collects.
- Do not upload a blank WebView of a third-party site.
- If you use Push / NFC later, declare those permissions and update the Data safety form.

## Domains

Production host for TWA: **kedismart.com**  
If you temporarily use `kedismart.sascorporationbd.com`, change `host` / `package` asset links and rebuild — Play expects the domain in `assetlinks.json` to match the TWA host.

## Support contacts

- Play Console developer account: your Google account for developer ID `4835257466388061530`
- User support email on listing: info@kedismart.com
