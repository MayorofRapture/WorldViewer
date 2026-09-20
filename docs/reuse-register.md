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
| REUSE-TAURI-001 | Tauri 2 desktop/native shell path | A | Tauri 2 | approved | ADR-001; TDS §29, §40, §41 | `@tauri-apps/api` `^2`; `@tauri-apps/cli` `2.11.5`; Rust Tauri `2.11.6`; manifests/lockfiles authoritative | Thin native boundary and commands explicitly required by the TDS; no broad native application rewrite |
| REUSE-HOST-001 | React + Vite host application/build path | A | React + Vite | approved | TDS §2, §41 | React `19.3.0`; Vite `8.3.0`; `@vitejs/plugin-react` `6.1.1`; package manifests/lockfile authoritative | React application UI and Vite configuration; no alternate host framework or rendering architecture |
| REUSE-TEST-001 | Vitest test tooling path | A | Vitest | approved | TDS §37, §41; Testing Strategy §4; M0A-2 authorized repair | Vitest exactly `4.1.11`; package manifest/lockfile authoritative | Test configuration, fixtures, and project tests; no second test framework |
| REUSE-RENDER-001 | Three.js/WebGLRenderer rendering path | A | Three.js/WebGLRenderer and approved loaders/utilities | approved | ADR-002; TDS §6, §41 | Three.js `0.186.0`; matching `@types/three` `0.186.0`; package manifests/lockfiles authoritative | Engine-owned renderer/camera/scene integration and coordinate glue; no custom renderer, scene graph, or general asset pipeline |

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
