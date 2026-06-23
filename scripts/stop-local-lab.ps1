$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".local-lab.pid"

if (-not (Test-Path $pidFile)) {
  Write-Host "Local lab is not running."
  exit 0
}

$pidValue = Get-Content $pidFile -ErrorAction SilentlyContinue
if ($pidValue -and (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) {
  Stop-Process -Id $pidValue -Force
  Write-Host "Stopped local lab process $pidValue."
} else {
  Write-Host "No running process found for saved PID."
}

Remove-Item $pidFile -Force
