# M0B-10 — Synthetic Projection Runtime

## Task Metadata

- Task ID: M0B-10
- Milestone / slice: M0B deterministic end-to-end projection path
- Task type: integration
- Baseline: `feat/m0a1-foundation` / `f6e8db53377bac3379facd01db9dc3f6aaf1e15e`
- Status: complete

## Objective

Run existing synthetic poses through the frozen off-axis adapter and engine-owned camera into the package-shaped diagnostic room, while keeping the world fixed and preserving the public world boundary.

## Required Context

- ADR-002, ADR-003, ADR-008; TDS §§6, 8, 17–19; M0B roadmap; frozen `ORC-PROJECTION-001`.
- Existing synthetic source/scripts, projection adapter/camera boundary, renderer foundation, development diagnostic bootstrap, public `WorldFrame`/`ViewerState` contracts, and projection/world-package handoffs.
- E590 reference geometry is `345.4 mm × 194.3 mm`; M0B clip baseline is `50 mm` / `5000 mm`.

## Allowed Scope

- Host-private synthetic runtime, existing synthetic/development startup path, focused deterministic tests, this task/evidence record, and narrow projection/renderer/world-package handoff updates.

## Prohibited / Stop Conditions

- Do not modify frozen projection authority, diagnostic-world geometry behavior, public SDK, dependencies, launch smoke, MediaPipe, calibration, filtering, ViewerStateController, tracking loss, perspective strength, production world loading, settings, or persistence.
- Stop for a conflict with the frozen oracle, display baseline, or public world boundary.

## Verification

- Deterministic runtime tests cover centered, lateral, vertical, and distance behavior; fixed diagnostic geometry; scheduling/disposal; and public world context isolation.
- Run full SDK/boundary/typecheck/test/build/Cargo/diff verification available to the environment.

## Definition of Done

The synthetic/development path drives the fixed diagnostic room through camera position plus frozen off-axis projection only, without introducing broader M0B/M0C behavior.
