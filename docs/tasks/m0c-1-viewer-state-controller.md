# M0C1 - ViewerStateController

## Task Metadata

- Task ID: M0C1
- Milestone / slice: M0C deterministic viewer state
- Task type: bounded implementation and deterministic test
- Baseline: `2ff860d4314e3ee171a2fa7368f5199c08885860`
- Oracle: `ORC-VIEWER-STATE-001`, Class B, not-required review, frozen after verification
- Status: complete

## Objective

Implement the host-private deterministic `ViewerStateController` against the accepted clock, transition, easing, invalid-pose, reset, and frame-scoped state contracts without integrating it into M0B runtime or M0C2 packaged smoke.

## Scope

The controller uses an injected `MonotonicClock`, fixed `350 ms` loss confirmation, fixed `5000 ms` neutral return, fixed `300 ms` smoothstep reacquisition, validated filtered-pose inputs, copied velocity/confidence, immutable outputs, and reset-safe transition state. ManualClock exists only in deterministic tests.

No public SDK, projection, camera, perspective-strength, M0B runtime, packaged smoke, tracking, calibration, filtering, dependency, or world-loader changes are included.

## Verification

Tests cover startup statuses, first acquisition, normal updates, degraded grace, 349/350 ms boundaries, neutral return, reacquisition and latest-target behavior, interruption/restart, repeated short interruptions, invalid poses, reset, backward clocks, and immutability. Repository verification records actual command results in the accompanying evidence file.
