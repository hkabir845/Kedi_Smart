# KediSmart Android (Trusted Web Activity)

This wraps the live site **https://kedismart.com** as a Google Play app using a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/) (Bubblewrap).

| Item | Value |
|------|--------|
| Package ID | `com.kedismart.app` |
| Host | `kedismart.com` |
| Start URL | `/` |

## Prerequisites (one-time on your PC)

1. **JDK 17+**
   ```powershell
   winget install Microsoft.OpenJDK.17
   ```
2. **Android Studio** (includes Android SDK) — https://developer.android.com/studio  
3. Node.js (already installed)

## Build the Play upload key

```powershell
cd I:\ITProjects\Kedi_Smart\android-twa
.\scripts\create-keystore.ps1
$env:KEYSTORE_PASSWORD = "YOUR_PASSWORD"
node .\scripts\print-fingerprint.js
```

Copy the `SHA256:` fingerprint into:

`frontend/public/.well-known/assetlinks.json`

Redeploy the website so `https://kedismart.com/.well-known/assetlinks.json` returns that fingerprint.

After the first Play upload, open **Play Console → Setup → App signing** and add the **App signing key certificate** SHA-256 to the same JSON array (both fingerprints are required).

## Generate & build the Android project

```powershell
cd I:\ITProjects\Kedi_Smart\android-twa
npm install
npx bubblewrap init --manifest https://kedismart.com/manifest.webmanifest
# Answer prompts:
#   Package ID: com.kedismart.app
#   App name: KediSmart
#   Use existing keystore: yes → ./android.keystore  alias kedismart
npx bubblewrap build
```

Outputs an `.aab` (Android App Bundle) for Play Console.

Or open the generated `app/` folder in Android Studio → **Build → Generate Signed Bundle / APK**.

## Verify Digital Asset Links

After deploy + fingerprints:

https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://kedismart.com&relation=delegate_permission/common.handle_all_urls

## Play Console

Follow [docs/PLAY_STORE.md](../docs/PLAY_STORE.md).
