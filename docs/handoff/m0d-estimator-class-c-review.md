# M0D Estimator Class C Review Package

## Review status

- Package purpose: navigation for stronger-reasoning review of the M0D estimator-comparison oracle.
- Prepared against implementation baseline: `5073d1b800bd086db1194437fbba8f1efc1e524c`
- Review-preparation commit: `f186a55f61291dc14bf684fd5c595f2d53d60e8a`
- Class C remediation commit: `0c3fd8c59279ad0b10fa87b8f4ac0f8e0d94ed89`
- Cleanup/provenance commit: `afe073c21ef030a6eb463de8b13ed89f5c96bc33`
- M0D3A implementation commit: `cc3e428ce043b11f46b6163b8d3bd33e3d1c08ad`
- M0D3B packaged matrix diagnostic commit: `2f41d8358d7225eb72a690a2ef36e4811177c37d`
- M0D3B CSP correction commit: `ff285467382c4723a614419990f3d58ed1d37c85`
- Class C reconciliation commit: `ccb9e6eb369cf59b01c61babb957cd03ec41d400`
- M0D3B physical matrix-diagnostic review: completed by the operator against build `ff285467382c4723a614419990f3d58ed1d37c85`; raw output remains local and uncommitted.
- Oracle ID: `ORC-POSE-ESTIMATOR-001`
- Classification: Class C
- Review status: approved
- Freeze status: frozen
- Reviewed baseline: `aef3e7c8280784db3e878757338c073cbce45a81`
- Class C oracle: approved/frozen. Section 27 technical prerequisites for M0D4-M0D7 were reviewed and closed before implementation.
- M0D7 formal evidence collection is completed and validated; M0D8 interpretation/selection is completed with Estimator A selected for production. See ADR-006.01 and the durable evidence path below.
- Section 27 readiness inputs include the actual E590 `cameraOriginScreenMm = { x: 0, y: 103.188, z: 0 }` mm measurement and confirmed target practicality; these prerequisites were consumed by the completed formal M0D7 run.
- M0D4/M0D5/M0D6: Ready; M0D7: Completed; M0D8: Completed; production estimator selection: Accepted through ADR-006.01.
- This note records the approved/frozen oracle and the current implementation boundary. It does not change experiment semantics.

### Current M0D7 physical-evidence correction boundary

The focused implementation correction preserves the accepted lifecycle and frozen procedure while making evidence semantics explicit: invalidation is scoped to an `(attemptId, unitId)` pair; the verified negotiated camera configuration is persisted before source shutdown; depth ordering uses the prescribed 450/600/750 mm values; repeatability and movement errors are grouped by physical target and same-cycle neutral reference; hold completeness requires accepted hold/capture observations plus start/end markers; replacement attempts require their own evidence and markers; and scenario summaries are serialized as exact regenerable metrics without score or rank.

These corrections preserve the approved lifecycle and closed Section 27 readiness state. The subsequent formal M0D7 run was collected under the frozen procedure and is preserved below; this historical section does not alter that evidence or the frozen experiment semantics.

## Handoff record

