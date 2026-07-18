# Creates the Play upload keystore for com.kedismart.app
# Uses Android Studio's bundled JDK (keytool) when Java is not on PATH.
param(
  [string]$Alias = "kedismart",
  [string]$OutFile = "",
  [string]$StorePassword = "",
  [string]$DName = "CN=KediSmart, OU=Mobile, O=SAS Corporation BD, L=Dhaka, ST=Dhaka, C=BD"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $OutFile) { $OutFile = Join-Path $PSScriptRoot "..\android.keystore" }
$OutFile = [System.IO.Path]::GetFullPath($OutFile)

function Find-Keytool {
  $cmd = Get-Command keytool -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "C:\Program Files\Android\Android Studio1\jbr\bin\keytool.exe",
    "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe",
    "C:\Program Files\Android\Android Studio\jre\bin\keytool.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }
  $found = Get-ChildItem "C:\Program Files\Android" -Recurse -Filter keytool.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
  return $found
}

$keytool = Find-Keytool
if (-not $keytool) {
  Write-Host "keytool not found. Open Android Studio once, or install JDK:"
  Write-Host "  winget install Microsoft.OpenJDK.17"
  exit 1
}

$jbrBin = Split-Path $keytool -Parent
$jbrHome = Split-Path $jbrBin -Parent
$env:JAVA_HOME = $jbrHome
$env:Path = "$jbrBin;$env:Path"
Write-Host "Using: $keytool"
Write-Host "JAVA_HOME=$jbrHome"

if (Test-Path $OutFile) {
  Write-Host "Keystore already exists: $OutFile"
  Write-Host "Delete it first if you intentionally want a new key."
  exit 1
}

if (-not $StorePassword) {
  $secure = Read-Host "Enter a new keystore password (save it securely)" -AsSecureString
  $StorePassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )
  if (-not $StorePassword -or $StorePassword.Length -lt 6) {
    Write-Host "Password must be at least 6 characters."
    exit 1
  }
}

Write-Host "Creating upload keystore at $OutFile"
& $keytool -genkeypair `
  -v `
  -keystore $OutFile `
  -alias $Alias `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storepass $StorePassword `
  -keypass $StorePassword `
  -dname $DName

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Keystore created."
Write-Host "Fingerprint:"
& $keytool -list -v -keystore $OutFile -alias $Alias -storepass $StorePassword |
  Select-String -Pattern "SHA256:"

Write-Host ""
Write-Host "1) Copy the SHA256 value into:"
Write-Host "   frontend\public\.well-known\assetlinks.json"
Write-Host "2) Redeploy the website"
Write-Host "3) Then: cd android-twa; npm install; npx bubblewrap init --manifest https://kedismart.com/manifest.webmanifest"
