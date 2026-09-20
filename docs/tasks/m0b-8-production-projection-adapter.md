# M0B-8 — Production Fixed-Screen Off-Axis Projection Adapter

## Task Metadata

- Task ID: M0B-8
- Milestone / slice: M0B production projection mathematical boundary
- Task type: implementation
- Baseline: `feat/m0a1-foundation` / `d9239655c847b8bc2b7ae84985f9b1adc2ae4643`
- Status: complete

## Objective

Implement the thin fixed-screen off-axis projection adapter so it consumes frozen `ORC-PROJECTION-001` using the approved Three.js matrix primitive, while preserving the frozen authority and leaving camera/render-loop integration deferred.

## Required Context

- ADR-003; ADR-008; TDS §§17–18, §41; Testing Strategy §§3A.3–3A.4.
- Oracle: `ORC-PROJECTION-001`, Class C, review approved, frozen at `41f7071b2c2fbb6df64dc1280e6b3c63b5ec8ef9`; authoritative suite `tests/unit/projectionReferenceOracle.test.ts`; fixtures `tests/fixtures/projectionReferenceCases.ts`.
- Reuse: `REUSE-PROJECTION-001` (Mode B) and `REUSE-RENDER-001` (Mode A); use Three.js `0.186.0` `Matrix4.makePerspective` without vendoring DisplayXR or Kooima source.

## Allowed Scope

- `src/engine/projection/offAxisProjection.ts`; focused adapter test; this task/evidence record; narrow projection handoff update.
- Thin fixed-screen frustum derivation, input-domain validation, and Matrix4 construction only.

## Prohibited / Stop Conditions

- Do not alter frozen fixtures, oracle helper/test, formulas, tolerances, coordinate interpretation, Three.js mapping, dependencies, world SDK, renderer/camera/render-loop/startup, synthetic viewer, diagnostic world, rotated-screen support, or perspective-strength behavior.
- Stop for any conflict with the frozen oracle or approved reuse boundary.

## Verification

- All 12 frozen cases must match literal frusta within `1e-9` and all 16 matrix elements within `1e-9`.
- Invalid non-finite eyes, invalid near/far values, and `eye.z <= near` must fail fast without fallback substitution.
- Run the repository SDK/boundary/typecheck/test/build/Cargo/diff checks available to the environment.

## Definition of Done

The internal adapter and focused unit test consume the frozen oracle and approved Three.js primitive; no live camera/render-loop integration is introduced.
