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

Sit normally with your face visible and press Enter to begin the required
tracking preflight. It must receive and decode a valid 3D loopback pose before
the measurement plan begins; otherwise it terminates the tracker and prints a
camera-discovery hint. For every later prompt, press Enter when settled, then
hold the requested position still for the fixed 5-second capture. Depth is the
approximate distance from the physical screen plane outward to the midpoint
between your eyes (the cyclopean eye). Centered means that cyclopean eye is
approximately aligned with display center. The order is three centered depths
(450/600/750 mm); horizontal -150/0/+150 mm at 600 mm; vertical -100/0/+100 mm
at 600 mm; three centered 600 mm stationary holds; and centered 600 mm neutral,
left/right turn, slight up/down orientation holds.

The runner uses only loopback UDP at `127.0.0.1:11573`, camera index `0`,
640x360 at 24 FPS, one face, OpenSeeFace model `3`, no visualization/video, and
gaze tracking disabled. It persists no camera image or video.

## Return for review

Return the newly created directory under `sessions/`, specifically
`session-metadata.json`, `raw-samples.jsonl`, and `segment-summary.json`.
The raw PnP translation remains explicitly labeled `openseeface-model-units`.
The restored tracker-local midpoint of wire points 68/69 is retained only as a
diagnostic. The primary cyclopean signal restores the wire signs, normalizes
the raw OpenSeeFace quaternion, conjugates its vector component before the
conventional quaternion-to-matrix formula, then applies that object-to-camera
rotation and raw PnP translation. The raw packet quaternion is preserved
unchanged, and the resulting candidate remains uncalibrated
`openseeface-model-units`. No result in this spike is in WorldViewer millimeters.
