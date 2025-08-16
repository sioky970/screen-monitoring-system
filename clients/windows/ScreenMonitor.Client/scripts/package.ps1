param(
  [string]$Configuration = "Release",
  [string]$Runtime = "win-x64",
  [string]$OutFile = "ScreenMonitorClient_Package.zip"
)

$ErrorActionPreference = 'Stop'

# 1) Build self-contained single file
& (Join-Path $PSScriptRoot 'build-self-contained.ps1') -Configuration $Configuration -Runtime $Runtime -SingleFile -SelfContained

# 2) Compose package staging folder
$projDir = Split-Path -Parent $PSScriptRoot
$publishDir = Join-Path $projDir "bin/$Configuration/net8.0-windows/$Runtime/publish"
$stage = Join-Path $PSScriptRoot "_stage"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Path $stage | Out-Null

# Copy publish output
Copy-Item -Recurse -Force (Join-Path $publishDir "*") $stage

# Copy scripts (install/upgrade/uninstall)
New-Item -ItemType Directory -Path (Join-Path $stage "scripts") | Out-Null
Copy-Item -Recurse -Force (Join-Path $PSScriptRoot "install.ps1") (Join-Path $stage "scripts")
Copy-Item -Recurse -Force (Join-Path $PSScriptRoot "upgrade.ps1") (Join-Path $stage "scripts")
Copy-Item -Recurse -Force (Join-Path $PSScriptRoot "uninstall.ps1") (Join-Path $stage "scripts")

# 3) Zip package
$zipPath = Join-Path $PSScriptRoot $OutFile
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zipPath)

Write-Host "Package created: $zipPath" -ForegroundColor Green
Write-Host "How to install on target Windows:" -ForegroundColor Cyan
Write-Host "1) Copy $zipPath to the target machine"
Write-Host "2) Extract the zip, open PowerShell as Administrator, then run:"
Write-Host "   Set-ExecutionPolicy Bypass -Scope Process -Force" -ForegroundColor Yellow
Write-Host "   cd <extracted-folder>\scripts" -ForegroundColor Yellow
Write-Host "   .\install.ps1" -ForegroundColor Yellow

