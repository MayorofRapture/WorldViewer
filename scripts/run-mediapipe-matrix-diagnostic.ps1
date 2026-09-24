param(
    [string]$ExecutablePath = ".\src-tauri\target\release\worldviewer.exe",
    [string]$OutputRoot = "$env:TEMP\worldviewer-mediapipe-matrix-diagnostic",
    [int]$TimeoutSeconds = 120,
    [switch]$Visible
)

$ErrorActionPreference = "Stop"
$resolvedExecutable = (Resolve-Path -LiteralPath $ExecutablePath).Path
$root = (New-Item -ItemType Directory -Force -Path $OutputRoot).FullName
$runDirectory = (New-Item -ItemType Directory -Force -Path (Join-Path $root ("run-" + [guid]::NewGuid().ToString("N")))).FullName
$outputPath = Join-Path $runDirectory "diagnostic.json"
$eventPath = Join-Path $env:TEMP ("worldviewer-matrix-diagnostic-events-" + [guid]::NewGuid() + ".jsonl")
$userDataFolder = Join-Path $env:TEMP ("worldviewer-matrix-diagnostic-webview-" + [guid]::NewGuid())

function Get-DescendantProcessIds([int]$RootPid) {
    try {
        $processes = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId)
    } catch {
        return @($RootPid)
    }
    $ids = [System.Collections.Generic.HashSet[int]]::new()
    [void]$ids.Add($RootPid)
    $changed = $true
    while ($changed) {
        $changed = $false
        foreach ($candidate in $processes) {
            if ($ids.Contains([int]$candidate.ParentProcessId) -and $ids.Add([int]$candidate.ProcessId)) { $changed = $true }
        }
    }
    return @($ids)
}

function Stop-OwnedProcessTree([int]$RootPid) {
    foreach ($processId in (Get-DescendantProcessIds $RootPid | Sort-Object -Descending)) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}

function Read-JsonEvents([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return @() }
    return @(Get-Content -LiteralPath $Path | Where-Object { $_.Trim().Length -gt 0 } | ForEach-Object { $_ | ConvertFrom-Json })
}

function Read-SmokeResult([string]$Text) {
    $lines = @($Text -split "\r?\n" | Where-Object { $_.Trim().Length -gt 0 })
    [Array]::Reverse($lines)
    foreach ($line in $lines) {
        try {
            $candidate = $line | ConvertFrom-Json
            if ($candidate.mode -eq "mediapipe-matrix-diagnostic") { return $candidate }
        } catch { }
    }
    return $null
}

$status = "application-failure"
$exitCode = 1
$errorCode = $null
$errorMessage = $null
$smokeResult = $null
$events = @()
$process = $null

try {
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $resolvedExecutable
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = -not [bool]$Visible
    $startInfo.Environment["WORLD_VIEWER_SMOKE_MODE"] = "mediapipe-matrix-diagnostic"
    $startInfo.Environment["WORLD_VIEWER_BENCHMARK_EVENT_PATH"] = $eventPath
    $startInfo.Environment["WEBVIEW2_USER_DATA_FOLDER"] = $userDataFolder
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    if (-not $process.Start()) { throw "Could not start packaged WorldViewer diagnostic." }
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while (-not $process.HasExited -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
    if (-not $process.HasExited) {
        Stop-OwnedProcessTree $process.Id
        $errorCode = "DIAGNOSTIC_TIMEOUT"
        $errorMessage = "packaged diagnostic exceeded $TimeoutSeconds seconds"
        $status = "timeout"
    } else {
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        [void]$stderrTask.GetAwaiter().GetResult()
        $smokeResult = Read-SmokeResult $stdout
        $events = Read-JsonEvents $eventPath
        if ($smokeResult -and $smokeResult.checks.Count -gt 0 -and $smokeResult.checks[0].detail) {
            try { $diagnostic = $smokeResult.checks[0].detail | ConvertFrom-Json } catch { $diagnostic = $null }
        } else { $diagnostic = $null }
        if ($diagnostic -and $diagnostic.status -eq "success" -and $process.ExitCode -eq 0) {
            $status = "success"
            $exitCode = 0
        } elseif ($diagnostic -and $diagnostic.status -eq "cancelled") {
            $status = "cancelled"
            $errorCode = "MEDIAPIPE_DIAGNOSTIC_CANCELLED"
            $errorMessage = $diagnostic.error
        } elseif ($diagnostic -and $diagnostic.status -eq "incomplete") {
            $status = "incomplete"
            $errorCode = "MEDIAPIPE_DIAGNOSTIC_INCOMPLETE"
            $errorMessage = $diagnostic.error
        } else {
            $errorCode = "MEDIAPIPE_DIAGNOSTIC_APPLICATION_FAILURE"
            $errorMessage = "packaged diagnostic exited without a successful structured result"
        }
    }
} catch {
    $errorCode = "MEDIAPIPE_DIAGNOSTIC_RUNNER_FAILURE"
    $errorMessage = $_.Exception.Message
    $status = "application-failure"
} finally {
    if ($process -and -not $process.HasExited) { Stop-OwnedProcessTree $process.Id }
    $events = Read-JsonEvents $eventPath
    foreach ($path in @($eventPath)) {
        if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue }
    }
    if (Test-Path -LiteralPath $userDataFolder) {
        try { Remove-Item -LiteralPath $userDataFolder -Recurse -Force -ErrorAction Stop } catch { }
    }
}

$diagnostic = $null
if ($smokeResult -and $smokeResult.checks.Count -gt 0 -and $smokeResult.checks[0].detail) {
    try { $diagnostic = $smokeResult.checks[0].detail | ConvertFrom-Json } catch { $diagnostic = $null }
}
[pscustomobject]@{
    schemaVersion = 1
    runner = "run-mediapipe-matrix-diagnostic.ps1"
    status = $status
    exitCode = if ($status -eq "success") { 0 } else { 1 }
    executablePath = [System.IO.Path]::GetFileName($resolvedExecutable)
    events = @($events)
    diagnostic = $diagnostic
    error = if ($errorCode) { [pscustomobject]@{ code = $errorCode; message = $errorMessage } } else { $null }
} | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $outputPath -Encoding utf8

Write-Output "MediaPipe matrix diagnostic status: $status"
Write-Output "MediaPipe matrix diagnostic JSON: $outputPath"
if ($status -ne "success") { exit 1 }
