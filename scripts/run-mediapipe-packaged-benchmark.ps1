param(
    [string]$ExecutablePath = "src-tauri/target/release/worldviewer.exe",
    [string]$OutputRoot = "evidence/spikes/m0d-mediapipe-packaged-performance",
    [int]$TimeoutSeconds = 100,
    [ValidateSet("all", "mediapipe-idle", "mediapipe-24hz", "mediapipe-20hz")]
    [string]$OnlyMode = "all",
    [switch]$Visible
)

$ErrorActionPreference = "Stop"
$resolvedExecutable = (Resolve-Path -LiteralPath $ExecutablePath).Path
$resolvedOutput = (Resolve-Path -LiteralPath (New-Item -ItemType Directory -Force -Path $OutputRoot)).Path
$logicalProcessors = [Environment]::ProcessorCount

function Get-EpochMs {
    return ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
}

function Get-TreeSnapshot([int]$RootPid) {
    $processes = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId)
    $ids = [System.Collections.Generic.HashSet[int]]::new()
    [void]$ids.Add($RootPid)
    $changed = $true
    while ($changed) {
        $changed = $false
        foreach ($process in $processes) {
            if ($ids.Contains([int]$process.ParentProcessId) -and $ids.Add([int]$process.ProcessId)) { $changed = $true }
        }
    }
    $cpuMs = 0.0
    $workingSet = 0L
    $processCpu = @{}
    foreach ($id in $ids) {
        try {
            $process = Get-Process -Id $id -ErrorAction Stop
            $processCpu[[string]$id] = $process.TotalProcessorTime.TotalMilliseconds
            $cpuMs += $processCpu[[string]$id]
            $workingSet += $process.WorkingSet64
        } catch { }
    }
    [pscustomobject]@{ epochMs = Get-EpochMs; cpuMs = $cpuMs; processCpu = $processCpu; workingSetBytes = $workingSet; processIds = @($ids) }
}

