# Sync local shop code + catalog (DB + product images) to the Kedi Smart VPS.
# Usage (from repo root, PowerShell):
#   .\scripts\sync-local-shop-to-vps.ps1
# Optional:
#   .\scripts\sync-local-shop-to-vps.ps1 -VpsHost 192.168.68.105 -VpsUser sas

param(
  [string]$VpsHost = "192.168.68.105",
  [string]$VpsUser = "sas",
  [string]$AppDir = "~/Kedi_Smart",
  [switch]$SkipDb,
  [switch]$SkipUploads,
  [switch]$SkipRedeploy
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Backend = Join-Path $Root "backend"
$Db = Join-Path $Backend "data\kedismart.db"
$UploadsProducts = Join-Path $Backend "uploads\products"
$Target = "${VpsUser}@${VpsHost}"

Write-Host "==> Target: $Target:$AppDir"
Write-Host "==> Local repo: $Root"

if (-not $SkipDb) {
  if (-not (Test-Path $Db)) { throw "Missing local DB: $Db" }
  Write-Host "==> Uploading database (kedismart.db)..."
  ssh $Target "mkdir -p $AppDir/backend/data"
  scp $Db "${Target}:${AppDir}/backend/data/kedismart.db"
}

if (-not $SkipUploads) {
  if (-not (Test-Path $UploadsProducts)) { throw "Missing local uploads: $UploadsProducts" }
  Write-Host "==> Uploading product images (~18MB)..."
  ssh $Target "mkdir -p $AppDir/backend/uploads/products"
  scp -r $UploadsProducts "${Target}:${AppDir}/backend/uploads/"
}

if (-not $SkipRedeploy) {
  Write-Host "==> Pulling latest main + rebuilding frontend on VPS..."
  ssh $Target @"
set -e
cd $AppDir
git fetch origin
git checkout main
git pull --ff-only origin main
bash scripts/deploy-from-github.sh
"@
}

Write-Host ""
Write-Host "Done. Check: https://kedismart.com/shop?catalog=general"
Write-Host "You should see the Shop nav link, product images, and matching catalog counts."
