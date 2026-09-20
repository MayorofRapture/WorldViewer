---
name: project-verification
description: Use before claiming a WorldViewer task is complete, correct, passing, or ready. Resolves the applicable project evidence and requires fresh execution results for each material claim.
---

# Project Verification

This skill is procedural only. It does not define correctness. The current task instruction or task specification identifies the claims and required outcome; applicable authoritative requirements, contracts, acceptance criteria, Testing Strategy, Oracle Registry entries and procedures, and repository acceptance gates determine what those claims mean and what evidence is sufficient. Prompt wording or conversation summaries do not redefine those thresholds, tolerances, contracts, or oracle semantics. If the task explicitly authorizes a valid change to an owning specification, verify against the updated source.

## 1. Enumerate the authorized claims to prove

List the material completion claims authorized by the task, identify the source that owns each claim's meaning, and then choose evidence. Examples include:

- required files/contracts exist;
- typecheck/build/test expectations pass;
- a regression is fixed;
- packaged startup works;
- public/private boundaries or conformance requirements hold;
- a milestone/task Definition of Done item is satisfied.

Do not add requirements that the authoritative sources do not require, and do not let a prompt silently redefine an existing acceptance criterion or contract.

## 2. Resolve each claim to authoritative evidence

For each claim:

1. locate the task/requirement/contract that requires it;
2. resolve any ORC ID through `docs/testing/oracle-registry.md` when present;
3. follow the registry entry to the test, script, procedure, artifact, or other source that actually determines pass/fail.

The registry is navigation, not the oracle itself.

If a required oracle/procedure is missing, unavailable, contradictory, or not yet Verification Ready, report that condition. Do not invent a substitute test and call the requirement verified.

## 3. Prefer deterministic repository procedures

When the repository supplies a script or command for a repeatable check, run that procedure rather than reproducing its steps manually.

Examples may eventually include typechecking, unit/integration tests, build verification, package/conformance checks, or a packaged-startup smoke harness. The applicable authoritative source determines which are required for the current task.

## 4. Obtain fresh evidence

Run the required checks after the relevant implementation changes.

For every command/procedure:

- capture the exact command or named procedure;
- inspect exit status/result, not just nearby output;
- read failures and warnings that affect the claim;
- distinguish a passing targeted check from broader project verification;
- do not reuse stale output from before the current change as completion evidence.

If verification itself fails unexpectedly, use `systematic-debugging` before changing code merely to make the check green.

## 5. Evaluate claim by claim

A claim is verified only when its required current evidence supports it.

Use precise status:

- **Verified** — fresh authoritative evidence supports the claim.
- **Failed** — authoritative evidence contradicts the claim.
- **Unverified** — required evidence was not run, is unavailable, or is inconclusive.
- **Blocked** — a missing/conflicting authority or prerequisite prevents valid verification.

Do not convert Unverified or Blocked into a pass based on inspection, intuition, or confidence.

## 6. Report evidence

Before any overall completion claim, summarize:

- claim/DoD item;
- authoritative source or ORC reference;
- command/procedure executed;
- result;
- any relevant limitation.

If any required material claim is Failed, Unverified, or Blocked, say the task is not fully verified and identify exactly what remains.

Verification does not authorize Git mutation, architecture changes, dependency replacement, or scope expansion.