- Subsystem status and supported scope: M0D3A pure TrackingObservation normalization, M0D3B's opt-in packaged matrix diagnostic, the M0D3 production MediaPipe TrackingObservation path, the M0D v3 evidence contracts/validator, M0D4/M0D5 estimator candidates, M0D6 replay/metrics/evidence tooling, and the opt-in M0D7 guided runner are implemented and verified; formal M0D7 evidence collection and M0D8 selection are complete.
- Stable public contract/interface paths: `docs/architecture/interface-contract-specification.md` §§8–11; `src/mediapipe/mediapipeTrackingSource.ts` is the host-private `TrackingSource`, `src/mediapipe/mediapipeTrackingWorker.ts` owns MediaPipe inference, and `src/mediapipe/mediapipeBenchmarkWorker.ts` remains benchmark/diagnostic-only.
- Oracle IDs: `ORC-POSE-ESTIMATOR-001` (approved/frozen).
- Authoritative tests/oracles: The approved and frozen Class C procedure is the experiment specification §§6–27; existing package/unit checks do not constitute estimator-comparison evidence.
- M1 oracle freeze status and classification: The Class C oracle remains approved/frozen; the M0D7 evidence gate and M0D8 production-selection gate are complete, while M0E has its own contracts and Class C review gates.
- Known-good reference implementation: `mediapipe-facial-transform-v1` is the accepted production estimator through ADR-006.01; the packaged MediaPipe path in `src/mediapipe/` remains the pinned worker/reference basis.
- REUSE IDs: None applicable to this review-preparation artifact.
- Approved dependency/reference implementation: `@mediapipe/tasks-vision@1.0.1` and the pinned canonical task/model provenance remain owned by the frozen experiment; Estimator A is the accepted production estimator, with its identity and configuration recorded in ADR-006.01.
- Authoritative Approval Source: Final GPT-5.6 Sol High Class C review and governing-source reconciliation recorded in `docs/testing/oracle-registry.md` against reviewed baseline `aef3e7c8280784db3e878757338c073cbce45a81`.
- Reuse Mode: Not applicable to the frozen oracle; the production estimator selection is an evidence-backed architecture decision, not a dependency reuse approval.
- Version/source/provenance constraints: `@mediapipe/tasks-vision@1.0.1`, package lock integrity, pinned task model/WASM provenance, Draft v0.4, experimentProcedureVersion 3, and `evidence/m0d/estimator-experiment-v3/run-1790638307359/` are the accepted provenance/evidence references. The earlier v2 artifact/directory is historical and is not renamed or rewritten.
- Remaining project-specific custom-code boundary: Future M0D replay, metrics, and evidence code must consume the frozen contracts and may not author new experiment semantics.
- Prohibited Reinvention: Do not replace the prescribed methods, invent canonical constants, transpose matrices by appearance, or tune/rerun evidence outside the frozen procedure.
- Deterministic tests and fixture paths for M0D6 include `src/m0d/evidence/m0dEvidenceContracts.ts`, `src/m0d/evidence/m0dEvidenceValidator.ts`, `src/m0d/evidence/m0dSerialization.ts`, `src/m0d/replay/m0dReplay.ts`, `src/m0d/metrics/m0dMetrics.ts`, `src/m0d/scenarios/m0dScenarioModel.ts`, the estimator modules, `tests/unit/m0dEvidenceContracts.test.ts`, `tests/unit/m0dEstimators.test.ts`, `tests/unit/m0dReplay.test.ts`, `tests/unit/m0dMetrics.test.ts`, `tests/unit/m0dSerialization.test.ts`, and `tests/unit/m0dScenarios.test.ts`; the replay and metric tests are synthetic and create no formal evidence.
- Governing ADR references: ADR-003, ADR-004, ADR-005, ADR-006 (historical), ADR-006.01, ADR-009.
- Evidence references: `evidence/m0d/estimator-experiment-v3/run-1790638307359/`; validated source ZIP SHA-256 `872A833671004173F40A966B68095D65911252F1261EE902A84434267BB48EDE`; experiment run `m0d7-20260928232502757`; the local M0D3B diagnostic output remains intentionally unreferenced and uncommitted.
- Known limitations / unsupported behavior: Estimator A (`mediapipe-facial-transform-v1`, v1, config `fnv1a64-825a99daebb20f6c`) is selected. Its intrinsic calibration is `scaleA = 1.259167661839453`, `zMedianRaw = 476.5052488113386`, `ZrefCameraMm = 600`, with camera origin `{ x: 0, y: 103.188, z: 0 }` mm. A has significant raw scale/bias before M0E calibration, weaker far-depth repeatability than neutral, transient repositioning jitter, and approximately 15.63 Hz useful cadence (above minimum, below preferred 20–30 Hz). Physical target placement is manually measured, and M0D selection does not prove final filtered/calibrated NFR compliance. Candidate B's partial-head-turn Z range was approximately 191.9 mm versus approximately 18.4 mm for A; its yaw-correlated depth behavior is not correctable by independent per-axis scale/offset. SolvePnP/OpenCV remains deferred. The evidence build SHA is `add62305be364912f735bf3ad7171a2a3e2bf71c`, accepted as a provenance caveat against the later UI-clarification commit `a006652569d2e8e3d2b19f87b77fdacf9c405fca`.
- Exact verification commands: `npm.cmd run typecheck`; `npm.cmd test`; `npm.cmd run check:world-sdk`; `npm.cmd run check:world-boundaries`; `cargo check --locked --manifest-path src-tauri/Cargo.toml`; `cargo test --locked --manifest-path src-tauri/Cargo.toml`; `git diff --check`. Rust formatting remains unverified because `cargo-fmt.exe` is unavailable in the installed toolchain.
- Escalation conditions: Any semantic conflict, missing prerequisite, proposed formula/procedure change, or request to alter the frozen oracle returns to stronger review; M0D6/M0D7 work must remain within its own bounded implementation and evidence gates.

