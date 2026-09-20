# M0B-12 - World Frame Delta Bound

## Task Metadata

- Task ID: M0B-12
- Milestone / slice: M0B timing-safety correction
- Task type: bounded implementation and verification
- Baseline: `c5059dbb7b38e73fe1fe832999b59ef2a6c7c54a`
- Status: correction implemented; independent final M0B re-audit remains required

## Finding and authority

The prior Terra-High M0B exit audit found one substantive failure: `SyntheticProjectionRuntime` forwarded unbounded elapsed time as `WorldFrame.deltaSeconds`. TDS §19 requires a bounded delta after pauses/backgrounding.

The authorized initial M0 engine timing default is a maximum world-update delta of `0.1 seconds` / `100 milliseconds`. The value is engine-owned and is not world-configurable.

## Allowed scope

- Bound the synthetic runtime's `WorldFrame.deltaSeconds` at the host timing boundary.
- Add deterministic coverage for first/zero, ordinary, exact-bound, long-pause, invalid-negative, and non-finite delta inputs.
- Materialize the TDS timing default and this task/evidence record.

## Prohibited scope

No changes to the public world SDK, projection oracle or formulas, camera behavior, perspective strength, diagnostic geometry, dependencies, ViewerStateController, M0C behavior, tracking, calibration, filtering, or world loading.

## Verification and status

The correction is verified by the repository SDK, boundary, typecheck, test, build, and diff procedures available in the environment. Cargo verification remains unavailable when `cargo` is not installed. The frozen projection oracle remains unchanged. This task does not declare the M0B exit gate passed; an independent final M0B re-audit remains required.
