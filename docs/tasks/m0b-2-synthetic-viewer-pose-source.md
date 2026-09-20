# M0B-2 — Synthetic Viewer Pose Source

## Task Metadata

- Task ID: M0B-2
- Milestone / slice: M0B deterministic pose support
- Task type: implementation and deterministic test
- Implementation model: Luna — Medium
- Baseline branch/commit: `feat/m0a1-foundation` / `4deeb7e429ac1d52f993e95ee020a540e99c7b9b`
- Status: complete

## Objective

Implement a deterministic `SyntheticViewerPoseSource` that conforms to the frozen `ViewerPoseSource`/`RawViewerPose` boundary and emits canonical millimeter poses from a validated script, while remaining independent of camera, MediaPipe, filtering, calibration, and projection.

## Preconditions / Required Context

- M0B-1 geometry foundation is committed and verified.
- ADR-004 is Accepted.
- Governing contract: Interface & Contract Specification §§6, 10, and 31.
- Supporting roadmap: M0B synthetic pose support and M0C preparation.
- Testing authority: Testing Strategy §§3A.1, 5, and 6.
- Oracle ID: none; checks are Class A routine deterministic tests derived from frozen interfaces.
- Reuse ID: none applicable.

## Allowed Scope

- Add the minimal `src/engine/pose/` source boundary for `RawViewerPose`, `ViewerPoseSource`, and `SyntheticViewerPoseSource`.
- Validate finite canonical positions, confidence range, estimator ID, and monotonic script timestamps.
- Implement deterministic start/reset, stop, timestamp-ordered sample, and end-of-script behavior.
- Add focused unit tests and required task/evidence/handoff pointers.

## Prohibited Scope

- ViewerStateController, tracking loss/reacquisition timing, camera/MediaPipe/workers, calibration, filtering, projection, renderer integration, or M0C smoke behavior.
- Wall-clock timing, random generation, live dependencies, new public world APIs, or Class C oracle work.

## Deliverables

- Deterministic pose-source implementation and tests.
- Updated task status and M0B pose-source handoff/evidence pointers.

## Verification / Definition of Done

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `cargo check --manifest-path src-tauri/Cargo.toml --locked`
- `git diff --check`
- Tests cover deterministic output, canonical units, script ordering, start/stop, repeatability, and invalid fixture rejection.

## Escalation / Stop Conditions

Stop if the source contract must be changed, timing semantics require ViewerState behavior, or implementation reaches tracking, calibration, filtering, projection, or M0C architecture.
