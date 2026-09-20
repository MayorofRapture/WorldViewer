---
name: systematic-debugging
description: Use for any WorldViewer bug, failed check, regression, build problem, performance anomaly, or unexpected behavior before proposing implementation fixes.
---

# Systematic Debugging

Adapted from Jesse Vincent's `obra/superpowers` systematic-debugging skill. See `PROVENANCE.md` and `LICENSE` in this directory.

This skill is procedural only. It cannot authorize architecture changes, scope expansion, dependency replacement, Reuse Mode D, or a different correctness oracle. Project authority remains external to the skill.

## Core rule

**Investigate root cause before implementing a fix.** Do not stack plausible changes on an untested assumption.

## Phase 1 — Establish the failure and gather evidence

1. Read the complete error, warning, stack trace, failing assertion, or observed symptom.
2. Reproduce the failure consistently when possible. Record the minimal triggering conditions.
3. Inspect recent/relevant changes and environment differences without mutating unrelated work.
4. In multi-component flows, identify the boundary where correct state becomes incorrect. Add temporary diagnostic evidence only when authorized and necessary.
5. Trace bad values/state backward to their origin instead of fixing only the final symptom.

If the failure is intermittent, gather enough evidence to characterize when it occurs. Do not guess merely because reproduction is difficult.

## Phase 2 — Compare against known-good behavior

1. Find a working example in the repository or an approved reference/dependency.
2. Read the relevant reference completely enough to understand the behavior being reused.
3. List meaningful differences between working and failing cases.
4. Identify assumptions, configuration, ordering, lifetime, units, threading/process boundaries, and dependencies that could explain the failure.

Respect Prohibited Reinvention and approved Reuse Modes while debugging.

## Phase 3 — Form and test one hypothesis

State one falsifiable hypothesis:

> I think **X** is the root cause because **Y evidence**.

Then test it with the smallest safe observation or change that can distinguish the hypothesis from alternatives.

- Change one variable at a time.
- If the hypothesis is disproved, remove/revert diagnostic-only changes where appropriate and form a new hypothesis.
- Do not accumulate speculative fixes.
- If you do not understand a mechanism, research or escalate rather than pretending certainty.

## Phase 4 — Implement the authorized fix

After the root cause is supported by evidence:

1. Add or update the regression test/reproduction required by the applicable task, Testing Strategy, and oracle. When no automated test is required or feasible, preserve the required evidence another authorized way.
2. Implement the smallest fix that addresses the root cause.
3. Avoid unrelated refactors and "while here" cleanup.
4. Run `project-verification` before claiming the issue is resolved.

## Failed-fix limit

If multiple evidence-based hypotheses/fixes fail, return to Phase 1 with the new evidence. After three failed implementation attempts, stop before a fourth and surface the pattern for architectural review.

This is an escalation trigger, **not permission to redesign the architecture**. Any architectural change still requires its normal project authority.

## Fast root-cause tracing

When a bad value or state appears deep in a call chain:

1. identify where the bad value is first observed;
2. identify the caller/producer that supplied it;
3. inspect that producer's inputs and assumptions;
4. continue backward until you find the earliest point where state diverges from expected behavior;
5. test the hypothesis at that source boundary;
6. fix the source, then verify downstream behavior.

## Stop signals

Return to evidence gathering when you catch any of these patterns:

- "just try this change" without a supported hypothesis;
- multiple fixes bundled into one test;
- a symptom patch with no explanation of the originating state;
- replacing an approved dependency/reference because debugging it seems slower;
- changing the oracle/test merely because implementation fails it;
- proposing architectural change from a single unexplained failure;
- claiming an environmental/timing issue without evidence excluding deterministic causes.

## Environmental/external causes

If evidence shows the cause is environmental, timing-dependent, platform-specific, or external, document what was ruled in/out and implement only the handling authorized by the task (for example diagnostics, retry policy, condition-based waiting, timeout/error reporting, or a test fixture change). Then verify with the authoritative project procedure.
