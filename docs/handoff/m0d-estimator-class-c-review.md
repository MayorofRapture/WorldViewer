# M0D Estimator Class C Review Package

## Review status

- Package purpose: navigation for stronger-reasoning review of the M0D estimator-comparison oracle.
- Prepared against implementation baseline: `5073d1b800bd086db1194437fbba8f1efc1e524c`
- Review-preparation commit: `f186a55f61291dc14bf684fd5c595f2d53d60e8a`
- Class C remediation commit: `0c3fd8c59279ad0b10fa87b8f4ac0f8e0d94ed89`
- Cleanup/provenance commit: recorded in the completion handoff after commit creation
- Oracle ID: `ORC-POSE-ESTIMATOR-001`
- Classification: Class C
- Review status: pending
- Freeze status: draft
- M0D4–M0D7 status: blocked until the Class C review is approved and the Oracle Registry record is frozen.
- This note does not approve, freeze, reinterpret, or implement the experiment.

## Handoff record

- Subsystem status and supported scope: M0D estimator-comparison review preparation only; no estimator or evidence implementation.
- Stable public contract/interface paths: `docs/architecture/interface-contract-specification.md` §§8–11; `src/mediapipe/mediapipeBenchmarkWorker.ts` is benchmark-only and is not yet a `TrackingSource` implementation.
- Oracle IDs: `ORC-POSE-ESTIMATOR-001` (pending/draft).
- Authoritative tests/oracles: Pending Class C procedure is the experiment specification §§6–27; existing package/unit checks do not constitute estimator-comparison evidence.
- M1 oracle freeze status and classification: Not M1-ready; Class C review pending and freeze draft.
- Known-good reference implementation: Packaged MediaPipe benchmark path in `src/mediapipe/`; no estimator implementation is approved.
- REUSE IDs: None applicable to this review-preparation artifact.
- Approved dependency/reference implementation: MediaPipe package/model provenance is recorded for the spike only; no estimator reference implementation is approved.
- Authoritative Approval Source: None yet; approval must come from the required final stronger Class C review and governing-source reconciliation.
- Reuse Mode: Not applicable to the pending oracle; no production estimator reuse decision is made.
- Version/source/provenance constraints: `@mediapipe/tasks-vision@1.0.1`, package lock integrity, pinned task model/WASM provenance, Draft v0.3, experimentProcedureVersion 2, and future evidence namespace `evidence/m0d/estimator-experiment-v2/` remain navigation facts only.
- Remaining project-specific custom-code boundary: Future M0D normalization, estimator, replay, and evidence code must consume the frozen contracts and may not author new experiment semantics.
- Prohibited Reinvention: Do not replace the prescribed methods, invent canonical constants, transpose matrices by appearance, or tune/rerun evidence outside the frozen procedure.
- Deterministic tests and fixture paths: `tests/fixtures/m0d/matrixConvention.ts`, `tests/unit/m0dOracleFixtures.test.ts`, `tests/unit/m0dMatrixPackageProvenance.test.ts`, and `scripts/derive-mediapipe-canonical-face-model.mjs`; these are provenance/convention fixtures only, not estimator implementation or replay evidence.
- Governing ADR references: ADR-003, ADR-004, ADR-005, ADR-006, ADR-009.
- Evidence references: `evidence/spikes/m0d-mediapipe-packaged-performance/`; `evidence/spikes/m0d-openseeface-physical-pose/`; neither is a validated estimator-comparison bundle.
- Known limitations / unsupported behavior: normalized estimator observation stream, production matrix adapter, camera-origin measurement, and M0D evidence validator are not present.
- Exact verification commands: `npm.cmd run typecheck`; `npm.cmd test`; `cargo check --locked --manifest-path src-tauri/Cargo.toml`; `cargo test --locked --manifest-path src-tauri/Cargo.toml`; `git diff --check`.
- Escalation conditions: Any semantic conflict, missing prerequisite, proposed formula/procedure change, or request to begin M0D4–M0D7 before oracle freeze returns to stronger review.

## Governing sources

