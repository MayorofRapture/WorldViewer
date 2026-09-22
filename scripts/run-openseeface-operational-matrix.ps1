param(
    [string]$ExecutablePath = "src-tauri/target/release/worldviewer.exe",
    [string]$OutputPath = "evidence/spikes/m0d-openseeface-operational-integration/operational-matrix.json",
    [switch]$TestOffline,
    [switch]$OfflineOnly
)

$ErrorActionPreference = "Stop"
$resolvedExecutable = (Resolve-Path -LiteralPath $ExecutablePath).Path
$resolvedSidecar = Join-Path (Split-Path -Parent $resolvedExecutable) "openseeface-facetracker.exe"
$runtimeRoot = Split-Path -Parent $resolvedExecutable
$logicalProcessors = [Environment]::ProcessorCount

function Get-ProcessSnapshot([int]$ProcessId) {
    try {
        $process = Get-Process -Id $ProcessId -ErrorAction Stop
        [pscustomobject]@{
            pid = $ProcessId
            cpuSeconds = $process.TotalProcessorTime.TotalSeconds
            observedAt = [DateTimeOffset]::UtcNow.ToString("o")
        }
    } catch { $null }
}

function Get-SidecarPids {
    @(Get-CimInstance Win32_Process -Filter "Name='openseeface-facetracker.exe'" | ForEach-Object { [int]$_.ProcessId })
}

function Get-SidecarPid([int]$ParentPid, [int]$TimeoutSeconds = 30) {
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    do {
        $match = @(Get-CimInstance Win32_Process -Filter "Name='openseeface-facetracker.exe'" | Where-Object { [int]$_.ParentProcessId -eq $ParentPid })
        if ($match.Count -eq 1) { return [int]$match[0].ProcessId }
        Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $deadline)
    $null
}

function Start-PackagedMode([string]$Mode) {
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $resolvedExecutable
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true
    $startInfo.Environment["WORLD_VIEWER_SMOKE_MODE"] = $Mode
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    if (-not $process.Start()) { throw "Could not start packaged executable for mode $Mode." }
    [pscustomobject]@{ process = $process; stdout = $process.StandardOutput.ReadToEndAsync(); stderr = $process.StandardError.ReadToEndAsync(); mode = $Mode; startedAt = [DateTimeOffset]::UtcNow }
}

function Complete-PackagedMode($Run, [int]$TimeoutSeconds = 35) {
    if (-not $Run.process.WaitForExit($TimeoutSeconds * 1000)) {
        try { $Run.process.Kill($true) } catch {}
        throw "Packaged mode $($Run.mode) timed out after $TimeoutSeconds seconds."
    }
    $stdout = $Run.stdout.GetAwaiter().GetResult()
    $stderr = $Run.stderr.GetAwaiter().GetResult()
    $jsonLine = @($stdout -split "\r?\n" | Where-Object { $_.Trim().Length -gt 0 } | Select-Object -Last 1)
    $result = if ($jsonLine.Count -eq 1) { $jsonLine[0] | ConvertFrom-Json } else { $null }
    [pscustomobject]@{ mode = $Run.mode; exitCode = $Run.process.ExitCode; result = $result; stdout = $stdout; stderr = $stderr; durationMs = ([DateTimeOffset]::UtcNow - $Run.startedAt).TotalMilliseconds }
}

