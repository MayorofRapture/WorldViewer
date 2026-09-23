# OpenSeeFace model-2 physical-pose spike

This is isolated comparison evidence for OpenSeeFace v1.20.5 model 2. It does
not change the production tracking architecture, approve model 2, or establish
physical-position suitability.

## Configuration

- tracker: pinned OpenSeeFace v1.20.5 `facetracker.exe`
- model: `models/lm_model2_opt.onnx`
- model SHA-256: `16b33ba7d854a0643875ab3da3a620b4b650f2a7f032dd6f634f881cac108304`
- camera: index 0, 640x360, 24 FPS
- tracker: one face, gaze disabled, max threads 1, no 3D adaptation
- transport: loopback UDP `127.0.0.1:11573`
- session: `sessions/session-1790122532`

The accepted model-3 wire-point restoration, quaternion normalization and
conjugation, conventional quaternion matrix, and `R * local + raw PnP`
composition were reused unchanged. The resulting coordinates remain
`openseeface-model-units`; this runner has no millimeter calibration.

## Session result

The user completed the full 17-segment procedure. Every segment received valid
3D samples, with face ID 0 and zero invalid pose samples. The process exit code
of 1 is expected from the harness termination of the direct tracker child;
`unexpectedExitObserved` is false.

| Check | Result | Evidence |
| --- | --- | --- |
| 3D pose availability | Verified | 17/17 segments valid; no invalid samples |
| Depth ordering | Verified | camera-space Z means: -5.158655, -5.903438, -8.588467 for 450/600/750 targets |
| Vertical directionality | Verified qualitatively | camera-space Y means: -0.880458, -1.349735, -1.372520 for down/center/up |
| Horizontal directionality | Failed | camera-space X means: 1.593266, 1.623233, 1.506759 for left/center/right; non-monotonic |
| Stationary raw stability | Mixed | holds 2/3 are low-variation, while hold 1 has X std-dev 0.395958 model units |
| Millimeter jitter gates | Unverified | no authorized conversion from model units to millimeters |
| Model-3 equivalence | Unverified | the accepted model-3 branch contains procedure/reference evidence but no completed comparable session |

## Disposition

Overall model-2 physical-pose validation is **Inconclusive**. The run proves
operational capture and valid 3D output, but it does not satisfy a complete
physical-pose validation because lateral directionality failed and the
millimeter thresholds are not measurable from this uncalibrated signal. No
production adoption or model-selection decision follows from this spike.
