# M0B-9 — Off-Axis Projection Camera Integration

## Task Metadata

- Task ID: M0B-9
- Milestone / slice: M0B engine-owned projection camera boundary
- Task type: integration
- Baseline: `feat/m0a1-foundation` / `5a55ddbcde30cf3f8f2731a9940bc53a3f52c21e`
- Status: complete

## Objective

Apply the frozen fixed-screen off-axis projection adapter to the engine-owned Three.js camera while preserving its screen-aligned basis and preventing resize from restoring a symmetric camera projection.

## Required Context

- ADR-002; ADR-003; ADR-008; TDS §§6, 17–19; frozen `ORC-PROJECTION-001` at `41f7071b2c2fbb6df64dc1280e6b3c63b5ec8ef9`.
- `src/engine/projection/offAxisProjection.ts`; `src/engine/rendering/RendererFoundation.ts`; `docs/handoff/projection.md`; `docs/handoff/m0a-4-threejs-renderer-foundation.md`.
- `REUSE-PROJECTION-001` and `REUSE-RENDER-001`; use the existing Three.js `Matrix4.makePerspective` adapter only.

## Allowed Scope

- A narrow internal camera-application module, renderer resize ownership correction, focused deterministic tests, this task/evidence record, and narrow handoff updates.

## Prohibited / Stop Conditions

- Do not modify frozen projection authority, dependencies, world SDK, renderer ownership, startup, render loop, viewer source, synthetic playback, diagnostic runtime, rotated-screen support, or perspective-strength behavior.
- Stop for any conflict with the frozen oracle or for a need to use `lookAt()` or a conventional symmetric projection.

## Verification

- Representative frozen cases prove camera position, fixed orientation, custom matrix, inverse synchronization, near/far synchronization, repeated application, and input immutability.
- Resize behavior preserves an applied custom projection while resizing the renderer canvas.
- Run repository SDK/boundary/typecheck/test/build/Cargo/diff checks available to the environment.

## Definition of Done

The engine-owned camera consumes the existing frozen adapter without an integration loop; resize no longer regenerates a symmetric projection.
