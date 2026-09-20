# OpenSeeFace physical-pose spike

This is isolated spike evidence. It neither changes WorldViewer's production
tracking architecture nor establishes physical-position suitability.

## Prepare the pinned upstream release

From the repository root, on `spike/m0d-openseeface-physical-pose`, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\stage-openseeface-spike.ps1
```

The script obtains only the official `v1.20.5` release, verifies archive SHA-256
`c9223f3547dce65b09705bb9ff74439b7d36e1c37bbe9668672711cf5aa31147`, and
leaves the upstream `Licenses` directory beside `Binary/facetracker.exe`.

## Run the measurement session

Close other applications using the E590 webcam, sit in front of the screen, and run:

```powershell
cargo run --manifest-path src-tauri/Cargo.toml --bin openseeface-spike -- --interactive
```

For every prompt, press Enter when settled, then hold the requested position
still for the fixed 5-second capture. The order is three centered depths
(450/600/750 mm); horizontal -150/0/+150 mm at 600 mm; vertical -100/0/+100 mm
at 600 mm; three centered 600 mm stationary holds; and centered 600 mm neutral,
left/right turn, slight up/down orientation holds.

The runner uses only loopback UDP at `127.0.0.1:11573`, camera index `0`,
640x360 at 24 FPS, one face, OpenSeeFace model `3`, no visualization/video, and
gaze tracking disabled. It persists no camera image or video.

## Return for review

Return the newly created directory under `sessions/`, specifically
`session-metadata.json`, `raw-samples.jsonl`, and `segment-summary.json`.
The raw PnP translation remains explicitly labeled `openseeface-model-units`;
the cyclopean signal is only the uncalibrated midpoint of upstream 3D points 68
and 69. No result in this spike is in WorldViewer millimeters.
