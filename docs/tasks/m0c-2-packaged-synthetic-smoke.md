# M0C2 - Packaged Synthetic Smoke

## Task metadata

- Task ID: M0C2
- Baseline: `b0a48fef2c1921af8de8a572118201ca47828938`
- Status: fresh verification passed; final Git mutation pending
- Oracle: `ORC-PACKAGED-SYNTHETIC-001`, Class B, not-required review, frozen after the packaged procedure passed

## Scope delivered

- Corrected deterministic final-sample delivery in `SyntheticViewerPoseSource`.
- Replaced fabricated `ViewerState` construction in `SyntheticProjectionRuntime` with the production `ViewerStateController` and a host-private monotonic clock adapter.
- Added the identity synthetic RawViewerPose-to-FilteredViewerPose smoke adapter, bounded observer seam, post-render ordering, and scheduled-error reporting.
- Extended `App.tsx` for explicit `asymmetric-x-y` synthetic smoke and five stable checks while preserving launch and ordinary diagnostic behavior.
- Extended `scripts/run-packaged-smoke.ps1` with bounded `launch`/`synthetic` modes; launch semantics remain unchanged.

## Required synthetic checks

`renderer-ready`, `diagnostic-world-ready`, `viewer-state-controller-ready`, `projection-ready`, and `synthetic-sequence-complete`.

## Exclusions

No MediaPipe, webcam, calibration, production filtering, live tracking, dynamic package loading, package-local production assets, public SDK exports, alternate projection math, GUI automation, or native smoke protocol changes were added.

## Verification evidence

See `evidence/milestone-0/m0c-2-packaged-synthetic-smoke.json`. `ORC-VIEWER-STATE-001` and frozen `ORC-PACKAGED-SMOKE-001` semantics are unchanged. The default full Tauri bundle passed; final fresh verification is recorded in the evidence artifact.
