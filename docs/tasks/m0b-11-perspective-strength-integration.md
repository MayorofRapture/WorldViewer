# M0B-11 — Perspective Strength Integration

## Task Metadata

- Task ID: M0B-11
- Milestone / slice: M0B synthetic projection completion before independent audit
- Task type: implementation
- Baseline: `feat/m0a1-foundation` / `2a3e18d17dff8fd61a772fd4848728df5789cb1d`
- Status: complete; ready for independent post-implementation projection audit

## Objective

Apply the specified finite perspective-strength transform to the synthetic projection path without modifying stored `ViewerState` values or frozen Class C projection authority.

## Required Context

- TDS §16 and §§17–19; Interface & Contract Specification §§12 and 14; M0B roadmap; `docs/handoff/projection.md`.
- Frozen `ORC-PROJECTION-001` at `41f7071b2c2fbb6df64dc1280e6b3c63b5ec8ef9`.
- Existing `SyntheticProjectionRuntime`, `applyOffAxisProjectionToCamera`, canonical `Vec3Mm`, and immutable synthetic scripts.

## Allowed Scope

- Pure `src/engine/projection/perspectiveStrength.ts`, synthetic-runtime integration, focused transform/runtime tests, this task/evidence record, and narrow projection handoff updates.
- Finite-strength validation only; default synthetic strength is `1.0`.

## Prohibited / Stop Conditions

- Do not change the frozen oracle, fixtures, formulas, tolerances, viewer-state semantics, display-profile persistence, UI range, ViewerStateController, M0C smoke, tracking, calibration, filtering, production loading, dependencies, SDK, or rotated-screen support.
- Do not claim the independent post-implementation projection audit has passed.

## Verification

- Pure transform covers strengths `0`, `0.5`, `1`, and `1.5`, non-finite rejection, overflow rejection, and input immutability.
- Runtime covers strength `0` neutral projection, strength `1` physical behavior, explicit asymmetric X/Y direction, and fixed diagnostic geometry.
- Run the full repository SDK/boundary/typecheck/test/build/Cargo/diff verification available to the environment.

## Definition of Done

The synthetic path applies the fixed transform immediately before projection while preserving the physical/effective `ViewerState`; the repository is ready for the next independent projection audit.
