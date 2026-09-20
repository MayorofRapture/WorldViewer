# M0B-3 — Synthetic Pose Fixtures

## Task Metadata

- Task ID: M0B-3
- Milestone / slice: M0B deterministic pose fixtures
- Task type: fixture and deterministic test
- Implementation model: Luna — Medium
- Baseline branch/commit: `feat/m0a1-foundation` / `68d96fc0036e52182933bf3cfe69c3dd090669d3`
- Status: complete

## Objective

Provide reusable deterministic canonical pose fixtures for the M0B scenarios already named by the contracts and roadmap, without encoding projection matrices, NDC results, tolerances, or other Class C expectations.

## Preconditions / Required Context

- M0B-1 canonical geometry and M0B-2 synthetic source are committed and verified.
- Governing contract: Interface & Contract Specification §§6, 10, and 31.
- Supporting authority: ADR-003, ADR-004, and the M0B roadmap.
- Testing authority: Testing Strategy §§3A.1 and 6.
- Oracle ID: none; fixture values are deterministic support data, not a projection oracle.
- Reuse ID: none applicable.

## Allowed Scope

- Add reusable centered, ±X, ±Y, near, far, and asymmetric X+Y canonical pose fixtures.
- Add focused tests for stable IDs, canonical units, and fixture values.
- Add required task/evidence/handoff pointers.

## Prohibited Scope

- Projection matrices, NDC/golden outputs, epsilon/tolerance choices, camera changes, projection adapters, ViewerState, tracking, calibration, filtering, worlds, or M0C smoke.

## Verification / Definition of Done

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `cargo check --manifest-path src-tauri/Cargo.toml --locked`
- `git diff --check`
- Existing M0B-1/M0B-2 tests remain passing.

## Escalation / Stop Conditions

Stop before adding any expected projection result or mathematical tolerance. Such behavior belongs to the future Class C projection oracle and stronger review.
