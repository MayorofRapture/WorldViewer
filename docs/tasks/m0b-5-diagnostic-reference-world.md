# M0B-5 — Diagnostic Reference World Scaffold

## Task Metadata

- Task ID: M0B-5
- Milestone / slice: M0B package-shaped diagnostic reference world
- Task type: implementation
- Implementation model: Luna — Medium
- Baseline: M0B-4B commit `1c6e32c`
- Status: complete

## Objective

Create the package-shaped diagnostic-room source/API/bootstrap scaffold so a normal public `VirtualWorld` can be exercised headlessly before projection or production package loading exists.

## Required Context

- Interface & Contract Specification §§19A–21; TDS §§4, 21–24; WPC §§7–12 and 17–19.
- `ORC-WORLD-BOUNDARY-001`; `REUSE-RENDER-001`.
- Stable SDK: `src/world-sdk/index.ts`; source boundary scripts; `docs/handoff/world-packages.md`.

## Allowed Scope

- `worlds-dev/diagnostic-room/` package-shaped source, manifest, settings schemas/UI hints, and local marker asset.
- `src/world-host/development/diagnosticBootstrap.ts`; TypeScript include; focused headless tests; handoff/evidence/task documentation.

## Prohibited / Out of Scope

- No `dist/world.js`, package manager/workspace, production loader/discovery/manifest validation, asset runtime, startup wiring, camera/projection/tracking/native/persistence access, or projection oracle.

## Verification

- `npm.cmd run check:world-sdk`
- `npm.cmd run check:world-boundaries`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `cargo check --manifest-path src-tauri/Cargo.toml --locked` when the Rust toolchain is available
- `git diff --check`

## Definition of Done

The diagnostic source passes the same public SDK/static boundary checks, headless lifecycle tests prove initialization/update/settings/logging/disposal/root cleanup, and the package remains explicitly pre-M0F and pre-projection.
