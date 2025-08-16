param(
  [string]$ServiceName = "ScreenMonitor",
  [string]$InstallDir = "C:\\Program Files\\ScreenMonitor",
  [string]$PublishDir = "..\\bin\\Release\\net8.0-windows\\win-x64\\publish"
)

$ErrorActionPreference = 'Stop'

Write-Host "Stopping service: $ServiceName"
sc.exe stop $ServiceName | Out-Null
Start-Sleep -Seconds 2

Write-Host "Copying new binaries"
Copy-Item -Recurse -Force (Join-Path $PSScriptRoot $PublishDir "*") $InstallDir

Write-Host "Starting service: $ServiceName"
sc.exe start $ServiceName | Out-Null

Write-Host "\n== Verification ==" -ForegroundColor Cyan
sc.exe query $ServiceName

Write-Host "Upgrade complete." -ForegroundColor Green

