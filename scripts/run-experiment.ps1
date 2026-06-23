$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$resultDir = Join-Path $root "results"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultFile = Join-Path $resultDir "experiment-$timestamp.txt"

Set-Location $root
New-Item -ItemType Directory -Force -Path $resultDir | Out-Null

try {
  Invoke-RestMethod -Uri "http://localhost:8080/health" -TimeoutSec 5 | Out-Null
} catch {
  Write-Host "Local lab is not running. Starting it now..."
  & "$PSScriptRoot\run-local-lab.ps1"
}

Write-Host "Running attack/defense experiment..."
$env:LAB_BASE_URL = "http://localhost:8080"
npm run attack 2>&1 | Tee-Object -FilePath $resultFile

Write-Host ""
Write-Host "Saved result to $resultFile"
