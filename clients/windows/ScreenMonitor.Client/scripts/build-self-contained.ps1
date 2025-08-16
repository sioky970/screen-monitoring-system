param(
  [string]$Configuration = "Release",
  [string]$Runtime = "win-x64",
  [switch]$SingleFile = $true,
  [switch]$SelfContained = $true
)

Write-Host "Building self-contained package..." -ForegroundColor Cyan
$projDir = Split-Path -Parent $PSScriptRoot
Push-Location $projDir

dotnet restore
$single = if ($SingleFile) { "true" } else { "false" }
$self = if ($SelfContained) { "true" } else { "false" }

dotnet publish -c $Configuration -r $Runtime --self-contained:$self /p:PublishSingleFile=$single /p:IncludeNativeLibrariesForSelfExtract=true

Pop-Location

Write-Host "Build complete. Output under bin/$Configuration/net8.0-windows/$Runtime/publish" -ForegroundColor Green

