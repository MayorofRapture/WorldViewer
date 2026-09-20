# WorldViewer Agent Instructions

These instructions govern agent execution in this repository. They are procedural only and do not create or replace project requirements, architecture, contracts, verification criteria, approvals, or milestone authority.

## Authority rule

The current explicit task instruction or task specification authorizes the work: its objective, Allowed Scope, prohibited changes, explicit permissions, and completion assignment. It does not redefine the project's substantive product, architecture, contracts, acceptance criteria, verification thresholds, oracle semantics, or reuse decisions.

Use the applicable authoritative repository sources for substance. In particular, do not override or silently reinterpret an accepted ADR, Technical Design Specification (TDS), Interface & Contract Specification, World Package Conformance Specification, Testing Strategy, Oracle Registry, Reuse Register, or subsystem handoff. Prompts, conversation summaries, and repeated context are navigation or authorization context only; they are not a replacement for an owning specification unless the task explicitly authorizes a deliberate specification change.

If applicable authority conflicts, is missing, or does not authorize a needed architectural/reuse decision, identify the owning source, stop the affected part of the task, and surface the gap. Do not silently choose, invent a replacement decision, or broaden the task to reconcile it. If a task explicitly authorizes changing the owning specification, make that change deliberately within the stated scope before relying on the updated authority.

## Required workflow

- For normal implementation work, use [bounded-task-execution](.agents/skills/bounded-task-execution/SKILL.md).
- For a bug, failed check, unexpected behavior, or unclear regression, use [systematic-debugging](.agents/skills/systematic-debugging/SKILL.md) before proposing a fix.
- Before claiming that implementation is complete, correct, passing, or ready, use [project-verification](.agents/skills/project-verification/SKILL.md) and obtain fresh evidence.

## Documentation routing

Start with the current task's Required Context; this map is navigation, not a reading checklist.

- Tasks: `docs/tasks/`; authoring and context rules in `docs/tasks/task-specification-template.md`. A template is not an assigned task.
- Product: `docs/product/product-specification-prd.md`, `docs/product/non-functional-requirements.md`, and `docs/product/project-vision-charter.md`.
- Architecture/contracts: `docs/architecture/technical-design-specification.md` and `docs/architecture/interface-contract-specification.md`.
- ADRs: `docs/architecture/adr/README.md` indexes status and links to individual decision records. Read the applicable record; the index is not its replacement.
- Verification: `docs/testing/testing-strategy.md`; world-package requirements in `docs/testing/world-package-conformance-specification.md`; estimator experiments in `docs/experiments/pose-estimator-experiment-specification.md`.
- Planning/gates: `docs/planning/milestone-roadmap.md`.
- Reuse approval rules: TDS section 41; registry design in `docs/reuse-register-design.md`. Oracle registry design: `docs/testing/oracle-registry-design.md`.

Check for live `docs/reuse-register.md`, `docs/testing/oracle-registry.md`, and task-relevant `docs/handoff/` notes before resolving IDs. The registry design documents describe planned artifacts, not live approved entries. If a task requires an absent registry entry, handoff, or inaccessible linked ADR, surface that specific prerequisite under the authority rule; do not infer it from a design template or index.

## Repository safety

- Preserve pre-existing and unrelated work.
- Treat read-only Git inspection as routine. Do not create/switch branches, stage, commit, reset, clean, rebase, merge, push, force-update refs, or otherwise mutate Git history/state unless the current task explicitly authorizes it.
- Do not broaden Allowed Scope for convenience.
- Do not perform opportunistic refactors or unrelated cleanup.
- Do not redesign settled architecture during an implementation task.
- Respect the project's Reuse Modes. Mode D — Project-specific custom implementation requires explicit authorization.
- Respect Prohibited Reinvention. Do not replace, bypass, duplicate, or rebuild an approved mature dependency/reference because custom code appears easier.

## Context discipline

Load only the authoritative material needed for the current task. Resolve referenced ORC/REUSE IDs instead of copying registry content into prompts or skills. Prefer deterministic repository scripts for repeatable operations when they exist.

Discover filenames with `rg --files docs`; search the selected document's headings or exact IDs with `rg -n` before reading the relevant sections. Follow cross-references only when needed to resolve the task's authority or evidence. Load only applicable skill bodies; do not preload the entire skill collection or documentation tree.
