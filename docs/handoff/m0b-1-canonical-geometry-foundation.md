# M0B-1 Canonical Geometry Foundation Handoff

- Subsystem status and supported scope: Verified deterministic canonical millimeter vector and centered physical screen geometry.
- Stable public contract/interface paths: `src/engine/geometry/screenGeometry.ts`; Interface & Contract Specification §§4, 6, and 12.
- Oracle IDs: None; checks are Class A routine deterministic tests derived from frozen contracts.
- Authoritative tests/oracles: `tests/unit/screenGeometry.test.ts`.
- M1 oracle freeze status and Class A/B/C classification: Class A only; no projection oracle introduced.
- Known-good reference implementation, when applicable: ADR-003 canonical coordinate convention.
- REUSE IDs: None applicable.
- Approved dependency/reference implementation: None; uses native TypeScript values and validation.
- Authoritative Approval Source: ADR-003; Interface & Contract Specification §§4, 6, 12, and 30; TDS §7.
- Reuse Mode: Not applicable.
- Version/source/provenance constraints: None.
- Remaining project-specific custom-code boundary: Geometry value construction and validation only.
- Prohibited Reinvention: No projection math, camera adapter, clipping behavior, rotated plane, or alternate coordinate convention.
- Deterministic tests and fixture paths: `tests/unit/screenGeometry.test.ts`.
- Governing ADR references: `docs/architecture/adr/ADR-003 — Canonical Screen Coordinate System and Millimeter Units.md`.
- Evidence references: `evidence/milestone-0/m0b-1-geometry.json`.
- Known limitations / unsupported behavior: No projection matrices, camera changes, viewer pose, tracking, or world behavior.
- Exact verification commands: `npm.cmd run typecheck`; `npm.cmd test`; `npm.cmd run build`; `cargo check --manifest-path src-tauri/Cargo.toml --locked`; `git diff --check`.
- Escalation conditions: Any request to derive or apply projection, define golden outputs/tolerances, or alter the canonical coordinate contract.

Canonical type ownership note: `Millimeters` and `Vec3Mm` are now defined in `src/shared/contracts/primitives.ts`; `screenGeometry.ts` remains the engine-owned construction/validation implementation.
