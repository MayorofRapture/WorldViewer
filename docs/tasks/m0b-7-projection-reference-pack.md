# M0B-7 — Projection Reference Pack and Class C Oracle Materialization

## Task Metadata

- Task ID: M0B-7
- Milestone / slice: M0B reviewed projection reference authority
- Task type: governance/reference/testing
- Implementation model: Luna
- Implementation reasoning: Medium
- Baseline: `feat/m0a1-foundation` / `53850232b2111f90d91215ae4c5599d37bc94d86`
- Status: complete; ready for post-materialization audit

## Objective

Materialize the completed stronger-reasoning Class C projection review as a literal reference pack, independent numerical test oracle, and repository authority while leaving production projection blocked and unimplemented.

## Required Context

- ADR-003; ADR-008; TDS §§17–18 and §41; Interface & Contract Specification §§3, 6, 14; Testing Strategy Class C rules; Milestone Roadmap M0B.
- `REUSE-RENDER-001`; new `REUSE-PROJECTION-001`.
- Reviewed supplied formulas, tolerances, clipping baseline, Three.js mapping, and 12 literal cases.

## Oracle Status

- Oracle ID: `ORC-PROJECTION-001`
- Classification: Class C
- Review: approved by the supplied stronger-reasoning review
- Repository freeze: draft; not frozen until a separate post-materialization audit

## Allowed Scope

- `docs/testing/projection-reference-pack.md`
- `tests/fixtures/projectionReferenceCases.ts`
- `tests/helpers/projectionApertureOracle.ts`
- `tests/unit/projectionReferenceOracle.test.ts`
- Narrow TDS projection/near-far clarification, reuse/oracle/handoff/task/evidence records.

## Prohibited / Stop Conditions

- No production projection adapter, camera/render-loop/startup wiring, diagnostic viewer reaction, production loader, SDK change, dependency change, or alternative mathematics.
- Any golden-value, tolerance, sign, matrix-layout, or independent-oracle discrepancy stops the task for review.

## Definition of Done

The 12 literal cases, independent aperture oracle, Three r186 convention checks, cross-case invariants, TDS clarification, reuse/oracle records, handoff, and evidence exist and pass available verification. `ORC-PROJECTION-001` remains Class C review-approved but repository freeze `draft`; production projection remains blocked.
