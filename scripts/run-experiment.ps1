$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$resultDir = Join-Path $root "results"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultFile = Join-Path $resultDir "experiment-$timestamp.txt"
$portFile = Join-Path $root ".local-lab.port"
$port = if ($env:PORT) { $env:PORT } elseif (Test-Path $portFile) { Get-Content $portFile } else { "8081" }
$baseUrl = "http://localhost:$port"

Set-Location $root
New-Item -ItemType Directory -Force -Path $resultDir | Out-Null

try {
  Invoke-RestMethod -Uri "$baseUrl/health" -TimeoutSec 5 | Out-Null
} catch {
  Write-Host "Local lab is not running. Starting it now..."
  $env:PORT = $port
  & "$PSScriptRoot\run-local-lab.ps1"
}

Write-Host "Running attack/defense experiment..."
$env:LAB_BASE_URL = $baseUrl
npm run attack 2>&1 | Tee-Object -FilePath $resultFile

Write-Host ""
Write-Host "Saved result to $resultFile"
