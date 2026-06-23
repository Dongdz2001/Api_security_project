$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".local-lab.pid"
$logFile = Join-Path $root ".local-lab.log"
$errFile = Join-Path $root ".local-lab.err.log"
$port = if ($env:PORT) { $env:PORT } else { "8081" }

Set-Location $root

if (Test-Path $pidFile) {
  $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
  $savedPortFile = Join-Path $root ".local-lab.port"
  $savedPort = if (Test-Path $savedPortFile) { Get-Content $savedPortFile } else { "" }
  if ($oldPid -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
    if ($savedPort -eq $port) {
      Write-Host "Local lab is already running at http://localhost:$port (PID $oldPid)."
      exit 0
    }
    Write-Host "Ignoring existing PID $oldPid because it belongs to a different or older lab port."
  }
  Remove-Item $pidFile -Force
}

if (-not (Test-Path "node_modules")) {
  Write-Host "node_modules not found. Installing dependencies first..."
  npm install
}

$env:PORT = $port
Write-Host "Starting local API security lab at http://localhost:$port ..."
$process = Start-Process -FilePath "node" `
  -ArgumentList "scripts/local-lab-server.js" `
  -WorkingDirectory $root `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError $errFile `
  -PassThru `
  -WindowStyle Hidden

Set-Content -Path $pidFile -Value $process.Id
Set-Content -Path (Join-Path $root ".local-lab.port") -Value $port
Start-Sleep -Seconds 2

try {
  $health = Invoke-RestMethod -Uri "http://localhost:$port/health" -TimeoutSec 5
  Write-Host "Started. Health:"
  $health | ConvertTo-Json -Compress
} catch {
  Write-Host "Started, but health check failed. See $logFile"
  throw
}

Write-Host ""
Write-Host "Run experiment: .\scripts\run-experiment.ps1"
Write-Host "Stop lab:       .\scripts\stop-local-lab.ps1"