function Invoke-BenchmarkRun([string]$Mode, [string]$RunOutput) {
    $eventPath = Join-Path $env:TEMP ("worldviewer-mediapipe-events-" + [guid]::NewGuid() + ".jsonl")
    $stdoutPath = Join-Path $env:TEMP ("worldviewer-mediapipe-stdout-" + [guid]::NewGuid() + ".txt")
    $stderrPath = Join-Path $env:TEMP ("worldviewer-mediapipe-stderr-" + [guid]::NewGuid() + ".txt")
    try {
        $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
        $startInfo.FileName = $resolvedExecutable
        $startInfo.UseShellExecute = $false
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        $startInfo.CreateNoWindow = -not $Visible
        $startInfo.Environment["WORLD_VIEWER_SMOKE_MODE"] = $Mode
        $startInfo.Environment["WORLD_VIEWER_BENCHMARK_EVENT_PATH"] = $eventPath
        $process = [System.Diagnostics.Process]::new()
        $process.StartInfo = $startInfo
        if (-not $process.Start()) { throw "Could not start packaged WorldViewer for $Mode." }
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $samples = [System.Collections.Generic.List[object]]::new()
        $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
        while (-not $process.HasExited -and (Get-Date) -lt $deadline) {
            $samples.Add((Get-TreeSnapshot $process.Id))
            Start-Sleep -Milliseconds 1000
        }
        if (-not $process.HasExited) {
            $process.Kill()
            $process.WaitForExit(5000)
            $stdout = $stdoutTask.GetAwaiter().GetResult()
            $stderr = $stderrTask.GetAwaiter().GetResult()
            [pscustomobject]@{ mode = $Mode; status = "Failed"; error = "timeout"; stdout = $stdout; stderr = $stderr; events = if (Test-Path -LiteralPath $eventPath) { @(Get-Content -LiteralPath $eventPath | ForEach-Object { $_ | ConvertFrom-Json }) } else { @() } } | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $RunOutput -Encoding utf8
            throw "Packaged MediaPipe $Mode benchmark timed out."
        }
        $samples.Add((Get-TreeSnapshot $process.Id))
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        [System.IO.File]::WriteAllText($stdoutPath, $stdout)
        [System.IO.File]::WriteAllText($stderrPath, $stderr)
        $events = if (Test-Path -LiteralPath $eventPath) { @(Get-Content -LiteralPath $eventPath | ForEach-Object { $_ | ConvertFrom-Json }) } else { @() }
        $formalStart = $events | Where-Object kind -eq "formal-start" | Select-Object -First 1
        $formalEnd = $events | Where-Object kind -eq "formal-end" | Select-Object -First 1
        $window = @($samples | Where-Object { $formalStart -and $formalEnd -and $_.epochMs -ge $formalStart.hostEpochMs -and $_.epochMs -le $formalEnd.hostEpochMs })
        $formalWindowFallback = $false
        if ($window.Count -eq 0 -and $samples.Count -gt 0) { $window = @($samples); $formalWindowFallback = $true }
        $intervalRates = [System.Collections.Generic.List[double]]::new()
        for ($i = 1; $i -lt $window.Count; $i++) {
            $deltaCpu = 0.0
            foreach ($pid in $window[$i].processCpu.PSObject.Properties.Name) {
                if ($window[$i - 1].processCpu.PSObject.Properties.Name -contains $pid) { $deltaCpu += [double]$window[$i].processCpu.$pid - [double]$window[$i - 1].processCpu.$pid }
            }
            $deltaWall = $window[$i].epochMs - $window[$i - 1].epochMs
            if ($deltaWall -gt 0) { $intervalRates.Add((100.0 * $deltaCpu / $deltaWall) / $logicalProcessors) }
        }
        $detail = if ($Mode -eq "mediapipe-idle") { $null } else {
            $resultLine = @($stdout -split "\r?\n" | Where-Object { $_.Trim().Length -gt 0 } | Select-Object -Last 1)
            if ($resultLine.Count -eq 1) { ($resultLine[0] | ConvertFrom-Json).checks[0].detail | ConvertFrom-Json } else { $null }
        }
        [pscustomobject]@{
            mode = $Mode
            exitCode = $process.ExitCode
            processTreeMethod = "Win32_Process parent-process traversal rooted at packaged WorldViewer PID; TotalProcessorTime and WorkingSet64 summed for the same tree each one-second sample"
            logicalProcessors = $logicalProcessors
            sampleIntervalMs = 1000
            sampleCount = $window.Count
            formalStartEpochMs = if ($formalStart) { $formalStart.hostEpochMs } else { $null }
            formalEndEpochMs = if ($formalEnd) { $formalEnd.hostEpochMs } else { $null }
            formalWindowFallback = $formalWindowFallback
            events = $events
            processTreeCpuAveragePercent = if ($intervalRates.Count) { ($intervalRates | Measure-Object -Average).Average } else { $null }
            processTreeCpuPeakPercent = if ($intervalRates.Count) { ($intervalRates | Measure-Object -Maximum).Maximum } else { $null }
            processTreeWorkingSetAverageBytes = if ($window.Count) { ($window.workingSetBytes | Measure-Object -Average).Average } else { $null }
            processTreeWorkingSetPeakBytes = if ($window.Count) { ($window.workingSetBytes | Measure-Object -Maximum).Maximum } else { $null }
            metric = $detail
            stdout = $stdout
            stderr = $stderr
        } | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $RunOutput -Encoding utf8
    } finally {
        foreach ($path in @($eventPath, $stdoutPath, $stderrPath)) { if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force } }
    }
}

if ($OnlyMode -in @("all", "mediapipe-idle")) { Invoke-BenchmarkRun "mediapipe-idle" (Join-Path $resolvedOutput "idle-baseline.json") }
if ($OnlyMode -in @("all", "mediapipe-24hz")) { Invoke-BenchmarkRun "mediapipe-24hz" (Join-Path $resolvedOutput "mediapipe-24hz.json") }
if ($OnlyMode -in @("all", "mediapipe-20hz")) { Invoke-BenchmarkRun "mediapipe-20hz" (Join-Path $resolvedOutput "mediapipe-20hz.json") }
Write-Output "MediaPipe packaged benchmark evidence written to $resolvedOutput"
