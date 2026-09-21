# OpenSeeFace packaged operational-integration spike

This evidence path is isolated from production M0D. It evaluates only the
Windows packaged-sidecar lifecycle for the pinned OpenSeeFace v1.20.5 release.

Prepare the ignored package inputs from the already hash-verified staging:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\prepare-openseeface-sidecar.ps1
```

That procedure verifies `facetracker.exe` SHA-256
`ee44485d440a8528cf9ed5c8e4d3a4be750763c34088ab829602f3dc145e25a9`, copies
the complete upstream runtime (including `Licenses`) to ignored build inputs,
and supplies Tauri's Windows-target sidecar filename. The source staging
procedure remains responsible for verifying the official release archive
`OpenSeeFace-v1.20.5.zip` SHA-256
`c9223f3547dce65b09705bb9ff74439b7d36e1c37bbe9668672711cf5aa31147`.

The operational runner and its evidence script will be added with the spike
implementation. No camera imagery or video is persisted.
