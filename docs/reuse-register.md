# Reuse & Dependency Register

## Purpose and authority

This register is a compact repository-local index of material reuse and dependency decisions. It records approved paths and their boundaries; it does not create architecture authority. Accepted ADRs, the TDS, authoritative contracts, dependency manifests/lockfiles, and required verification remain authoritative.

## Reuse Modes

- Mode A — Adopt directly.
- Mode B — Adapt approved reference.
- Mode C — Compose approved primitives.
- Mode D — Project-specific custom implementation; explicit authorization required.

## Lifecycle

`candidate` and `evaluating` are not authorized for ordinary implementation. `approved` may be consumed inside its recorded boundary. `blocked`, `superseded`, and `retired` are not consumable. A semantic change to mode, approved component/reference, approval source, custom-code boundary, or Prohibited Reinvention requires the Reuse Gate and architecture review when applicable.

## Summary

| REUSE ID | Capability | Mode | Approved component/reference | Status | Approval Source | Version/source constraint | Custom-code boundary |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REUSE-PROJECTION-001 | Established off-axis/display-centric perspective authority for the thin WorldViewer projection adapter and Class C oracle | B | Kooima generalized-perspective theory; pinned DisplayXR display-centric reference; Three.js `0.186.0` `Matrix4.makePerspective` through REUSE-RENDER-001 | approved | ADR-008 plus the reviewed TDS projection clarification | Pinned DisplayXR reference; reference-only/no vendoring; Three.js `0.186.0` | Thin fixed-screen projection adapter and later camera/inverse integration only |
| REUSE-TAURI-001 | Tauri 2 desktop/native shell path | A | Tauri 2 | approved | ADR-001; TDS §29, §40, §41 | `@tauri-apps/api` `^2`; `@tauri-apps/cli` `2.11.5`; Rust Tauri `2.11.6`; manifests/lockfiles authoritative | Thin native boundary and commands explicitly required by the TDS; no broad native application rewrite |
| REUSE-HOST-001 | React + Vite host application/build path | A | React + Vite | approved | TDS §2, §41 | React `19.3.0`; Vite `8.3.0`; `@vitejs/plugin-react` `6.1.1`; package manifests/lockfile authoritative | React application UI and Vite configuration; no alternate host framework or rendering architecture |
| REUSE-TEST-001 | Vitest test tooling path | A | Vitest | approved | TDS §37, §41; Testing Strategy §4; M0A-2 authorized repair | Vitest exactly `4.1.11`; package manifest/lockfile authoritative | Test configuration, fixtures, and project tests; no second test framework |
| REUSE-RENDER-001 | Three.js/WebGLRenderer rendering path | A | Three.js/WebGLRenderer and approved loaders/utilities | approved | ADR-002; TDS §6, §41 | Three.js `0.186.0`; matching `@types/three` `0.186.0`; package manifests/lockfiles authoritative | Engine-owned renderer/camera/scene integration and coordinate glue; no custom renderer, scene graph, or general asset pipeline |

| REUSE-POSE-FILTER-001 | One Euro viewer-position filtering | A | `1eurofilter` | approved | ADR-007; TDS pose-filter design; explicitly authorized M0E0 planning task | `1.3.0`; upstream `casiez/OneEuroFilter` commit `d78925584245597f2aa9c4c01a802eb0f0b77fb9`; BSD-3-Clause; TypeScript; package itself has no required runtime dependency graph | Thin WorldViewer PoseFilter adapter/integration only; see entry below |

## Canonical entry template

- REUSE ID:
- Capability:
- Reuse Mode:
- Approved component/reference:
- Status:
- Approval Source:
- Version/source/provenance constraint:
- License/provenance:
- Permitted custom-code boundary:
- Prohibited Reinvention:
- Verification:
- Milestone / handoff applicability:
- Notes / limitations:

## Global Do Not Build / Prohibited Reinvention

Ordinary implementation must not replace approved mature capabilities with bespoke alternatives: rendering engine/scene graph/general asset pipeline, face detection/landmark tracking, JSON Schema validation, semantic-version parsing/range evaluation, or motion-filter mathematics. Thin project-specific adapters remain permitted only inside an approved entry boundary. If an approved path cannot satisfy a frozen requirement, stop and report the evidence.

## REUSE-PROJECTION-001

- Capability: Established off-axis/display-centric perspective authority used by WorldViewer’s thin projection adapter and Class C oracle.
- Reuse Mode: B — Adapt approved reference.
- Approved component/reference: Kooima generalized-perspective theory; DisplayXR display-centric projection reference at reviewed commit `5a04922b01c3b9bf88c0b38a35b33e4a231f8c23`; Three.js `0.186.0` `Matrix4.makePerspective` as the matrix primitive through `REUSE-RENDER-001`.
- Status: approved.
- Approval Source: ADR-008 plus the TDS projection clarification materialized by this task.
- Version/source/provenance constraint: DisplayXR implementation code is reference-only; do not vendor or copy upstream source.
- Permitted custom-code boundary: thin fixed-screen adapter from validated ScreenGeometry/effective eye/clip settings to the reviewed asymmetric frustum and later camera/inverse integration when separately authorized.
- Prohibited Reinvention: no novel projection derivation, alternate matrix builder, conventional symmetric `PerspectiveCamera`/`lookAt` substitution, or wholesale upstream copy.
- Verification: `ORC-PROJECTION-001` / projection reference suite once frozen.
- Milestone / handoff applicability: M0B and future projection handoff.

## REUSE-POSE-FILTER-001

- Capability: One Euro viewer-position filtering for the M0E pose-filter boundary.
- Reuse Mode: A - Adopt directly.
- Approved component/reference: `1eurofilter` version `1.3.0` from upstream `casiez/OneEuroFilter`.
- Status: approved.
- Approval Source: ADR-007, the TDS pose-filter design, and the explicitly authorized M0E0 planning task. This entry does not install the package or authorize M0E3 implementation by itself.
- Version/source/provenance constraint: pinned upstream reference commit `d78925584245597f2aa9c4c01a802eb0f0b77fb9`.
- License/provenance: package metadata identifies authors Géry Casiez and Alix Goguey, BSD-3-Clause license, TypeScript implementation, and an upstream ground-truth test corpus. No required runtime dependency graph beyond the package itself is recorded for this decision.
- Permitted custom-code boundary: compose three scalar filters for X/Y/Z; convert millisecond timestamps to seconds as required by the upstream API; validate finite inputs; enforce WorldViewer-required monotonic timestamps; reset filter state; preserve/propagate confidence and timestamps; emit `FilteredViewerPose`; derive `velocityMmPerSec` from filtered position/timestamps if required by the WorldViewer contract; validate configuration; and integrate deterministic trace replay.
- Prohibited Reinvention: do not rewrite One Euro low-pass mathematics or the adaptive cutoff algorithm; substitute another smoothing family; fork/vendor a custom mathematical implementation for convenience; add Kalman, spline, or predictive filtering; or silently change filter semantics during the parameter sweep. If the package cannot satisfy a frozen requirement inside this boundary, stop and report evidence rather than replacing it in the same task.
- Verification: later M0E3 must provide deterministic tests for upstream-compatible behavior, constant signals, step response, reset, finite output, timestamp behavior, X/Y/Z independence, and recorded WorldViewer trace replay. This reuse entry does not claim those tests already exist.
- Milestone / handoff applicability: M0E3 and the M0E calibration/filter experiment; dependency installation remains a later implementation-task concern.
- Notes / limitations: the draft Class C calibration/filter oracle is pending stronger review and is not frozen. Offline and packaged compatibility must be verified during M0E3 before production use.
