$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root "public\assets\vendor"
$dest = Join-Path $dir "iztro-v2.6.1.min.js"
$url = "https://cdn.jsdelivr.net/npm/iztro@2.6.1/dist/iztro-v2.6.1.min.js"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
if (Test-Path $dest) {
  Write-Host "Pinned iztro 2.6.1 already exists: $dest"
  exit 0
}
Write-Host "Downloading pinned iztro 2.6.1..."
Invoke-WebRequest -Uri $url -OutFile $dest
if ((Get-Item $dest).Length -lt 500000) {
  Remove-Item $dest -Force -ErrorAction SilentlyContinue
  throw "Downloaded engine file is unexpectedly small."
}
Write-Host "Saved: $dest"
Write-Host "The app now runs the astrology engine locally; CDN is only a fallback."
