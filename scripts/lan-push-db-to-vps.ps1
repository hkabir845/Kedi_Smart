# Same-LAN transfer: PC (192.168.68.107) → VPS (192.168.68.105)
# Run in an interactive PowerShell on your PC (will ask for VPS password once per scp).
#   cd I:\ITProjects\Kedi_Smart
#   .\scripts\lan-push-db-to-vps.ps1

param(
  [string]$VpsHost = "192.168.68.105",
  [string]$VpsUser = "sas",
  [string]$AppDir = "Kedi_Smart",
  [switch]$SkipImages,
  [switch]$Redeploy
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Db = Join-Path $Root "backend\data\kedismart.db"
$Products = Join-Path $Root "backend\uploads\products"
$Target = "${VpsUser}@${VpsHost}"

if (-not (Test-Path $Db)) { throw "Missing $Db" }

Write-Host "==> 1/3 Stop backend on VPS (avoid DB lock)"
ssh $Target "pkill -f 'gunicorn config.wsgi' 2>/dev/null || true; sleep 1; echo stopped"

Write-Host "==> 2/3 Upload kedismart.db ($([math]::Round((Get-Item $Db).Length/1MB,2)) MB)"
ssh $Target "mkdir -p ~/$AppDir/backend/data ~/$AppDir/backend/uploads"
scp $Db "${Target}:~/${AppDir}/backend/data/kedismart.db"

if (-not $SkipImages) {
  if (-not (Test-Path $Products)) { throw "Missing $Products" }
  Write-Host "==> 3/3 Upload product images"
  scp -r $Products "${Target}:~/${AppDir}/backend/uploads/"
} else {
  Write-Host "==> Skipping images (-SkipImages)"
}

if ($Redeploy) {
  Write-Host "==> Redeploy on VPS"
  ssh $Target "cd ~/$AppDir && git pull --ff-only origin main && bash scripts/deploy-from-github.sh"
} else {
  Write-Host "==> Restart backend + frontend only"
  ssh $Target @"
pkill -f 'gunicorn config.wsgi' 2>/dev/null || true
pkill -f 'next start' 2>/dev/null || true
pkill -f 'next-server' 2>/dev/null || true
sleep 1
nohup ~/.config/kedismart/run-backend.sh > ~/.config/kedismart/backend.log 2>&1 &
nohup ~/.config/kedismart/run-frontend.sh > ~/.config/kedismart/frontend.log 2>&1 &
sleep 2
ss -tln | grep -E ':8002|:3000' || true
"@
}

Write-Host ""
Write-Host "Done. Open https://kedismart.com/shop?catalog=general"
