# M0B-6 — Synthetic Head-Motion Scripts

## Task Metadata

- Task ID: M0B-6
- Milestone / slice: M0B deterministic synthetic motion support
- Task type: implementation
- Implementation model: Luna — Medium
- Baseline: M0B-5 commit `5598101`
- Status: complete

## Objective

Add small immutable timed `RawViewerPose` sequences alongside the existing synthetic pose source while preserving the M0B-3 coordinate vocabulary and keeping projection correctness out of scope.

## Required Context

- ADR-003 and ADR-004; Interface & Contract Specification §§3, 6, 10, and 31.
- `src/engine/pose/SyntheticViewerPoseSource.ts`; `src/engine/pose/syntheticPoseFixtures.ts`.

## Allowed Scope

- `src/engine/pose/syntheticMotionScripts.ts`; focused Class A tests; bounded M0B task/evidence/handoff updates.

## Prohibited / Out of Scope

- No projection matrices, NDC/golden outputs, clipping, tolerances, camera behavior, tracking, filtering, calibration, or source relocation.

## Definition of Done

Five stable immutable scripts pass strict-order, finite-input, source-compatibility, repeatability, and immutability tests without encoding projection judgments.
