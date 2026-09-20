# Oracle Registry

## Purpose and authority

This registry is a compact repository-local navigation aid for reusable correctness oracles. The Testing Strategy owns classification, review, and freeze policy; governing requirements, contracts, ADRs, experiment specifications, and authoritative tests/procedures own correctness. A registry record must point to those sources and must not duplicate their normative content.

## Classification legend

- Class A — routine deterministic checks.
- Class B — integration and conformance checks derived from explicit contracts.
- Class C — architecture-critical checks requiring stronger review before freeze.

## Status legends

- Review: `not-required` | `pending` | `approved` | `rejected`
- Freeze: `draft` | `frozen` | `superseded` | `retired`

## Summary

No substantive Oracle Registry records exist yet. Do not manufacture an ORC ID merely to populate this table. The generic packaged-launch Class B oracle belongs to the later M0A-3 task and must be created through oracle-first sequencing there.

| Oracle ID | Class | Subsystem / Governed Behavior | Governing Authority | Authoritative Test / Procedure | Review | Freeze | Change Authority |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Canonical record template

```text
Oracle ID: ORC-<SUBSYSTEM>-<NNN>
Subsystem: <name>
Governed behavior: <one sentence>
Classification: Class A | Class B | Class C
Governing authority: <requirement / ADR / specification / conformance ID>
Authoritative test / procedure: <repo-relative path / suite / named procedure>
Supporting fixtures / evidence: <paths or none>
Review status: not-required | pending | approved | rejected
Review owner / result: <reference or not-required>
Freeze status: draft | frozen | superseded | retired
Frozen baseline: <commit/build/spec revision or not-yet-frozen>
Change authority: <explicit authority required>
Milestone applicability: <M0/M1/M2/etc.>
Handoff references: <paths or none>
Notes / limitations: <short text or none>
```

## Lifecycle and drift warning

Propose, classify, implement the draft test/procedure, review where required, freeze, register, consume, and change only through the recorded authority. A stale or conflicting record blocks dependent work. Semantic changes to expected behavior, classification, thresholds, tolerances, formulas, interpretation, review/freeze status, or change authority require the recorded review authority and an update to the governing source/test first. Non-semantic path and pointer corrections may be made with verification.

The registry is not a permission system, a replacement for the Testing Strategy, or a way to make a failing implementation acceptable.
