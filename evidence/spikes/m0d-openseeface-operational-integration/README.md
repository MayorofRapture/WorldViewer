# OpenSeeFace packaged operational-integration spike

This evidence path is isolated from production M0D. It evaluates only the
Windows packaged-sidecar lifecycle for the pinned OpenSeeFace v1.20.5 release.

Prepare the ignored package inputs from the already hash-verified staging:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\prepare-openseeface-sidecar.ps1
```

That procedure verifies `facetracker.exe` SHA-256
`ee44485d440a8528cf9ed5c8e4d3a4be750763c34088ab829602f3dc145e25a9`, copies
the upstream PyInstaller collection minus the duplicate executable into a
flat ignored resource root, and supplies Tauri's Windows-target sidecar
filename. The source staging
procedure remains responsible for verifying the official release archive
`OpenSeeFace-v1.20.5.zip` SHA-256
`c9223f3547dce65b09705bb9ff74439b7d36e1c37bbe9668672711cf5aa31147`.

The initial `258c1ab` standard-Tauri package layout failed because Tauri emitted
the external executable separately from the collected PyInstaller runtime,
leaving `python37.dll` away from the sidecar. The bounded flat-resource
correction maps the prepared resource directory to the empty Tauri resource
destination, so the effective Windows application directory contains the
sidecar, `python37.dll`, the other upstream `Binary` files, `models/`, and
`Licenses/` together. A fresh package inspection found no collision with
WorldViewer/Tauri output files. The packaging correction remains Verified.

The first corrected-package camera-acquisition attempt subsequently reached
the OpenSeeFace capture layer but reported `DShowCapture exception: There was
no valid input.` for camera index 0 and produced no valid pose. That remains
historical evidence of a transient, non-reproducing environmental failure; it
is not the current operational state.

Direct staged-versus-packaged A/B checks then showed that both the original
staged executable and the corrected packaged executable enumerated the same
`Integrated Camera`, reported the same DirectShow capabilities, accepted the
exact packaged tracking arguments, and repeatedly produced `Got frame`. Camera
index 0 is therefore Verified as usable by both runtimes, and the corrected
packaged runtime is Verified to acquire camera frames.

Immediately afterward, the unchanged `tracking-sidecar` packaged smoke passed.
It produced valid 3D UDP poses for face ID 0: 69 packets received, 69 valid,
zero invalid, a valid rate of 1.0, and an observed live-pose cadence of about
8.99 Hz. The first valid 3D pose was observed at 2668.7484 ms; mean reported
PnP error was 3.417027227256609; the observation interval was 10001.3117 ms;
OpenSeeFace was v1.20.5 using model 3 with camera `0,640x360` and UDP
`127.0.0.1:11573`. No camera imagery or video is persisted.

The approximately 8.99 Hz cadence was only an observation from this short
smoke, not formal tracking-performance acceptance. The later prescribed
10-second warm-up plus 60-second measurement superseded that uncertainty:
it measured approximately 9.5193 Hz and the >=15 Hz target is Failed. No
performance tuning was performed.

## Follow-on operational matrix

The bounded matrix harness is `scripts/run-openseeface-operational-matrix.ps1`.
It uses the existing packaged executable and frozen tracker arguments; it does
not add production supervision, tuning, dependencies, or tracker changes. The
machine-readable outputs are `operational-matrix.json` (canonical run),
`offline-operation.json` (separate reversible offline probe),
`operational-matrix-history.json` (repeated observations, including a
contradictory forced-host result), and `basic-tracking-smoke.json` (final
basic tracking regression result). `harness-correction.json` records the
focused exit-status and lifecycle-evidence correction without rerunning
performance, CPU, or offline collection.

The canonical sustained run used the prescribed 10.0013-second warm-up and
60.0025-second measurement window. It received 571 packets, all 571 valid
3D poses, zero invalid poses, valid rate 1.0, and 9.519267600510382 Hz live
pose cadence. Inter-pose intervals were 97.4617 ms median, 153.6454 ms p95,
38.5108 ms minimum, and 1016.5388 ms maximum. The 15 Hz useful-pose target
was Failed for this measurement; the 20–30 Hz preferred range was also not
met. No tracker tuning was performed.

CPU collection was Verified using one-second `Get-Process
TotalProcessorTime` deltas for `openseeface-facetracker.exe`: 8.0741% average
and 11.7464% peak of total system capacity, equivalent to 64.5930% average
of one logical core on an eight-logical-processor machine. This is a process
CPU measurement, not a render or motion-to-photon metric.

### Controlled model comparison

The controlled experiments changed only OpenSeeFace `--model` and
`--max-threads`; one face, camera 0, 640x360, requested 24 FPS, gaze disabled,
`--no-3d-adapt 1`, the packaged path, pose-validity rules, and the 10-second
warm-up plus 60-second measurement procedure remained frozen. The model-2
conditions used the pinned v1.20.5 artifact `models/lm_model2_opt.onnx`,
SHA-256 `16b33ba7d854a0643875ab3da3a620b4b650f2a7f032dd6f634f881cac108304`.
The emitted evidence records the actual model, thread count, and complete
tracker argument string.

| Model | Max threads | Cadence Hz | Valid rate | Median interval | P95 interval | Avg CPU total | Peak CPU total | >=15 Hz | 20-30 Hz |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: | :---: |
| 3 | 1 | 9.519267600510382 | 1.0 | 97.4617 ms | 153.6454 ms | 8.0741% | 11.7464% | Failed | Failed |
| 3 | 2 | 23.287370342081577 | 1.0 | 42.6071 ms | 52.5783 ms | 21.2949% | 24.5318% | Passed | Achieved |
| 3 | 4 | 23.334046590710273 | 1.0 | 42.6840 ms | 49.4378 ms | 44.5826% | 46.8093% | Passed | Achieved |
| 2 | 1 | 23.49345795650698 | 1.0 | 42.5016 ms | 46.5205 ms | 8.2772% | 13.1297% | Passed | Achieved |
| 2 | 2 | 23.565253906680063 | 1.0 | 42.4072 ms | 48.9720 ms | 19.7272% | 22.6761% | Passed | Achieved |

The new formal thread-2 run used 10.0000 seconds of warm-up and 60.0006
seconds of measurement, with 1,397 valid poses and zero invalid poses. The
thread-4 run used 10.0021 seconds of warm-up and 60.0002 seconds of
measurement, with 1,399 valid poses and zero invalid poses. Upstream timestamps
were monotonic in both runs. CPU samples used the existing one-second process
`TotalProcessorTime` delta method on the eight-logical-processor machine.

The model-2 / thread-1 run used 10.0005 seconds of warm-up and 60.0023 seconds
of measurement, with 1,410 valid poses and zero invalid poses. The model-2 /
thread-2 run used 10.0021 seconds of warm-up and 60.0010 seconds of
measurement, with 1,414 valid poses and zero invalid poses. Upstream timestamps
were monotonic in both runs. First valid poses occurred at 1843.3890 ms and
2344.3136 ms; mean PnP errors were 2.978487776864505 and 3.293789628202878.
Relative to model 3 / 2 threads, model 2 / 1
threads measured +0.2061 Hz cadence, -13.0177 percentage points average CPU
(61.13% lower), and -11.4021 points peak CPU (46.48% lower). Model 2 / 2
threads measured +0.2779 Hz cadence, -1.5677 points average CPU (7.36% lower),
and -1.8557 points peak CPU (7.56% lower). These are descriptive deltas only.

Raw artifacts are `threading-model3-threads2.json`,
`threading-model3-threads4.json`, `threading-model2-threads1.json`, and
`threading-model2-threads2.json`; the accepted one-thread artifact remains
`operational-matrix.json`. These measurements do not establish model-2
physical-pose equivalence for eye position, near/far reconstruction,
lateral/vertical reconstruction, jitter, or repeatability. No production
adoption decision was made, and remote UDP behavior remains Unverified.

Network observation was Verified only to the extent supported by the tools:
expected loopback UDP pose traffic was established by the application
protocol, and no non-loopback TCP connection was observed during the sustained
interval. `Get-NetUDPEndpoint` identifies local UDP endpoints only, so remote
UDP behavior is Unverified. This short TCP observation does not prove future
network behavior.
The separate offline probe temporarily blocked outbound sidecar traffic using
a reversible Windows Firewall rule, removed the rule afterward, kept loopback
available, and still passed with 83 valid poses and zero invalid poses.

The original normal-cleanup observation remains historical only: it checked
after emergency cleanup. The corrected pre-emergency-cleanup probe could not
obtain a successful valid-pose smoke run because of transient camera
acquisition, so successful-run sidecar cleanup is Unverified. Three corrected
readiness-gated forced-host trials each exhausted one unchanged retry without
valid pose readiness and are Blocked by transient camera acquisition. Earlier
non-readiness-gated forced-host observations remain preserved, but crash/orphan
containment is Unverified because no explicit containment mechanism exists.
No architectural fix was introduced.

The duplicate-process test was Verified as an execution, while the second
instance Failed boundedly on UDP port `11573` and did not disturb the first
sidecar. The missing-sidecar test (`openseeface-facetracker.exe`) and
missing-model test (`models/lm_model3_opt.onnx`) both produced bounded
failure results and restored the package. The corrected fresh duplicate and
missing-asset tests all emitted structured failure and exited with code `1`.

An earlier unchanged basic tracking retry passed with 100 valid poses, but the
two final post-verification basic-smoke attempts both hit the same transient
20-second camera-acquisition invalidation. The latest
`basic-tracking-smoke.json` therefore records Failed; the earlier successful
retry and the later failures are retained in the machine-readable history
rather than being treated as an uninterrupted sequence.

The operational matrix is suitable for higher-level review with these limits:
formal performance acceptance Failed at the 15 Hz target, successful-run
cleanup is Unverified, readiness-gated forced-host trials are Blocked by
transient camera acquisition, crash containment is Unverified, remote UDP
behavior is Unverified, and the latest basic tracking regression is Failed due
to repeated camera acquisition invalidations after an earlier successful retry.
No production-adoption decision was made, and no production tracking
architecture was modified.
