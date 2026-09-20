---
name: bounded-task-execution
description: Use for scoped WorldViewer implementation tasks. Establishes authority, repository baseline, Allowed Scope, reuse constraints, and completion handoff before making changes.
---

# Bounded Task Execution

This skill is procedural only. It does not override task specifications, accepted ADRs, the TDS, Interface & Contract Specification, World Package Conformance Specification, Testing Strategy, Oracle/Reuse registries, or subsystem handoffs. Conflicts or missing authority stop and escalate.

## 1. Establish the task contract

Before editing, identify the current task and extract only what governs execution:

- objective and completion conditions;
- Allowed Scope and explicitly prohibited changes;
- applicable milestone/gate;
- referenced requirements, contracts, ADRs, handoffs, ORC IDs, and REUSE IDs;
- any explicit permission for architectural change, Reuse Mode D, Git mutation, dependency changes, or destructive operations.

If the task is not sufficiently bounded to know what may change and what proves completion, do not improvise the missing boundary.

## 2. Read the minimum authoritative context

Open the smallest set of authoritative sources necessary to perform the task. Follow links/IDs to their owning source rather than treating summaries as authority.

Do not copy architecture or test criteria into this skill. If a required authoritative source is not available in the repository/session, surface that as a blocker rather than reconstructing it from memory.

## 3. Capture the repository baseline

Use read-only inspection before making changes. At minimum, capture equivalent evidence for:

```text
git status --short
git branch --show-current
git rev-parse HEAD
```

When relevant, inspect existing diffs in files you may touch.

Rules:

- preserve all pre-existing changes;
- do not clean/reset/stash/checkout unrelated work;
- distinguish baseline changes from changes made by this task;
- do not fetch, branch, stage, commit, push, or rewrite Git state unless explicitly authorized.

## 4. Resolve reuse obligations before implementation

For every applicable REUSE entry or reuse-sensitive behavior:

1. open `docs/reuse-register.md` when present;
2. follow the entry to its Approval Source;
3. identify the authorized Reuse Mode (A/B/C/D);
4. identify any Prohibited Reinvention constraint;
5. use the approved dependency/reference/primitives accordingly.

Mode D requires explicit authorization. If the approved reuse path cannot satisfy the task, stop and report the conflict instead of silently replacing it with custom code.

For every applicable ORC entry, open `docs/testing/oracle-registry.md` when present and follow it to the source that actually defines correctness.

## 5. State the execution boundary

Before substantive edits, keep a concise working boundary:

- files/areas expected to change;
- interfaces that must remain unchanged;
- behaviors explicitly out of scope;
- reuse decisions that constrain implementation;
- evidence expected at verification.

This is a working checklist, not a new specification.

## 6. Implement the smallest authorized change

- Prefer approved reuse over bespoke code.
- Preserve public/private repository boundaries.
- Keep changes inside Allowed Scope.
- Avoid unrelated formatting, renames, dependency upgrades, and refactors.
- When a new ambiguity would require an architectural or approval decision, stop that part of the task and surface it.
- If a check fails or behavior becomes unexpected, switch to `systematic-debugging` rather than guessing.

## 7. Verify before completion

Invoke `project-verification`. A successful edit is not evidence of a successful task.

Do not claim completion until the applicable task/Testing Strategy/oracles have fresh supporting evidence.

## 8. Completion report

Report concisely:

- starting branch/commit and relevant baseline state;
- files changed by this task;
- reuse decisions/references actually used;
- verification commands/procedures run and their results;
- any unverified claim, unresolved issue, or authority gap;
- Git mutations performed, if explicitly authorized (otherwise state none).

Never hide a failed, skipped, unavailable, or inconclusive verification step behind a general statement that the task "looks good."
