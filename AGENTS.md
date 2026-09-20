# WorldViewer Agent Instructions

These instructions govern agent execution in this repository. They are procedural only and do not create or replace project requirements, architecture, contracts, verification criteria, approvals, or milestone authority.

## Authority rule

Use the project's authoritative sources for substance. In particular, do not override or silently reinterpret an applicable task specification, accepted ADR, Technical Design Specification (TDS), Interface & Contract Specification, World Package Conformance Specification, Testing Strategy, Oracle Registry, Reuse Register, or subsystem handoff.

If applicable authority conflicts, is missing, or does not authorize a needed architectural/reuse decision, stop that part of the task and surface the gap. Do not invent a replacement decision.

## Required workflow

- For normal implementation work, use the `bounded-task-execution` skill.
- For a bug, failed check, unexpected behavior, or unclear regression, use the `systematic-debugging` skill before proposing a fix.
- Before claiming that implementation is complete, correct, passing, or ready, use the `project-verification` skill and obtain fresh evidence.

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
