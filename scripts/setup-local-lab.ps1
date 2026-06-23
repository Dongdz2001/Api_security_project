$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Installing local Node dependencies..."
npm install

Write-Host ""
Write-Host "Local lab is ready."
Write-Host "Run: .\scripts\run-local-lab.ps1"
