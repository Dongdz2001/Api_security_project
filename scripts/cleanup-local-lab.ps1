$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

& "$PSScriptRoot\stop-local-lab.ps1"

$paths = @(
  "node_modules",
  ".local-lab.log",
  ".local-lab.err.log",
  ".local-lab.pid",
  "results"
)

foreach ($path in $paths) {
  $fullPath = Join-Path $root $path
  if (Test-Path $fullPath) {
    Remove-Item -LiteralPath $fullPath -Recurse -Force
    Write-Host "Removed $path"
  }
}

Write-Host "Cleanup completed. Source code and Git history are kept."
