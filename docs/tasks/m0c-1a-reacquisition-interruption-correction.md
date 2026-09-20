# M0C1A - Reacquisition Interruption Continuity Correction

## Task Metadata

- Task ID: M0C1A
- Milestone / slice: M0C deterministic viewer state
- Task type: bounded implementation correction and deterministic regression test
- Baseline: `35ae50b86647b0e6a24b4e2e65e76200fb0d74f2`
- Oracle: `ORC-VIEWER-STATE-001`, Class B, frozen
- Status: complete

## Objective

Correct the narrow M0C1 implementation defect where a usable degraded pose could replace the current blended effective position when reacquisition was interrupted.

## Scope

When `LossPendingOrigin` is `reacquiring`, degraded usable poses remain observable as tracked pose data but do not replace the current effective position during the 350 ms loss-confirmation grace. Ordinary `normal` to `loss-pending` behavior remains unchanged. Reliable recovery starts a fresh 300 ms reacquisition from the preserved effective position, and confirmed loss starts the five-second neutral return from that same position.

No public contract, timing, easing, oracle semantics, M0B behavior, M0C2 integration, dependency, or native-code changes are included.

## Verification

The authoritative `ORC-VIEWER-STATE-001` test was extended with deterministic usable-degraded-pose interruption coverage for recovery before 350 ms and confirmation at exactly 350 ms. This is an implementation defect correction under the existing frozen oracle, not an oracle or semantic change.
