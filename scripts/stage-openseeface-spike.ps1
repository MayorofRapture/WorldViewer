param(
    [string]$Destination = ".spike-tools",
    [string]$Version = "v1.20.5",
    [string]$ExpectedSha256 = "c9223f3547dce65b09705bb9ff74439b7d36e1c37bbe9668672711cf5aa31147"
)

$ErrorActionPreference = "Stop"
$releaseName = "OpenSeeFace-$Version.zip"
$releaseUrl = "https://github.com/emilianavt/OpenSeeFace/releases/download/$Version/$releaseName"
$archivePath = Join-Path ([System.IO.Path]::GetTempPath()) $releaseName
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
$workspacePath = [System.IO.Path]::GetFullPath((Get-Location).Path)
if (-not $destinationPath.StartsWith($workspacePath + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Destination must be inside the current repository."
}

curl.exe --fail --location --output $archivePath $releaseUrl
$actualSha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualSha256 -ne $ExpectedSha256.ToLowerInvariant()) {
    throw "OpenSeeFace archive SHA-256 mismatch: expected $ExpectedSha256, got $actualSha256."
}

if (Test-Path -LiteralPath $destinationPath) {
    throw "Destination already exists: $destinationPath. Choose an empty path; this script does not overwrite staged releases."
}
New-Item -ItemType Directory -Path $destinationPath | Out-Null
Expand-Archive -LiteralPath $archivePath -DestinationPath $destinationPath

$trackerPath = Join-Path $destinationPath "Binary\facetracker.exe"
$licensePath = Join-Path $destinationPath "Licenses"
if (-not (Test-Path -LiteralPath $trackerPath)) {
    throw "Verified archive did not contain Binary\\facetracker.exe."
}
if (-not (Test-Path -LiteralPath $licensePath)) {
    throw "Verified archive did not contain its Licenses directory."
}

Get-FileHash -LiteralPath $trackerPath -Algorithm SHA256
Write-Output "Staged OpenSeeFace $Version at $destinationPath with Licenses preserved."
