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

The initial `258c1ab` package layout failed because Tauri emitted the external
executable separately from the collected PyInstaller runtime, leaving
`python37.dll` away from the sidecar. The bounded correction maps the prepared
resource directory to the empty Tauri resource destination, so the effective
Windows application directory contains the sidecar, `python37.dll`, the other
upstream `Binary` files, `models/`, and `Licenses/` together. A fresh package
inspection found no collision with WorldViewer/Tauri output files.

The corrected packaged launch and synthetic smokes passed. The corrected
tracking-sidecar smoke remained failed: the sidecar loaded far enough to report
`DShowCapture exception: There was no valid input.` and exited without a valid
`got_3d_points` packet for camera index 0. This is a camera-input failure on the
verification machine, not the original Python-DLL packaging failure. No camera
imagery or video is persisted.

The larger operational-integration matrix remains unverified and out of scope;
this correction makes no OpenSeeFace production-adoption recommendation.
