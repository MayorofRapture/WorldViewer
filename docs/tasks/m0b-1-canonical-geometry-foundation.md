# M0B-1 — Canonical Physical Geometry Foundation

## Task Metadata

- Task ID: M0B-1
- Milestone / slice: M0B deterministic geometry support
- Task type: implementation and deterministic test
- Implementation model: Luna — Medium
- Baseline branch/commit: `feat/m0a1-foundation` / `87b7cef099bba0bd91f401c803920f9abda03467`
- Status: complete

## Objective

Implement the contract-derived canonical millimeter vector and centered screen geometry representation, including finite-positive display-dimension validation, while preserving the frozen coordinate convention and avoiding projection behavior.

## Preconditions / Required Context

- M0A exit gate is verified and the worktree is clean.
- ADR-003 is Accepted.
- Governing contract: Interface & Contract Specification §§4, 6, 12, and 30.
- Supporting roadmap: M0B geometry deliverables and Class C projection stop gate.
- Supporting architecture: TDS §§6–8.
- Testing authority: Testing Strategy §§3A.1, 5, and 6.
- Oracle ID: none; these are Class A routine deterministic checks derived directly from the frozen contract.
- Reuse ID: none; this is a small project-specific data/validation type boundary, with no mature dependency applicable.

## Allowed Scope

- Add the minimal `src/engine/geometry/` implementation and deterministic unit tests.
- Represent `Vec3Mm` and `ScreenGeometry` with immutable/read-only public values.
- Derive center and four screen corners from positive finite physical width/height in millimeters.
- Add this task specification and required evidence/handoff pointers only.

## Prohibited Scope

- Projection matrices, clipping, camera changes, asymmetric frustums, ScreenGeometry-to-camera adapters, or Class C oracle work.
- Rotated screen planes, viewer pose/state, tracking, calibration, filtering, worlds, settings, or package loading.
- New dependencies, alternate coordinate conventions, or speculative geometry frameworks.

## Deliverables

- Canonical geometry implementation and deterministic tests.
- Updated task status and M0B geometry handoff/evidence pointers if required.

## Verification / Definition of Done

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `cargo check --manifest-path src-tauri/Cargo.toml --locked`
- `git diff --check`
- Tests cover center/corners, symmetry, axis signs, Z=0, invalid dimensions, non-finite values, and immutability.
- Existing M0A packaged smoke is rerun only if application integration changes.

## Escalation / Stop Conditions

Stop if implementation requires projection mathematics, a new or changed oracle, a frozen-interface reinterpretation, or an architecture/reuse decision. The Class C projection gate remains reserved for stronger review.
