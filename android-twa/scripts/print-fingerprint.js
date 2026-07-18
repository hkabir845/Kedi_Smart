/**
 * Print SHA-256 fingerprint from android.keystore for assetlinks.json
 * Requires Java keytool on PATH.
 */
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const keystore = path.join(__dirname, '..', 'android.keystore')
if (!fs.existsSync(keystore)) {
  console.error('Missing android.keystore — run scripts/create-keystore.ps1 first')
  process.exit(1)
}

const alias = process.env.KEYSTORE_ALIAS || 'kedismart'
const storePass = process.env.KEYSTORE_PASSWORD
if (!storePass) {
  console.error('Set KEYSTORE_PASSWORD env var')
  process.exit(1)
}

const out = execSync(
  `keytool -list -v -keystore "${keystore}" -alias ${alias} -storepass ${storePass}`,
  { encoding: 'utf8' }
)
const match = out.match(/SHA256:\s*([0-9A-F:]+)/i)
if (!match) {
  console.error(out)
  process.exit(1)
}
const fp = match[1].toUpperCase()
console.log(fp)
console.log('\nPaste into frontend/public/.well-known/assetlinks.json')
console.log('and also add the Play App Signing certificate SHA-256 from Play Console.')
