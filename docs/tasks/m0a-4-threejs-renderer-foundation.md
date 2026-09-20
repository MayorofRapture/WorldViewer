# M0A-4 — Three.js Renderer Foundation

## Task Metadata

- Status: Proposed — future task; not executed by M0A-2
- Baseline commit: to be populated and validated when promoted to ready
- Preferred execution model: Luna — Medium
- Escalation: genuine architecture/specification conflict only

## Objective

Introduce the approved Three.js/WebGLRenderer dependency and establish the engine-owned renderer foundation integrated with the React shell.

## Required Context

TDS rendering architecture and §41; ADR-002; `REUSE-RENDER-001`; the M0A-3 packaged-launch handoff when available; and the applicable interface/testing authorities.

## Allowed Scope

Install and pin the exact approved Three.js package version, update the existing rendering Reuse Register entry, create only the required `src/engine/rendering/` boundary, own one renderer, host scene root, and PerspectiveCamera, integrate lifecycle with React, and implement minimal resize/cleanup behavior.

## Prohibited Scope

Off-axis projection mathematics, ScreenGeometry, ViewerState, tracking, MediaPipe, calibration/filtering, world SDK/host, diagnostic content, dynamic loading, world lifecycle, M0C synthetic smoke, settings/persistence, and speculative rendering abstractions. Do not create a competing renderer reuse entry or full proposed directory tree.

## Verification / DoD

The task must consume `REUSE-RENDER-001`, verify typecheck/tests/build and the available packaged-launch regression, and report the exact installed version and boundary. The Reuse Gate and any required oracle authority must be resolved before implementation.

## Stop Conditions

Stop on a conflict with ADR-002/TDS §41, an unavailable approval source, a need to change the renderer architecture, or a request to expand beyond the thin engine-owned integration boundary.
