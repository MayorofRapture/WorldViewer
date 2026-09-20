---
name: bounded-task-execution
description: Use for scoped WorldViewer implementation tasks. Establishes authority, repository baseline, Allowed Scope, reuse constraints, and completion handoff before making changes.
---

# Bounded Task Execution

This skill is procedural only. It does not override task specifications, accepted ADRs, the TDS, Interface & Contract Specification, World Package Conformance Specification, Testing Strategy, Oracle/Reuse registries, or subsystem handoffs. Conflicts or missing authority stop and escalate.

## 1. Establish the authorized task boundary

Before editing, identify the current task and extract only what governs execution:

- objective and completion conditions;
- Allowed Scope and explicitly prohibited changes;
- applicable milestone/gate;
- referenced requirements, contracts, ADRs, handoffs, ORC IDs, and REUSE IDs;
- any explicit permission for architectural change, Reuse Mode D, Git mutation, dependency changes, or destructive operations.

The task instruction or task specification authorizes the work and defines its boundary. Its wording does not become substantive architecture, contract, acceptance, oracle, or reuse authority merely because it is explicit or repeated in a prompt. Prompts and conversation summaries are context unless the task explicitly authorizes a deliberate specification change.

If the task is not sufficiently bounded to know what may change and what proves completion, do not improvise the missing boundary.

## 2. Identify the owning sources

Map each material implementation or verification decision to its owning repository source before acting. Depending on the task, this may include an accepted ADR, product or normative specification, interface/contract or conformance specification, Testing Strategy, Oracle Registry entry, approved schema or source interface, reuse approval, or subsystem handoff. If the task conflicts with an owning source, stop the affected work and report the conflict; do not silently choose, invent a reconciliation, or broaden scope. A deliberate specification change is allowed only when the task explicitly includes that change.

## 3. Read the minimum authoritative context

Open the smallest set of authoritative sources necessary to perform the task. Follow links/IDs to their owning source rather than treating summaries as authority.

Do not copy architecture or test criteria into this skill. If a required authoritative source is not available in the repository/session, surface that as a blocker rather than reconstructing it from memory.

## 4. Capture the repository baseline

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

## 5. Resolve reuse obligations before implementation

For every applicable REUSE entry or reuse-sensitive behavior:

1. open `docs/reuse-register.md` when present;
2. follow the entry to its Approval Source;
3. identify the authorized Reuse Mode (A/B/C/D);
4. identify any Prohibited Reinvention constraint;
5. use the approved dependency/reference/primitives accordingly.

Mode D requires explicit authorization. If the approved reuse path cannot satisfy the task, stop and report the conflict instead of silently replacing it with custom code.

For every applicable ORC entry, open `docs/testing/oracle-registry.md` when present and follow it to the source that actually defines correctness.

## 6. State the execution boundary

Before substantive edits, keep a concise working boundary:

- files/areas expected to change;
- interfaces that must remain unchanged;
- behaviors explicitly out of scope;
- reuse decisions that constrain implementation;
- evidence expected at verification.

This is a working checklist, not a new specification or a mechanism for resolving authority conflicts by choosing a convenient interpretation.

## 7. Implement the smallest authorized change

- Prefer approved reuse over bespoke code.
- Preserve public/private repository boundaries.
- Keep changes inside Allowed Scope.
- Avoid unrelated formatting, renames, dependency upgrades, and refactors.
- When a new ambiguity would require an architectural or approval decision, stop that part of the task and surface it.
- If a check fails or behavior becomes unexpected, switch to `systematic-debugging` rather than guessing.

## 8. Verify before completion

Invoke `project-verification`. A successful edit is not evidence of a successful task.

Do not claim completion until the applicable task/Testing Strategy/oracles have fresh supporting evidence.

## 9. Completion report

Report concisely:

- starting branch/commit and relevant baseline state;
- files changed by this task;
- reuse decisions/references actually used;
- verification commands/procedures run and their results;
- any unverified claim, unresolved issue, or authority gap;
- Git mutations performed, if explicitly authorized (otherwise state none).

Never hide a failed, skipped, unavailable, or inconclusive verification step behind a general statement that the task "looks good."