## Governing sources

- `docs/experiments/pose-estimator-experiment-specification.md` Draft v0.4 / experimentProcedureVersion 3, especially §§4–24 for experiment semantics and §§25–27 for Class C review/freeze conditions.
- `docs/planning/milestone-roadmap.md`, M0D and the Class C oracle timing rule.
- `docs/testing/testing-strategy.md`, Class C review/freeze and verification-readiness policy.
- `docs/testing/oracle-registry.md`, `ORC-POSE-ESTIMATOR-001` approved/frozen record.
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

Status meanings are limited to this review package: `Ready`, `Completed`, `Missing`, `Ambiguous`, `Blocked`, and `Not yet performed`.

| Required prerequisite | Status | Current repository basis / gap |
| --- | --- | --- |
| Canonical MediaPipe face-model source/provenance | Ready | Exact task and embedded metadata hashes, extractor, generated artifact, and deterministic test are present. |
| Canonical cyclopean point `CC` derivation | Ready | `scripts/derive-mediapipe-canonical-face-model.mjs` derives `CC` from the pinned task artifact. |
| Canonical inter-eye distance `DcanonMm` derivation | Ready | The extractor and deterministic test derive `DcanonMm` from the pinned canonical landmark vertices. |
| Matrix dimensions | Ready | Installed 1.0.1 `vision.d.ts` exposes rows, columns, and data; the package provenance test checks this exact surface. |
| Exact matrix packed-order provenance | Ready | The exact 1.0.1 bundle copies decoded field-3 values without transpose/reorder; the completed physical diagnostic and stronger review support WorldViewer's existing column-major/column-vector consumption with translation at indices 12, 13, and 14. |
| Coordinate/handedness convention | Ready | The reviewed fixture and Sections 4/9 define the expected column-vector conversion; this is not independent proof of package packed order. |
| Source frame width/height normalization | Ready | Production `MediaPipeTrackingSource` passes capture dimensions to the worker and the normalizer validates them before publication. |
| Required landmarks 33, 133, 362, 263 normalization | Ready | Production worker routes complete indexed MediaPipe landmarks through the frozen normalizer before emitting an observation. |
| Facial transformation matrix normalization | Ready | Production worker routes optional 4x4/16 finite matrix data through the frozen normalizer without reordering. |
| Face-present/no-face normalization | Ready | Production worker emits both no-face observations and face-without-matrix observations as valid normalized messages; malformed results become structured errors. |
| Monotonic timestamp normalization | Ready | Production worker uses `VideoFrameCallbackMetadata.mediaTime`, preserves equal timestamps, rejects stale timestamps, and never substitutes wall-clock time. |
| Inference/worker timing | Ready | Production observation messages carry inference timing as protocol metadata outside the core `TrackingObservation`; benchmark timing remains unchanged. |
| Camera configuration | Ready | The operator diagnostic negotiated 640 × 360 at 24 FPS; this is diagnostic confirmation, not formal M0D7 evidence. |
| `cameraOriginScreenMm` measurement field/validation contract | Ready | Host-private M0D validation validates finite x/y/z and derives `ZrefCameraMm = ZrefScreenMm - cameraOriginScreenMm.z` only when positive. |
| Actual E590 `cameraOriginScreenMm` measurement | Ready | The measured E590 value is `{ x: 0, y: 103.188, z: 0 }` mm in the canonical screen-relative frame. It is a readiness prerequisite, not formal M0D7 experiment evidence. |
| Evidence schema/validator implementation/readiness | Ready | v3 `schemaVersion = 1` contracts and `validatorVersion = 1` validate the frozen manifest, context files, traces, replay outputs, camera-origin, numeric, identity, scenario, invalidation, anomaly, configuration-consistency, completeness, and metric-regeneration rules. Historical v2 artifacts remain unchanged. |
| Live worker-to-TrackingObservation integration | Ready | `MediaPipeTrackingSource` owns camera/frame lifecycle and consumes protocol-versioned observations from `mediapipeTrackingWorker.ts`; deterministic lifecycle, normalization, timestamp, and boundary tests pass. |
| `RawViewerPose` requirements | Ready | Interface Contract and ADR-003 define finite screen-relative millimeter output; both frozen M0D4/M0D5 candidates emit finite values or null with diagnostics. |
| Physical-target practicality | Ready | The frozen 450/600/750 mm depth, ±150 mm lateral, ±100 mm vertical, and approximately 25–30° head-turn targets were reviewed as practical on the E590 setup and were used by the completed run. |
| Formal M0D7 physical evidence collection | Completed | Validated run `run-1790638307359` is preserved under `evidence/m0d/estimator-experiment-v3/run-1790638307359/`; the validator passed 21/21 checks with zero failures, warnings, procedural invalidations, or anomalies. |

