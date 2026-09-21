param(
    [string]$Source = ".spike-tools",
    [string]$RuntimeDestination = "src-tauri/resources/openseeface-runtime"
)

$ErrorActionPreference = "Stop"
$expectedArchiveSha256 = "c9223f3547dce65b09705bb9ff74439b7d36e1c37bbe9668672711cf5aa31147"
$expectedTrackerSha256 = "ee44485d440a8528cf9ed5c8e4d3a4be750763c34088ab829602f3dc145e25a9"
$sourcePath = [System.IO.Path]::GetFullPath($Source)
$runtimePath = [System.IO.Path]::GetFullPath($RuntimeDestination)
$workspacePath = [System.IO.Path]::GetFullPath((Get-Location).Path)
$sidecarPath = Join-Path $workspacePath "src-tauri\binaries\openseeface-facetracker-x86_64-pc-windows-msvc.exe"
$trackerPath = Join-Path $sourcePath "Binary\facetracker.exe"
$licensesPath = Join-Path $sourcePath "Licenses"

if (-not $sourcePath.StartsWith($workspacePath + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Source must be inside the current repository."
}
if (-not (Test-Path -LiteralPath $trackerPath) -or -not (Test-Path -LiteralPath $licensesPath)) {
    throw "Verified OpenSeeFace staging is absent or incomplete. Run scripts\stage-openseeface-spike.ps1 first; expected archive SHA-256 $expectedArchiveSha256."
}
$actualTrackerSha256 = (Get-FileHash -LiteralPath $trackerPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualTrackerSha256 -ne $expectedTrackerSha256) {
    throw "facetracker.exe SHA-256 mismatch: expected $expectedTrackerSha256, got $actualTrackerSha256."
}
if (Test-Path -LiteralPath $runtimePath) { Remove-Item -LiteralPath $runtimePath -Recurse -Force }
New-Item -ItemType Directory -Force -Path $runtimePath, (Split-Path -Parent $sidecarPath) | Out-Null
Get-ChildItem -LiteralPath $sourcePath -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $runtimePath -Recurse -Force
}
Copy-Item -LiteralPath $trackerPath -Destination $sidecarPath -Force

[pscustomobject]@{
    source = $sourcePath
    runtime = $runtimePath
    sidecar = $sidecarPath
    releaseArchiveSha256 = $expectedArchiveSha256
    facetrackerSha256 = $actualTrackerSha256
    licensesPreserved = (Test-Path -LiteralPath (Join-Path $runtimePath "Licenses"))
} | ConvertTo-Json