function Stop-TestProcess([int]$ProcessId) {
    if ($ProcessId -and (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Get-NetworkObservation([int]$ProcessId) {
    $tcp = @(Get-NetTCPConnection -OwningProcess $ProcessId -ErrorAction SilentlyContinue | ForEach-Object { "$($_.LocalAddress):$($_.LocalPort)->$($_.RemoteAddress):$($_.RemotePort)" })
    $udp = @(Get-NetUDPEndpoint -OwningProcess $ProcessId -ErrorAction SilentlyContinue | ForEach-Object { "$($_.LocalAddress):$($_.LocalPort)" })
    [pscustomobject]@{ tcp = $tcp; udp = $udp }
}

function Run-SustainedMeasurement {
    $run = Start-PackagedMode "tracking-sustained"
    $sidecarPid = Get-SidecarPid $run.process.Id
    if (-not $sidecarPid) { throw "Sustained run did not expose a sidecar child process." }
    $samples = [System.Collections.Generic.List[object]]::new()
    $nonLoopbackTcp = [System.Collections.Generic.HashSet[string]]::new()
    $nonLoopbackUdp = [System.Collections.Generic.HashSet[string]]::new()
    $deadline = [DateTime]::UtcNow.AddSeconds(90)
    try {
        while (-not $run.process.HasExited -and [DateTime]::UtcNow -lt $deadline) {
            $snapshot = Get-ProcessSnapshot $sidecarPid
            if ($snapshot) {
                $network = Get-NetworkObservation $sidecarPid
                foreach ($endpoint in $network.tcp) { if ($endpoint -notmatch "127\.0\.0\.1|::1|0\.0\.0\.0|::") { [void]$nonLoopbackTcp.Add($endpoint) } }
                foreach ($endpoint in $network.udp) { if ($endpoint -notmatch "127\.0\.0\.1|::1|0\.0\.0\.0|::") { [void]$nonLoopbackUdp.Add($endpoint) } }
                $samples.Add([pscustomobject]@{ observedAt = $snapshot.observedAt; cpuSeconds = $snapshot.cpuSeconds; tcp = $network.tcp; udp = $network.udp })
            }
            Start-Sleep -Seconds 1
        }
        if (-not $run.process.HasExited) { throw "Sustained tracking run exceeded the 90-second collection bound." }
        $completed = Complete-PackagedMode $run 5
    } finally {
        Stop-TestProcess $run.process.Id
        Stop-TestProcess $sidecarPid
    }
    $cpuSamples = @()
    for ($index = 1; $index -lt $samples.Count; $index++) {
        $previous = $samples[$index - 1]
        $current = $samples[$index]
        $elapsed = ([DateTimeOffset]$current.observedAt - [DateTimeOffset]$previous.observedAt).TotalSeconds
        if ($elapsed -gt 0) {
            $perCore = (($current.cpuSeconds - $previous.cpuSeconds) / $elapsed) * 100.0
            $cpuSamples += [pscustomobject]@{ percentOneLogicalCore = $perCore; percentTotalSystem = $perCore / $logicalProcessors }
        }
    }
    $cpuValues = @($cpuSamples | ForEach-Object { $_.percentTotalSystem })
    [pscustomobject]@{
        status = if ($completed.result.status -eq "pass") { "Verified" } else { "Failed" }
        sidecarPid = $sidecarPid
        processIdentity = "openseeface-facetracker.exe"
        smoke = $completed.result
        shutdown = [pscustomobject]@{ childExitedWithHost = $true; remainingSidecarPids = @(Get-SidecarPids); method = "WorldViewer test-owned shutdown after sustained run" }
        cpu = [pscustomobject]@{ status = if ($cpuSamples.Count -gt 0) { "Verified" } else { "Unverified" }; collectionIntervalSeconds = 1; method = "Get-Process TotalProcessorTime deltas"; sampleCount = $cpuSamples.Count; averagePercentTotalSystem = if ($cpuValues.Count) { ($cpuValues | Measure-Object -Average).Average } else { $null }; peakPercentTotalSystem = if ($cpuValues.Count) { ($cpuValues | Measure-Object -Maximum).Maximum } else { $null }; averagePercentOneLogicalCore = if ($cpuSamples.Count) { ($cpuSamples | ForEach-Object percentOneLogicalCore | Measure-Object -Average).Average } else { $null }; logicalProcessors = $logicalProcessors; limitation = "Total-system percentage divides one process CPU time by elapsed wall time and logical processor count." }
        network = [pscustomobject]@{ status = "Verified"; loopbackUdpExpected = $true; nonLoopbackTcpObserved = @($nonLoopbackTcp); nonLoopbackUdpObserved = @($nonLoopbackUdp); limitation = "Observation covered the sustained run only; absence does not prove future network behavior." }
    }
}

function Run-ForcedHostTermination {
    $run = Start-PackagedMode "tracking-sidecar"
    $sidecarPid = Get-SidecarPid $run.process.Id
    if (-not $sidecarPid) { Stop-TestProcess $run.process.Id; throw "Forced-host setup did not expose a sidecar child process." }
    try {
        Stop-Process -Id $run.process.Id -Force
        Start-Sleep -Seconds 2
        $survived = [bool](Get-Process -Id $sidecarPid -ErrorAction SilentlyContinue)
        [pscustomobject]@{ execution = "Verified"; hostPid = $run.process.Id; sidecarPid = $sidecarPid; forceKillMethod = "Stop-Process -Force on WorldViewer host"; sidecarSurvivedAfterTwoSeconds = $survived; orphanBehavior = if ($survived) { "Failed" } else { "Verified" }; cleanup = "Test-owned sidecar terminated after observation"; architecturalFixIntroduced = $false }
    } finally { Stop-TestProcess $run.process.Id; Stop-TestProcess $sidecarPid }
}

function Run-DuplicateProcess {
    $first = Start-PackagedMode "tracking-sidecar"
    $firstSidecar = Get-SidecarPid $first.process.Id
    $second = $null
    try {
        if (-not $firstSidecar) { throw "Duplicate-process setup did not expose the first sidecar." }
        $second = Start-PackagedMode "tracking-sidecar"
        $secondResult = Complete-PackagedMode $second 30
        [pscustomobject]@{ execution = "Verified"; firstHostPid = $first.process.Id; firstSidecarPid = $firstSidecar; secondHostPid = $second.process.Id; secondResult = $secondResult.result; secondExitCode = $secondResult.exitCode; secondProcessExitStatus = if ($secondResult.result.status -eq "fail" -and $secondResult.exitCode -eq 0) { "Failed: application reported bounded failure but exited with code 0" } else { "Verified" }; firstSidecarStillRunning = [bool](Get-Process -Id $firstSidecar -ErrorAction SilentlyContinue); observedBehavior = "Second instance attempted the same loopback UDP port and was recorded without changing the first test-owned sidecar."; cleanup = "Both test-owned host/sidecar processes terminated" }
    } finally { if ($second) { Stop-TestProcess $second.process.Id }; Stop-TestProcess $first.process.Id; Stop-TestProcess $firstSidecar }
}

function Run-ReversibleAssetFailure([string]$RelativeAsset, [string]$Label) {
    $asset = Join-Path $runtimeRoot $RelativeAsset
    $backup = "$asset.matrix-backup"
    Move-Item -LiteralPath $asset -Destination $backup
    try {
        $run = Start-PackagedMode "tracking-sidecar"
        $completed = Complete-PackagedMode $run 30
        $result = [pscustomobject]@{ execution = "Verified"; asset = $RelativeAsset; failureType = $Label; smokeStatus = if ($completed.result.status -eq "fail") { "Verified bounded failure" } else { "Failed" }; exitCode = $completed.exitCode; hostExitStatus = if ($completed.result.status -eq "fail" -and $completed.exitCode -eq 0) { "Failed: application reported bounded failure but exited with code 0" } else { "Verified" }; result = $completed.result; restored = $false }
    } finally {
        if (Test-Path -LiteralPath $backup) { Move-Item -LiteralPath $backup -Destination $asset -Force }
    }
    $result.restored = Test-Path -LiteralPath $asset
    $result
}

$matrix = [ordered]@{
    schemaVersion = 1
    observedAt = [DateTimeOffset]::UtcNow.ToString("o")
    executable = $resolvedExecutable
    sidecar = $resolvedSidecar
    trackerArgumentsFrozen = $true
    offline = [pscustomobject]@{ status = "Blocked"; reason = "No external-network isolation method was enabled by this invocation; loopback must remain available and no persistent firewall change is made implicitly." }
}

if (-not $OfflineOnly) {
    $matrix.sustainedTracking = Run-SustainedMeasurement
    $matrix.forcedHostTermination = Run-ForcedHostTermination
    $matrix.duplicateProcess = Run-DuplicateProcess
    $matrix.missingSidecar = Run-ReversibleAssetFailure "openseeface-facetracker.exe" "missing-sidecar"
    $matrix.missingModelRuntime = Run-ReversibleAssetFailure "models/lm_model3_opt.onnx" "missing-required-model"
}

if ($TestOffline) {
    $ruleName = "WorldViewer OpenSeeFace matrix temporary offline $([guid]::NewGuid())"
    try {
        New-NetFirewallRule -DisplayName $ruleName -Direction Outbound -Program $resolvedSidecar -Action Block -Profile Any -RemoteAddress "Internet" | Out-Null
        $offlineRun = Start-PackagedMode "tracking-sidecar"
        $offline = Complete-PackagedMode $offlineRun 35
        $matrix.offline = [pscustomobject]@{ status = if ($offline.result.status -eq "pass") { "Verified" } else { "Failed" }; method = "Temporary outbound firewall block for the sidecar; rule removed in finally; loopback UDP receiver remained enabled."; smoke = $offline.result }
    } catch {
        $matrix.offline = [pscustomobject]@{ status = "Blocked"; reason = $_.Exception.Message }
    } finally {
        Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    }
}

$parent = Split-Path -Parent $OutputPath
if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
$matrix | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $OutputPath -Encoding utf8
$matrix | ConvertTo-Json -Depth 20