Exact-package matrix conclusion: The completed physical diagnostic supports the existing WorldViewer column-major/column-vector consumption of the exact returned array, with translation at indices 12, 13, and 14 and no transpose/reorder. This finding is recorded in the approved and frozen Class C oracle.

## Completed physical matrix-diagnostic review

The operator completed the visible packaged diagnostic using build `ff285467382c4723a614419990f3d58ed1d37c85`, `@mediapipe/tasks-vision@1.0.1`, task SHA-256 `64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF`, and embedded canonical metadata SHA-256 `BDBCDA96DFCB7DA883DA124AAA2C55DEE49770D934F0FCC71747F8C21BDC75B4`. The negotiated camera was 640 × 360 at 24 FPS. Neutral, left-asymmetric, right-asymmetric, and near phases each completed three qualifying observations; missing-face, missing-matrix, invalid-observation, and validation-failure counts were all zero. The stronger review concluded that physical left movement decreases WorldViewer X, physical right movement increases X, and moving closer decreases Z, validating the existing column-major 4 × 4 column-vector consumption with translation at flattened indices 12–14 and no transpose/reorder. The raw diagnostic JSON and numerical landmark/matrix data remain local and uncommitted.

## Minimum matrix-ordering follow-up

The physical diagnostic review is complete, but its output is diagnostic evidence only and is not formal M0D7 estimator-comparison evidence. M0D3B's standalone visible operator flow remains the bounded collection mechanism; it records asymmetric 4 × 4 results (`rows`, `columns`, all 16 returned `data` values in order), package/version and task hashes, monotonic timestamps, frame dimensions, and required indexed landmarks without storing frames or personal identifiers. No raw diagnostic output is committed.

## Historical MediaPipe baseline

The known-good visible packaged configuration used as the M0D development baseline was:

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
- `src/mediapipe/packagedMediaPipeMatrixDiagnostic.ts`
- `src/mediapipe/matrixDiagnosticCapture.ts`
- `src/mediapipe/mediapipeProvenance.ts`
- `scripts/run-mediapipe-matrix-diagnostic.ps1`
- `tests/unit/packagedMediaPipeBenchmark.test.ts`
- `evidence/spikes/m0d-mediapipe-packaged-performance/provenance.json`
- `evidence/spikes/m0d-mediapipe-packaged-performance/README.md`
- `evidence/spikes/m0d-openseeface-physical-pose/README.md`

## M0D8 closeout and M0E handoff boundary

The final stronger reviewer approved the proposed formulas, matrix interpretation, canonical-model derivation requirements, shared-observation fairness, metrics, structural-failure rules, physical procedure, tolerances, invalidation/rerun rules, evidence schema, and M0D8 interpretation for the frozen oracle. Section 27 technical prerequisites were reviewed and closed before M0D4-M0D7 implementation. The E590 camera-origin measurement and target-practicality confirmation are preserved in the completed run. Any future material oracle finding must be resolved through the retained stronger-review change authority before modifying the frozen procedure.

M0D8 selected Estimator A, `mediapipe-facial-transform-v1` v1, with configuration hash `fnv1a64-825a99daebb20f6c`. Estimator A's intrinsic calibration is `scaleA = 1.259167661839453`, `zMedianRaw = 476.5052488113386`, and `ZrefCameraMm = 600`, using camera origin `{ x: 0, y: 103.188, z: 0 }` mm. The accepted package is `@mediapipe/tasks-vision@1.0.1`; the pinned canonical model provenance remains owned by the frozen experiment specification. Candidate B had no frozen structural failure but its approximately 191.9 mm partial-head-turn Z range and yaw-correlated depth behavior are not compatible with the approved independent per-axis scale/offset correction model. SolvePnP/OpenCV remains deferred.

