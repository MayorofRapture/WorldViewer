param(
    [string]$ExecutablePath = "src-tauri/target/release/worldviewer.exe",
    [int]$TimeoutSeconds = 30
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
    $startInfo.Environment["WORLD_VIEWER_SMOKE_MODE"] = "launch"

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
    if ($result.schemaVersion -ne 1 -or $result.mode -ne "launch" -or $result.status -notin @("pass", "fail")) {
        throw "Packaged smoke result does not match the frozen launch contract."
    }

    $expectedExitCode = if ($result.status -eq "pass") { 0 } else { 1 }
    if ($process.ExitCode -ne $expectedExitCode) {
        throw "Smoke result status '$($result.status)' mapped to exit code $($process.ExitCode), expected $expectedExitCode."
    }

    $result | ConvertTo-Json -Depth 10
    if ($result.status -ne "pass") {
        throw "Packaged launch smoke reported failure."
    }
}
finally {
    if (Test-Path -LiteralPath $stdoutPath) { Remove-Item -LiteralPath $stdoutPath -Force }
    if (Test-Path -LiteralPath $stderrPath) { Remove-Item -LiteralPath $stderrPath -Force }
}
