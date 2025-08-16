param(
  [string]$ServiceName = "ScreenMonitor",
  [string]$InstallDir = "C:\\Program Files\\ScreenMonitor"
)

$ErrorActionPreference = 'Stop'

Write-Host "Stopping and removing service: $ServiceName"
sc.exe stop $ServiceName | Out-Null
Start-Sleep -Seconds 1
sc.exe delete $ServiceName | Out-Null

Write-Host "\n== Verification ==" -ForegroundColor Cyan
sc.exe query $ServiceName

Write-Host "Removing install directory: $InstallDir"
Remove-Item -Recurse -Force $InstallDir -ErrorAction SilentlyContinue

Write-Host "Uninstall complete." -ForegroundColor Green

