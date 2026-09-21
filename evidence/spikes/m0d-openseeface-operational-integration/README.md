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

The approximately 8.99 Hz cadence is an observation from this short smoke,
not formal tracking-performance acceptance. The Testing Strategy requires a
10-second warm-up followed by a 60-second measurement window for standard
performance measurement, so tracking performance acceptance remains
Unverified. The larger operational-integration matrix also remains
unverified and out of scope; this evidence makes no OpenSeeFace
production-adoption recommendation.
