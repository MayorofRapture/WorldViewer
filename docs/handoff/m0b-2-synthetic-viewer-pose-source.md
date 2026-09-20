# M0B-2 Synthetic Viewer Pose Source Handoff

- Subsystem status and supported scope: Verified deterministic scripted `ViewerPoseSource` emitting canonical `RawViewerPose` values.
- Stable public contract/interface paths: `src/engine/pose/SyntheticViewerPoseSource.ts`; Interface & Contract Specification §§6, 10, and 31; ADR-004.
- Oracle IDs: None; checks are Class A routine deterministic tests derived from frozen interfaces.
- Authoritative tests/oracles: `tests/unit/syntheticViewerPoseSource.test.ts`.
- M1 oracle freeze status and Class A/B/C classification: Class A only; no ViewerState or projection oracle introduced.
- Known-good reference implementation, when applicable: ADR-004 synthetic source path.
- REUSE IDs: None applicable.
- Approved dependency/reference implementation: None; deterministic TypeScript source uses the canonical geometry value constructor.
- Authoritative Approval Source: ADR-004; Interface & Contract Specification §§6, 10, and 31.
- Reuse Mode: Not applicable.
- Version/source/provenance constraints: None.
- Remaining project-specific custom-code boundary: Script validation, lifecycle state, and timestamp-based sample selection.
- Prohibited Reinvention: No live tracking, MediaPipe, ViewerStateController, calibration, filtering, projection, or wall-clock timing.
- Deterministic tests and fixture paths: `tests/unit/syntheticViewerPoseSource.test.ts`.
- Governing ADR references: `docs/architecture/adr/ADR-004 — ViewerPoseSource as the Primary Viewer-Input Boundary.md`; `docs/architecture/adr/ADR-003 — Canonical Screen Coordinate System and Millimeter Units.md`.
- Evidence references: `evidence/milestone-0/m0b-2-synthetic-pose-source.json`; `evidence/milestone-0/m0b-6-synthetic-motion-scripts.json`.
- Known limitations / unsupported behavior: This source returns the latest scripted sample at or before a monotonic timestamp and returns null before start, after stop, and after script completion.
- Exact verification commands: `npm.cmd run typecheck`; `npm.cmd test`; `npm.cmd run build`; `cargo check --manifest-path src-tauri/Cargo.toml --locked`; `git diff --check`.
- Escalation conditions: Any request to add tracking/loss timing, state control, projection, calibration/filtering, or packaged synthetic smoke.

Canonical type ownership note: `MonotonicMs` and `Vec3Mm` are consumed from `src/shared/contracts/primitives.ts`; `SyntheticViewerPoseSource.ts` remains host-private.

Motion-script support note: `src/engine/pose/syntheticMotionScripts.ts` provides immutable timed input sequences consumed by the same source; it contains no projection expectations.
