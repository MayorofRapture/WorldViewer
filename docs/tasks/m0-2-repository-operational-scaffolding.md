# M0A-2 — Repository Operational Scaffolding and Baseline Repair

## 4.1 Task Metadata

- Status: Ready for execution / bounded repair task
- Milestone: M0A — Repository and Application Foundation
- Implementation model/reasoning level: Luna — Medium; escalate only for a genuine authority or cross-boundary packaging conflict
- Baseline: actual starting HEAD recorded in the completion report

## 4.2 Objective

Materialize M0A’s non-runtime evidence, handoff, Oracle Registry, and Reuse Register infrastructure; repair the invalid Vite alias and Vite/Vitest tooling mismatch; repair repo-local ADR navigation and the explicitly authorized ADR-001 transcription artifact; and create proposed task specifications for M0A-3 and M0A-4.

## 4.3 Required Context

- `docs/planning/milestone-roadmap.md`: governance, readiness gate, and M0A
- `docs/architecture/technical-design-specification.md`: §4, §37, §40–§42
- `docs/testing/testing-strategy.md`: §4, §5, §19, §34–§35
- `docs/testing/oracle-registry-design.md`
- `docs/reuse-register-design.md`
- `docs/tasks/task-specification-template.md`
- `docs/architecture/adr/README.md`, ADR-001, ADR-002, ADR-020
- `vite.config.ts`, package manifests/lockfiles, TypeScript configs, `src/`, `tests/`, and `src-tauri/`

## 4.4 Allowed Scope

- Create this task specification, `evidence/README.md`, `docs/handoff/README.md`, `docs/testing/oracle-registry.md`, and `docs/reuse-register.md`.
- Update only the Vite config and package manifests/lockfile required for the exact Vitest repair.
- Update ADR index navigation to prefer repo-local ADR files and remove the explicitly authorized trailing `d` from ADR-001.
- Create proposed, unimplemented M0A-3 and M0A-4 task specifications.

## 4.5 Prohibited / Out-of-Scope Changes

- Do not implement packaged-launch smoke, native smoke commands, Three.js, WebGLRenderer, tracking, projection, world, persistence, calibration, or diagnostic runtime behavior.
- Do not change the Roadmap, TDS, Testing Strategy, accepted ADR meaning, or registry designs.
- Do not create fake evidence, fake Oracle IDs, speculative handoff notes, a second test framework, browser/GUI automation, or unrelated dependency changes.
- Do not perform Git history/state mutations.

## 4.6 Deliverables

- Operational evidence home, handoff template, empty-but-structured Oracle Registry, and source-backed initial Reuse Register.
- Vite alias removed; Vitest upgraded exactly from `2.1.8` to `4.1.11`; plugin type escape removed if typing succeeds.
- Repo-local ADR navigation repaired and ADR-001 transcription artifact removed.
- Proposed M0A-3 and M0A-4 task specifications only.

## 4.7 Verification

Class A routine repository/tooling verification. Run:

```text
npm.cmd ci
npm.cmd ls vite vitest @vitejs/plugin-react
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
cargo check --manifest-path src-tauri/Cargo.toml --locked
npx.cmd tauri build
git diff --check
git status --short
```

The dependency tree must show Vitest `4.1.11` using the project Vite path and no obsolete Vitest-2-driven Vite-5 path. Do not claim packaged-launch smoke passes; that runtime harness belongs to M0A-3.

## 4.8 Escalation / Stop Conditions

- Stop if an authoritative source conflicts with a requested change.
- If Vitest `4.1.11` causes an unexpected incompatibility that cannot be resolved with a small configuration migration, stop this portion and report the evidence rather than upgrading to another Vitest major, downgrading Vite, or performing broader dependency changes.
- Stop if a required registry approval, ADR, manifest, or verification prerequisite is missing or contradictory.

## 4.9 Definition of Done

- All scoped artifacts exist and point to authoritative sources without duplicating their semantics.
- The alias is absent, normal Tauri API resolution remains intact, and `vite.config.ts` has no `as any` plugin escape.
- Only Vitest changes directly, pinned exactly at `4.1.11`; no unrelated direct dependency upgrades occur.
- Reuse entries are real and source-backed; no invented Oracle records exist.
- ADR navigation is repo-local-first and only the authorized ADR-001 transcription artifact changed.
- M0A-3 and M0A-4 are proposed and unimplemented.
- Required verification is fresh and reported command-by-command.

## 4.10 Completion Report

Report the starting branch, HEAD, and worktree; consulted authority; files created/modified; alias and dependency repairs; resolved tree; type escape status; registry contents; ADR repairs; task-spec summaries; every verification result; warnings; unresolved prerequisites; final status; and confirmation that no Git mutation occurred.
