param(
    [string]$ExecutablePath = "src-tauri/target/release/worldviewer.exe",
    [int]$TimeoutSeconds = 30,
    [ValidateSet("launch", "synthetic", "tracking-sidecar", "tracking-sustained")]
    [string]$Mode = "launch",
    [string]$ResultPath,
    [switch]$AllowFailure
)

$resolvedExecutable = (Resolve-Path -LiteralPath $ExecutablePath -ErrorAction Stop).Path
$stdoutPath = Join-Path $env:TEMP ("worldviewer-smoke-" + [guid]::NewGuid() + ".stdout")
$stderrPath = Join-Path $env:TEMP ("worldviewer-smoke-" + [guid]::NewGuid() + ".stderr")

try {
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $resolvedExecutable
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true
    $startInfo.Environment["WORLD_VIEWER_SMOKE_MODE"] = $Mode

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    if (-not $process.Start()) {
        throw "Packaged application could not be started."
    }

    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
        $process.Kill($true)
        throw "Packaged launch smoke timed out after $TimeoutSeconds seconds."
    }

    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    [System.IO.File]::WriteAllText($stdoutPath, $stdout)
    [System.IO.File]::WriteAllText($stderrPath, $stderr)

    $lines = @($stdout -split "\r?\n" | Where-Object { $_.Trim().Length -gt 0 })
    if ($lines.Count -ne 1) {
        throw "Expected exactly one non-empty machine-readable stdout line; received $($lines.Count)."
    }

    $result = $lines[0] | ConvertFrom-Json
    if ($result.schemaVersion -ne 1 -or $result.mode -ne $Mode -or $result.status -notin @("pass", "fail")) {
        throw "Packaged smoke result does not match the requested '$Mode' contract."
    }
    # Preserve machine-readable failure evidence before mode-specific assertions.
    $result | ConvertTo-Json -Depth 10 -Compress
    if ($ResultPath) {
        $result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $ResultPath -Encoding utf8
    }

    if ($Mode -eq "launch") {
        $launchCheck = @($result.checks | Where-Object { $_.id -eq "application-shell-ready" })
        if ($launchCheck.Count -ne 1 -or $launchCheck[0].status -ne "pass") {
            throw "Launch smoke result must contain a passing application-shell-ready check."
        }
    } elseif ($Mode -eq "synthetic") {
        $requiredSyntheticChecks = @(
            "renderer-ready",
            "diagnostic-world-ready",
            "viewer-state-controller-ready",
            "projection-ready",
            "synthetic-sequence-complete"
        )
        foreach ($checkId in $requiredSyntheticChecks) {
            $syntheticCheck = @($result.checks | Where-Object { $_.id -eq $checkId })
            if ($syntheticCheck.Count -ne 1 -or $syntheticCheck[0].status -ne "pass") {
                throw "Synthetic smoke result must contain a passing '$checkId' check."
            }
        }
    } elseif ($Mode -in @("tracking-sidecar", "tracking-sustained")) {
        $expectedCheckId = if ($Mode -eq "tracking-sustained") { "packaged-openseeface-sustained-operational-run" } else { "packaged-openseeface-operational-run" }
        $trackingCheck = @($result.checks | Where-Object { $_.id -eq $expectedCheckId })
        if ($trackingCheck.Count -ne 1 -or ((-not $AllowFailure) -and $trackingCheck[0].status -ne "pass")) {
            throw "Tracking smoke result must contain a passing $expectedCheckId check."
        }
    }

    $expectedExitCode = if ($result.status -eq "pass") { 0 } else { 1 }
    if ($process.ExitCode -ne $expectedExitCode -and -not $AllowFailure) {
        throw "Smoke result status '$($result.status)' mapped to exit code $($process.ExitCode), expected $expectedExitCode."
    }

    if ($result.status -ne "pass" -and -not $AllowFailure) {
        throw "Packaged launch smoke reported failure."
    }
}
finally {
    if (Test-Path -LiteralPath $stdoutPath) { Remove-Item -LiteralPath $stdoutPath -Force }
    if (Test-Path -LiteralPath $stderrPath) { Remove-Item -LiteralPath $stderrPath -Force }
}
