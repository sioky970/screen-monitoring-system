param(
  [string]$ServiceName = "ScreenMonitor",
  [string]$InstallDir = "C:\\Program Files\\ScreenMonitor",
  [string]$PublishDir
)

$ErrorActionPreference = 'Stop'

if (-not $PublishDir -or $PublishDir.Trim() -eq '') {
  # 默认使用 scripts 上级目录作为发布目录（用于解压分发包场景）
  $PublishDir = (Join-Path $PSScriptRoot "..")
}

Write-Host "Using PublishDir: $PublishDir" -ForegroundColor Cyan

Write-Host "Creating install directory: $InstallDir"
New-Item -ItemType Directory -Force $InstallDir | Out-Null

Write-Host "Copying files from $PublishDir to $InstallDir"
Copy-Item -Recurse -Force (Join-Path $PublishDir "*") $InstallDir

$exe = Join-Path $InstallDir "ScreenMonitor.Client.exe"

Write-Host "Creating/Updating Windows Service: $ServiceName -> $exe"
# Try to create; if exists, update the binPath
try {
  sc.exe create $ServiceName binPath= "$exe" start= auto | Out-Null
} catch {
  sc.exe config $ServiceName binPath= "$exe" start= auto | Out-Null
}

# Start the service
sc.exe start $ServiceName | Out-Null

Write-Host "Service $ServiceName installed and started." -ForegroundColor Green

Write-Host "\n== Verification ==" -ForegroundColor Cyan
sc.exe query $ServiceName

Write-Host "\n== Check executable exists ==" -ForegroundColor Cyan
if (Test-Path $exe) { Write-Host "OK: $exe" -ForegroundColor Green } else { Write-Host "Missing: $exe" -ForegroundColor Red }

Write-Host "\n== Tail recent Windows Event Log for service ==" -ForegroundColor Cyan
wevtutil qe System /c:20 /rd:true /f:text | Select-String -Pattern $ServiceName -Context 0,0 | Select-Object -First 20 | Out-Host

