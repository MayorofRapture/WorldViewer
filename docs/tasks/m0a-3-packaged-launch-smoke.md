# M0A-3 — Generic Packaged-Launch Smoke Harness

## Task Metadata

- Status: Proposed — future task; not executed by M0A-2
- Baseline commit: to be populated and validated when promoted to ready
- Preferred execution model: Luna — Medium
- Escalation: Terra — Medium only for a genuine Tauri/Windows packaged-runtime integration problem inside the defined boundary

## Objective

Establish the reusable application-native packaged-launch harness and M0A `launch` mode, preserving the architecture needed for later M0C `synthetic` mode without implementing M0C.

## Required Context

TDS §37, §40, §42; Testing Strategy §19; ADR-001; ADR-020; `docs/testing/oracle-registry.md`; `docs/handoff/README.md`; and the production package configuration.

## Allowed Scope

Implement `WORLD_VIEWER_SMOKE_MODE=launch`, a thin native read-only startup boundary, smoke-only completion command, validated structured result, one machine-readable JSON stdout line, deterministic exit codes, launcher timeout, unchanged normal startup without the variable, reusable harness layout, explicit full Tauri production-package command, and packaged execution without Vite/localhost dependency.

## Oracle-first sequence

1. Derive launch-smoke behavior from frozen TDS/Testing Strategy requirements.
2. Create the authoritative automated procedure/harness expectation.
3. Create and classify the applicable Oracle Registry Class B record.
4. Freeze the expected behavior before production implementation.
5. Implement production/native smoke behavior.
6. Verify against the frozen expectation and update only non-semantic pointers.

## Prohibited Scope

M0C synthetic behavior, Three.js readiness, diagnostic world, camera permissions, MediaPipe, world loading, full offline verification, GUI automation, installer/update behavior, and acceptance-criterion weakening.

## Verification / DoD

Require typecheck, tests, build, full production package, and launcher-enforced packaged smoke verification. The final task must reconcile any no-bundle convenience command with an explicit normal Tauri package command. Do not begin until the Class B oracle is frozen and the Reuse Gate is satisfied.

## Stop Conditions

Stop on conflict with TDS/Testing Strategy/ADR-001/ADR-020, missing oracle authority, or any need to implement M0C behavior or broaden package/runtime architecture.
