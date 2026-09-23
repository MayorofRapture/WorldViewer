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

## Execution result

The packaged application started and the benchmark wrote a `benchmark-start`
event, but WebView2 camera acquisition did not resolve within the bounded
20-second timeout. A visible-window retry produced the same result and no
camera permission prompt. Therefore the active MediaPipe conditions were not
measured; no cadence, inference timing, or active CPU claim is valid.

- 24 Hz opportunity: **Blocked** at camera acquisition; see
  `mediapipe-24hz.json`.
- 20 Hz cap: not run after the explicit camera-access stop condition.
- idle host baseline: captured with a preliminary sampler window, but its
  formal end event was unavailable in that run; CPU baseline is **Unverified**
  and must not be used for a comparison claim.

The packaged release executable itself was built successfully with
`npx.cmd tauri build --no-bundle`. The claim-bearing full bundle build also
produced the executable and MSI/NSIS stages, but a later rerun failed in the
environment at WiX `light.exe`; this is recorded as a packaging-environment
limitation, not a MediaPipe result.

## Classification

**Blocked** — packaged WebView2 camera access could not be obtained after the
bounded retry. The spike establishes local asset/package/build plumbing only;
it does not answer the MediaPipe performance question.