- `docs/experiments/pose-estimator-experiment-specification.md` Draft v0.3 / experimentProcedureVersion 2, especially §§4–24 for experiment semantics and §§25–27 for Class C review/freeze conditions.
- `docs/planning/milestone-roadmap.md`, M0D and the Class C oracle timing rule.
- `docs/testing/testing-strategy.md`, Class C review/freeze and verification-readiness policy.
- `docs/testing/oracle-registry.md`, `ORC-POSE-ESTIMATOR-001` pending/draft record.
- `docs/architecture/interface-contract-specification.md`, §§8–11 and D-IC-03/D-IC-10 for `TrackingObservation`, `RawViewerPose`, and the M0D→M0E boundary.
- `docs/architecture/technical-design-specification.md`, §§9–13 and D-TDS-10 for worker, estimator, calibration, replay, and evidence ownership.
- `docs/architecture/adr/ADR-003 — Canonical Screen Coordinate System and Millimeter Units.md`.
- `docs/architecture/adr/ADR-004 — ViewerPoseSource as the Primary Viewer-Input Boundary.md`.
- `docs/architecture/adr/ADR-005 — Worker-Based MediaPipe Tracking with Latest-Frame Backpressure.md`.
- `docs/architecture/adr/ADR-006 — Pose Estimator Selected by Measurement, Not Assumption.md`.
- `docs/architecture/adr/ADR-009 — Simple Fixed-Camera Calibration First.md`.
- `docs/product/non-functional-requirements.md`, especially NFR-PERF-004/005/009, NFR-REL-003/004, NFR-PRIV-002, NFR-TEST-003, and NFR-OBS-002.

## Class C review inventory

The reviewer should inspect, without reconstructing the dependency graph from implementation:

| Material | Authority |
| --- | --- |
| Canonical screen coordinates, millimeters, camera-origin interpretation | Experiment §4; ADR-003 |
| Shared `TrackingObservation` inputs and normalized trace shape | Experiment §§5, 11–12; Interface Contract §§8–9 |
| Canonical face-model source, units, `CC`, and `DcanonMm` derivation | Experiment §§6–7 |
| Estimator A matrix method, homogeneous transform, axis/unit conversion, and uniform neutral-depth scale | Experiment §9 |
| Estimator B eye-center geometry, interocular scale, principal point, and camera-relative conversion | Experiment §10 |
| Shared calibration capture and estimator-specific calibration inputs | Experiment §8; §§9–10 |
| Metric formulas, cadence/timing, null/valid rates, outliers, discontinuities, and calibration burden | Experiment §13 |
| Structural-failure conditions and directional/depth checks | Experiment §14 |
| Fixed live scenarios, target positions, holds, cycles, and durations | Experiment §15 |
| Physical setup and operator tolerances | Experiment §16 |
| Runner behavior and segment-marker responsibility | Experiment §17 |
| Prohibited tuning, sample removal, and selection during collection | Experiment §18; roadmap M0D7 |
| Procedural invalidation and rerun rules | Experiment §19 |
| Manifest, evidence layout, completeness fields, and validator failures | Experiment §§20–21 |
| M0D8 structural-first interpretation and ADR-006.01 boundary | Experiment §§22–24; ADR-006 |
| Class C allocation, stronger-review requirement, and freeze conditions | Experiment §§25–27; roadmap Class C rule |

The requested high-risk review questions are: matrix layout/handedness and canonical-to-runtime soundness; unit/axis conversion; one-point uniform scale justification; Estimator B interocular definition; same-stream fairness; camera-origin consistency; metric ability to distinguish affine bias from nonlinear failure; practicality of E590 targets/tolerances; invalidation/rerun protection; raw-image-free reproducibility; internal contradictions or underspecification; and whether the experiment can support ADR-006.01.

## Prerequisite readiness

Status meanings are limited to this review package: `Ready`, `Missing`, `Ambiguous`, and `Blocked`.

