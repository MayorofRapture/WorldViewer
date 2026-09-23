# Packaged MediaPipe Face Landmarker performance spike

This is an isolated M0D measurement spike. It does not select the production
tracker, supersede ADR-005/ADR-006, replace OpenSeeFace, or establish pose
accuracy.

## Provenance and local assets

- package: `@mediapipe/tasks-vision@1.0.1`, npm source
  `https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-1.0.1.tgz`
- package license metadata: Apache-2.0
- model source: official Google MediaPipe model URL
  `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`
- model filename: `face_landmarker.task`
- model size: 3,758,596 bytes
- model SHA-256:
  `64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF`
- WASM/runtime files were copied from the pinned npm package into
  `public/mediapipe/wasm/`; their byte sizes and hashes are recorded in
  `provenance.json`.

The exact artifact-specific redistribution and embedded-model terms were not
established by the official sources inspected for this spike. The authorized
M0D selection exception permits this isolated experiment only; it is not a
general redistribution-rights claim.

## Intended packaged path

The spike uses a packaged Tauri/WebView2 application, a dedicated module Web
Worker, local WASM/model URLs, `VIDEO` running mode, CPU delegate, one face,
facial transformation matrices enabled, blendshapes disabled, and the official
default confidence thresholds. Main-thread frame submission uses one active
inference and one replaceable pending frame; no FIFO is created.

The requested camera settings were 640x360 at 24 FPS, with the integrated
camera and no audio. The benchmark has explicit idle, 24 Hz opportunity, and
20 Hz cap startup modes.

## Original blocked result and correction

The original packaged run was blocked because `getUserMedia()` remained
pending for 20 seconds and no permission prompt appeared. The correction
installs a WebView2 `PermissionRequested` handler only for the explicit
MediaPipe benchmark modes. It allows only camera requests from the packaged
`http://tauri.localhost/` origin and leaves all other permission kinds at their
default behavior. Each run uses a fresh temporary WebView2 profile so a prior
persisted denial cannot bypass the handler.

## Corrected rerun

The corrected runs observed handler installation, an allowed camera permission
request, `getUserMedia()` resolution, and negotiated settings of 640x360 at 24
FPS. The page was a secure context. MediaPipe initialization also completed in
the dedicated module worker after switching the resolver to the official
module-loader form required by a module worker.

- idle host baseline: **Verified**; clean 60-second formal window with
  average process-tree CPU 0.2471% and peak 4.5168%.
- 24 Hz opportunity: **Blocked** after camera and initialization succeeded but
  no useful face result arrived to begin warm-up; see `mediapipe-24hz.json`.
- 20 Hz cap: **Blocked** for the same no-valid-face condition; see
  `mediapipe-20hz.json`.

No cadence, inference timing, or active CPU claim is valid. The required
10-second warm-up and 60-second formal windows did not begin.

The packaged release executable itself was built successfully with
`npx.cmd tauri build --no-bundle`. The claim-bearing full bundle build also
produced the executable and MSI/NSIS stages, but a later rerun failed in the
environment at WiX `light.exe`; this is recorded as a packaging-environment
limitation, not a MediaPipe result.

## Classification

**Blocked** — packaged camera permission/acquisition and MediaPipe worker
initialization are corrected and verified, but the formal performance
conditions cannot start without a useful face result. The spike does not answer
the MediaPipe performance question and does not select a production tracker.