M0E may measure/apply the already-approved downstream independent per-axis scale and offset and pose filtering. M0E must not reinterpret MediaPipe matrix layout, change canonical landmarks or estimator equations, add orientation-conditioned/nonlinear correction, replace the selected estimator, or introduce solvePnP/OpenCV without the appropriate new architecture review. No production estimator redesign is authorized downstream.

M0D4 and M0D5 estimator candidates and M0D6 replay/metrics/evidence tooling are implemented as host-private pure paths. M0D7 live evidence collection and M0D8 stronger-reasoning interpretation are complete. Estimator A is selected through ADR-006.01; no production estimator redesign is authorized downstream.

## M0D7 runner boundary

The packaged smoke command is:

`powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-packaged-smoke.ps1 -Mode m0d7-runner-smoke`

The operator launch command after the packaged executable is built is:

`$env:WORLD_VIEWER_SMOKE_MODE = "m0d7-runner"; & .\src-tauri\target\release\worldviewer.exe; Remove-Item Env:WORLD_VIEWER_SMOKE_MODE`

This opt-in mode opens the visible guided runner but does not start the camera until the operator presses the start button. The native writer accepts only the runner's JSON/JSONL files, stages them under the application data `m0d\evidence` directory, allocates a unique `run-<epoch>` directory, and publishes it only after all files are written. Incomplete staging directories remain visibly marked `.incomplete`; prior run directories are never overwritten. The runner stores normalized observations, timing, dropped-frame counts, markers, anomalies, metrics, and validator output only; it does not store images, frames, screenshots, or identifiers. The validated source bundle is preserved in the repository at `evidence/m0d/estimator-experiment-v3/run-1790638307359/`; its generated `m0d8-review.json` remains the runner-produced not-started placeholder, while the accepted Sol review is recorded in ADR-006.01 and this handoff.

## Verification performed for this package

- Verified all paths cited above exist.
- Verified `ORC-POSE-ESTIMATOR-001` is present as Class C with `Review status: approved` and `Freeze status: frozen` against reviewed baseline `aef3e7c8280784db3e878757338c073cbce45a81`.
- Verified current source contains the production normalized-observation worker/source path, benchmark/diagnostic worker output remains separate, and the M0D4/M0D5 estimator candidates consume only normalized `TrackingObservation` values.
- Initial Sol High review: changes required. Remediation audit: substantive design accepted; final GPT-5.6 Sol High Class C review approved and froze the reconciled Draft v0.4 / procedure 3 baseline. No production estimator code is introduced here.
- M0D3 implementation verification: production protocol/versioning, worker normalization, monotonic timestamp rejection, latest-frame backpressure, lifecycle cleanup, and host consumption boundary pass deterministic tests; packaged diagnostic wiring and pinned task/archive provenance remain verified. Raw diagnostic JSON remains local and uncommitted.
- M0D evidence-readiness verification: schemaVersion 1 contracts, validatorVersion 1 structural checks, synthetic no-face/face/matrix/replay fixtures, finite camera-origin validation, and positive `ZrefCameraMm` derivation pass deterministic tests.
- M0D4/M0D5 implementation verification: both candidates use the shared neutral calibration input, preserve the frozen matrix/axis/depth formulas, emit confidence `1.0` for finite valid poses, return null with deterministic reasons for invalid samples, and pass synthetic replay-compatible estimator tests.
- M0D6 implementation verification: deterministic schema-1 observation reconstruction, shared-trace dual-candidate replay, injected estimator-only timing, stable candidate identity, frozen metric helpers, cadence attribution, structural status, scenario/invalidation/anomaly models, deterministic JSON/JSONL serialization, strict bundle validation, and metric regeneration checks pass synthetic tests.
- M0D7 evidence verification: the source ZIP SHA-256 matches `872A833671004173F40A966B68095D65911252F1261EE902A84434267BB48EDE`; the extracted repository run has 20/20 matching files and content hashes; `validation.json` reports validator version 1, 21/21 checks passed, zero failures and warnings, and 14 included trials.
- M0D8 closeout: stronger reasoning selected Estimator A under the frozen criteria; ADR-006.01 records the selection, intrinsic calibration, measured limitations, provenance caveat, and M0E boundary. No production estimator code or frozen experiment semantics were changed.

## Escalation conditions

Stop and return to stronger review if the experiment specification, interface contracts, ADRs, or existing evidence disagree; if a prerequisite is promoted from proposed to frozen without an authoritative review; if a material change to the frozen oracle is requested; or if implementation work would alter the frozen procedure before formal M0D7 physical evidence collection.