| Required prerequisite | Status | Current repository basis / gap |
| --- | --- | --- |
| Canonical MediaPipe face-model source/provenance | Ready | Exact task and embedded metadata hashes, extractor, generated artifact, and deterministic test are present. |
| Canonical cyclopean point `CC` derivation | Ready | `scripts/derive-mediapipe-canonical-face-model.mjs` derives `CC` from the pinned task artifact. |
| Canonical inter-eye distance `DcanonMm` derivation | Ready | The extractor and deterministic test derive `DcanonMm` from the pinned canonical landmark vertices. |
| Matrix dimensions | Ready | Installed 1.0.1 `vision.d.ts` exposes rows, columns, and data; the package provenance test checks this exact surface. |
| Exact matrix packed-order provenance | Ambiguous | The exact 1.0.1 bundle copies decoded field-3 values without transpose/reorder, but the package does not establish whether upstream packed values are row-major or column-major. |
| Coordinate/handedness convention | Ready | The reviewed fixture and Sections 4/9 define the expected column-vector conversion; this is not independent proof of package packed order. |
| Source frame width/height in production observation | Missing | The current benchmark worker does not implement normalized `TrackingObservation` frame dimensions. |
| Required landmarks 33, 133, 362, 263 in production observation | Missing | The current worker does not emit normalized landmarks. |
| Facial transformation matrix in production observation | Missing | The current worker records only a matrix count. |
| Face-present/no-face state in production observation | Ambiguous | A benchmark diagnostic exists, but the frozen normalized observation implementation does not. |
| Monotonic timestamp in production observation | Ambiguous | Benchmark timing exists, but no normalized observation stream is implemented. |
| Inference/worker timing | Ready | The benchmark worker measures inference duration; future normalization must map it into the evidence envelope, not estimator input. |
| Camera configuration | Ready | Requested procedure baseline is documented and benchmark configuration is recorded; actual negotiated settings belong in the future manifest. |
| `cameraOriginScreenMm` | Missing | No current implementation or persisted M0D measurement fields exist. |
| Evidence schema/validator | Ambiguous | The v2 namespace and required fields are specified; no M0D evidence-bundle validator is implemented. |
| `RawViewerPose` requirements | Ready | Interface Contract and ADR-003 define finite screen-relative millimeter output; estimator implementation remains absent. |
| Physical-target practicality | Ambiguous | E590 operator/setup confirmation is not present. |

Exact-package matrix conclusion: Ordering remains unproven. The installed 1.0.1 bundle copies decoded matrix field-3 values without transpose/reorder, but does not establish the upstream packed-order meaning.

## Current provisional MediaPipe baseline

For continued M0D development, the provisional capture baseline is the known-good visible packaged configuration:

- `@mediapipe/tasks-vision@1.0.1`
- Face Landmarker, CPU delegate, `VIDEO` mode, one face
- facial transformation matrices enabled, blendshapes disabled, default confidence thresholds
- dedicated worker with latest-frame bounded backpressure
- 640×360 requested camera resolution at 24 FPS
- approximately 23.59 Hz useful cadence and 100% useful face results in the supplied visible manual reference

The 480×270 @ 20 FPS run remains optimization evidence only and is not the M0D estimator-development baseline. Existing packaged spike evidence under `evidence/spikes/m0d-mediapipe-packaged-performance/` must not be treated as estimator-comparison evidence because it contains no estimator outputs or normalized comparison trace.

Relevant implementation/provenance paths:

- `src/mediapipe/packagedMediaPipeBenchmark.ts`
- `src/mediapipe/mediapipeBenchmarkWorker.ts`
- `tests/unit/packagedMediaPipeBenchmark.test.ts`
- `evidence/spikes/m0d-mediapipe-packaged-performance/provenance.json`
- `evidence/spikes/m0d-mediapipe-packaged-performance/README.md`
- `evidence/spikes/m0d-openseeface-physical-pose/README.md`

## Unresolved review questions and handoff boundary

The stronger reviewer must decide whether the proposed formulas, matrix interpretation, canonical-model derivation requirements, shared-observation fairness, metrics, structural-failure rules, physical procedure, tolerances, invalidation/rerun rules, evidence schema, and M0D8 interpretation are valid and sufficiently specified. Any material finding must be resolved in the governing experiment specification before freeze.

No Estimator A/B implementation, M0D6 replay/metrics tooling, M0D7 evidence collection, tracker selection, or ADR-006.01 is authorized by this package. M0D4–M0D7 remain blocked while `ORC-POSE-ESTIMATOR-001` is `pending` / `draft`.

## Verification performed for this package

- Verified all paths cited above exist.
- Verified `ORC-POSE-ESTIMATOR-001` is present as Class C with `Review status: pending` and `Freeze status: draft`.
- Verified current source contains benchmark-only MediaPipe worker output and no estimator implementation.
- Initial Sol High review: changes required. Remediation audit: substantive design accepted; freeze deferred for consolidation and exact-package matrix-provenance closure. Current status: awaiting final stronger Class C audit. No production estimator code is introduced here.

## Escalation conditions

Stop and return to stronger review if the experiment specification, interface contracts, ADRs, or existing evidence disagree; if a prerequisite is promoted from proposed to frozen without an authoritative review; or if implementation work is requested before the Class C oracle is approved and frozen.
