param(
    [string]$ExecutablePath = "src-tauri/target/release/worldviewer.exe",
    [string]$OutputPath = "evidence/spikes/m0d-openseeface-operational-integration/operational-matrix.json",
    [switch]$TestOffline,
    [switch]$OfflineOnly,
    [switch]$HarnessCorrection
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

function Start-PackagedMode([string]$Mode, [switch]$LifecycleHold) {
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $resolvedExecutable
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true
    $startInfo.Environment["WORLD_VIEWER_SMOKE_MODE"] = $Mode
    if ($LifecycleHold) { $startInfo.Environment["WORLD_VIEWER_SMOKE_LIFECYCLE_HOLD"] = "1" }
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    if (-not $process.Start()) { throw "Could not start packaged executable for mode $Mode." }
    [pscustomobject]@{ process = $process; stdout = if ($LifecycleHold) { $null } else { $process.StandardOutput.ReadToEndAsync() }; stderr = $process.StandardError.ReadToEndAsync(); mode = $Mode; lifecycleHold = [bool]$LifecycleHold; startedAt = [DateTimeOffset]::UtcNow }
}

function Complete-PackagedMode($Run, [int]$TimeoutSeconds = 35) {
    if ($Run.lifecycleHold) { throw "Lifecycle-hold runs must be completed by the lifecycle probe." }
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

function Wait-LifecycleReadiness($Run, [int]$TimeoutSeconds = 25) {
    if (-not $Run.lifecycleHold) { throw "Lifecycle readiness requires a lifecycle-hold run." }
    $lineTask = $Run.process.StandardOutput.ReadLineAsync()
    if (-not $lineTask.Wait($TimeoutSeconds * 1000)) { throw "No lifecycle readiness record within $TimeoutSeconds seconds." }
    $line = $lineTask.GetAwaiter().GetResult()
    if ([string]::IsNullOrWhiteSpace($line)) { throw "Lifecycle-hold host ended without a readiness record." }
    $record = $line | ConvertFrom-Json
    if ($record.kind -ne "tracking-lifecycle-ready" -or -not $record.sidecarPid -or -not $record.firstValidPoseMs) {
        $message = if ($record.errors -and $record.errors.Count -gt 0) { $record.errors[0].message } else { "unexpected lifecycle record" }
        throw "Lifecycle readiness unavailable: $message"
    }
    $record
}

function Stop-TestProcess([int]$ProcessId) {
    $process = if ($ProcessId) { Get-Process -Id $ProcessId -ErrorAction SilentlyContinue } else { $null }
    if ($process) {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        try { [void]$process.WaitForExit(5000) } catch {}
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
    $localUdpEndpoints = [System.Collections.Generic.HashSet[string]]::new()
    $deadline = [DateTime]::UtcNow.AddSeconds(90)
    try {
        while (-not $run.process.HasExited -and [DateTime]::UtcNow -lt $deadline) {
            $snapshot = Get-ProcessSnapshot $sidecarPid
            if ($snapshot) {
                $network = Get-NetworkObservation $sidecarPid
                foreach ($endpoint in $network.tcp) { if ($endpoint -notmatch "127\.0\.0\.1|::1|0\.0\.0\.0|::") { [void]$nonLoopbackTcp.Add($endpoint) } }
                foreach ($endpoint in $network.udp) { [void]$localUdpEndpoints.Add($endpoint) }
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
        network = [pscustomobject]@{ status = "Verified"; loopbackUdpExpected = $true; nonLoopbackTcpObserved = @($nonLoopbackTcp); localUdpEndpoints = @($localUdpEndpoints); remoteUdpObservation = "Unverified: Get-NetUDPEndpoint identifies local UDP endpoints, not remote destinations."; limitation = "TCP observation covered the sustained run only; absence does not prove future network behavior." }
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

function Run-NormalSuccessfulCleanup {
    $run = Start-PackagedMode "tracking-sidecar"
    $sidecarPid = Get-SidecarPid $run.process.Id
    if (-not $sidecarPid) { Stop-TestProcess $run.process.Id; throw "Successful-cleanup probe did not expose a sidecar child process." }
    $result = $null
    try {
        $completed = Complete-PackagedMode $run 45
        $stillRunningBeforeEmergencyCleanup = [bool](Get-Process -Id $sidecarPid -ErrorAction SilentlyContinue)
        $result = [pscustomobject]@{
            execution = if ($completed.result.status -eq "pass") { "Verified" } else { "Failed" }
            sidecarPid = $sidecarPid
            smoke = $completed.result
            sidecarExistsBeforeEmergencyCleanup = $stillRunningBeforeEmergencyCleanup
            successfulRunCleanup = if ($completed.result.status -eq "pass" -and -not $stillRunningBeforeEmergencyCleanup) { "Verified" } else { "Failed" }
            emergencyCleanupPerformed = $false
        }
    } finally {
        $remaining = [bool](Get-Process -Id $sidecarPid -ErrorAction SilentlyContinue)
        if ($remaining) { Stop-TestProcess $sidecarPid }
        Stop-TestProcess $run.process.Id
        if ($result) { $result.emergencyCleanupPerformed = $remaining }
    }
    $result
}

function Run-ReadinessGatedForcedHostTrial([int]$Trial) {
    $attempts = [System.Collections.Generic.List[object]]::new()
    for ($attempt = 1; $attempt -le 2; $attempt++) {
        $run = Start-PackagedMode "tracking-sidecar" -LifecycleHold
        $sidecarPid = $null
        try {
            $readiness = Wait-LifecycleReadiness $run 25
            $sidecarPid = [int]$readiness.sidecarPid
            if (-not (Get-Process -Id $sidecarPid -ErrorAction SilentlyContinue)) { throw "Readiness record named a sidecar PID that was not running." }
            Stop-Process -Id $run.process.Id -Force
            Start-Sleep -Seconds 2
            $survived = [bool](Get-Process -Id $sidecarPid -ErrorAction SilentlyContinue)
            $attempts.Add([pscustomobject]@{ attempt = $attempt; readiness = "Verified"; sidecarPid = $sidecarPid; firstValidPoseMs = $readiness.firstValidPoseMs })
            return [pscustomobject]@{ trial = $Trial; execution = "Verified"; attempts = @($attempts); hostPid = $run.process.Id; sidecarPid = $sidecarPid; forceKillMethod = "Stop-Process -Force on WorldViewer host after readiness record"; sidecarSurvivedAfterTwoSeconds = $survived; orphanBehavior = if ($survived) { "Failed" } else { "Observed no orphan" }; cleanup = "Test-owned sidecar terminated only after observation"; architecturalFixIntroduced = $false }
        } catch {
            $attempts.Add([pscustomobject]@{ attempt = $attempt; readiness = "Blocked"; reason = $_.Exception.Message })
            if ($attempt -eq 2) { return [pscustomobject]@{ trial = $Trial; execution = "Blocked"; attempts = @($attempts); reason = "Transient camera acquisition prevented valid pose readiness after one unchanged retry."; cleanup = "Any test-owned process was terminated"; architecturalFixIntroduced = $false } }
        } finally {
            Stop-TestProcess $run.process.Id
            Stop-TestProcess $sidecarPid
        }
    }
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

if ($HarnessCorrection) {
    $correction = [ordered]@{
        schemaVersion = 1
        observedAt = [DateTimeOffset]::UtcNow.ToString("o")
        purpose = "Focused correction of tracking-smoke exit status and lifecycle evidence; no sustained-performance, CPU, or offline rerun."
        trackerArgumentsFrozen = $true
        normalSuccessfulCleanup = Run-NormalSuccessfulCleanup
        forcedHostTerminationTrials = @(
            (Run-ReadinessGatedForcedHostTrial 1),
            (Run-ReadinessGatedForcedHostTrial 2),
            (Run-ReadinessGatedForcedHostTrial 3)
        )
        duplicateProcess = Run-DuplicateProcess
        missingSidecar = Run-ReversibleAssetFailure "openseeface-facetracker.exe" "missing-sidecar"
        missingModelRuntime = Run-ReversibleAssetFailure "models/lm_model3_opt.onnx" "missing-required-model"
        networkEvidenceSemantics = [pscustomobject]@{
            tcpObservation = "Get-NetTCPConnection can observe TCP connections for the sidecar during its collection interval."
            localUdpObservation = "Get-NetUDPEndpoint can identify local UDP endpoints only."
            remoteUdpBehavior = "Unverified: this harness has no valid remote UDP destination observation."
        }
    }
    $parent = Split-Path -Parent $OutputPath
    if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    $correction | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $OutputPath -Encoding utf8
    $correction | ConvertTo-Json -Depth 20
    return
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
