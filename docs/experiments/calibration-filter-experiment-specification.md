# World Viewer

## Calibration and Filter Experiment Specification

## Draft v0.1

# Document Status

Draft version: 0.1
Date: September 28, 2026
Artifact: Class C calibration and filter experiment specification
Review status: pending stronger-reasoning review
Freeze status: not frozen

This document is a draft Class C oracle source. It must not be consumed for M0E5 or M0E6 evidence collection until stronger reasoning approves and freezes it through the Oracle Registry process. Implementation or harness work must not silently redefine the criteria that a later review freezes.

# 1. Purpose and scope

This specification governs the draft procedure for:

1. evaluating whether the initial host calibration model is sufficient;
2. sweeping the fixed One Euro filter family over a bounded objective grid;
3. forming an objective shortlist;
4. defining the boundary for Logan's perceptual comparison; and
5. interpreting validated evidence at M0E8 to retain defaults or escalate.

It does not redefine the selected M0D estimator, MediaPipe equations, landmark interpretation, or the canonical `RawViewerPose` contract. M0D supplies canonical screen-relative millimeters and representative recorded traces.

# 2. Required provenance and inputs

Every evidence package must identify:

- source commit;
- estimator ID, version, and configuration hash;
- calibration profile and host correction;
- filter implementation and version;
- candidate parameters;
- trace IDs and content hashes; and
- metric and procedure versions.

The initial evidence layout is:

```text
evidence/milestone-0/m0e/
  calibration/
    raw-samples.csv
    fit-summary.json
  filtering/
    stationary-trace.csv
    motion-trace.csv
    sweep-results.json
    shortlist.json
  perceptual-comparison.md
```

Additional machine-readable metadata is limited to what is needed to reproduce the procedure, such as a small manifest containing the provenance fields above. No oversized evidence framework is introduced by this draft.

# 3. Calibration model under test

The only initial host correction model is independent per-axis scale plus offset:

```text
x' = sx * x + ox
y' = sy * y + oy
z' = sz * z + oz
```

The identity baseline is:

```text
sx = sy = sz = 1
ox = oy = oz = 0
```

There are no cross-axis terms, rotations, nonlinear corrections, orientation-conditioned corrections, lens-distortion terms, or new estimator mathematics. Any need for such a model returns to architecture/oracle review.

# 4. Physical reference collection

The procedure begins with identity host correction. It records the user's actual neutral physical X/Y reference rather than assuming an unknown neutral offset is zero. The operator records the physical reference used for the neutral cyclopean-eye position and then positions the viewer relative to that established reference.

Manual positioning tolerance is approximately +/-20 mm, matching the practical basis established during M0D. This is an operator positioning tolerance, not laboratory ground truth and not a new product-wide absolute-pose accuracy NFR.

## 4.1 Reference targets

For X, use positions relative to the established neutral reference:

| Target coordinate | Physical mapping |
| ---: | --- |
| -150 mm | LEFT |
| 0 mm | CENTER |
| +150 mm | RIGHT |

For Y, use positions relative to the established neutral reference:

| Target coordinate | Physical mapping |
| ---: | --- |
| -100 mm | DOWN |
| 0 mm | CENTER |
| +100 mm | UP |

For Z, use screen-plane distance:

| Target coordinate | Physical mapping |
| ---: | --- |
| 450 mm | CLOSER |
| 600 mm | NEUTRAL |
| 750 mm | FARTHER |

X and Y target coordinates are offsets from the recorded neutral physical reference. Z target coordinates are absolute screen-plane distances. The target/reference interpretation must be written into the raw sample metadata so a later implementation cannot infer it from signs alone.

## 4.2 Cycles, settling, and capture

Collect three complete cycles for each axis/range. A cycle visits the low, center, and high targets for that axis and returns to the center before the next cycle. Hold the other axes at their neutral references while collecting one axis.

At each target, allow a two-second settle, then collect a five-second stationary segment. Record transitions separately from the settled stationary samples. Use actual monotonic timestamps and retain unfavorable but valid samples. A known procedural mistake is marked as a procedural invalidation with its reason; it is not silently discarded or converted into model-failure evidence.

The required neutral stationary evidence for final filter acceptance consists of five complete neutral-position five-second trials after settling. The calibration reference cycles and the stationary filter trials may share valid traces only when the trace metadata proves that the required procedure was followed.

# 5. Calibration fit and interpretation

Let `m_i` be the target-level median of the accepted raw pose samples for one axis at a physical target, and let `t_i` be that target's canonical reference coordinate. The host correction maps measured raw coordinates to target coordinates.

## 5.1 Initial outer-pair fit

For each axis, use the two outer reference positions as the initial fit pair:

- X: -150 and +150 relative to the established neutral reference;
- Y: -100 and +100 relative to the established neutral reference; and
- Z: 450 and 750.

For low and high observations `(m_low, t_low)` and `(m_high, t_high)`, calculate:

```text
s = (t_high - t_low) / (m_high - m_low)
o = t_low - s * m_low
```

If the denominator is zero or the resulting scale/offset is non-finite, the fit is invalid. A zero or negative required scale is not accepted as a normal calibration result; it is an escalation condition requiring stronger review.

## 5.2 Held-out center check and final fit

The center target is held out from the initial fit:

- X: 0;
- Y: 0; and
- Z: 600.

Apply the outer-pair fit to the center target-level median and report the center residual:

```text
residual = corrected_median - center_target
```

If the held-out center check succeeds, regenerate the final production affine parameters from all accepted target-level medians using ordinary per-axis least-squares affine fitting. For one axis with accepted pairs `(m_i, t_i)`, let:

```text
m_bar = average(m_i)
t_bar = average(t_i)
s = sum((m_i - m_bar) * (t_i - t_bar)) / sum((m_i - m_bar)^2)
o = t_bar - s * m_bar
```

The final fit is invalid when the denominator is zero, the scale/offset is non-finite, or the required scale is zero or negative. No robust, nonlinear, or orientation-conditioned fit is introduced by this draft.

## 5.3 Identity and affine decision logic

Report identity results before fitting a non-identity correction.

Identity is adequate when measured residual behavior is within the approximately +/-20 mm physical precision supported by the reference procedure and does not show a material systematic scale or offset pattern across repeated targets/cycles. The +/-20 mm comparison is a procedure-envelope interpretation, not a laboratory accuracy claim.

Affine correction is supported when identity shows a systematic scale/offset error and the independent per-axis affine model materially explains it within that same physical measurement envelope, including a successful held-out center check and valid repeated-cycle behavior.

The simple model is not demonstrated sufficient, and the experiment must escalate, if any of the following occurs:

- a required scale is non-finite, zero, or negative;
- the held-out center has a systematic residual outside the procedure envelope;
- residual behavior is nonlinear;
- residual behavior depends materially on head pose/orientation;
- cross-axis behavior indicates independent per-axis correction is insufficient; or
- acceptable calibration would require changing estimator mathematics.

Procedural failure is distinct from calibration-model failure. A documented operator mistake, camera interruption, invalid capture, or out-of-tolerance target placement invalidates the affected collection segment and requires a prescribed rerun; it is not evidence that the model failed.

# 6. Filter under test

The filter family is fixed to One Euro through the approved reuse decision:

```text
1eurofilter@1.3.0
```

The sweep does not compare filter families. Filtering is independent on X/Y/Z. Use actual monotonic sample timestamps and convert milliseconds to seconds only at the approved adapter boundary; do not force a fixed update frequency when timestamps are available. Each candidate starts with reset filter state for each replayed trace.

## 6.1 Draft parameter grid

The draft grid contains 25 candidates:

```text
minCutoffHz: 0.25, 0.5, 1.0, 2.0, 4.0
beta:        0, 0.001, 0.003, 0.01, 0.03
dCutoffHz:   1.0
```

This is draft Class C material. It may change only during stronger-reasoning review before freeze. After freeze, M0E6 must not alter the grid after seeing results.

## 6.2 Required traces

The evidence set includes:

- five required neutral stationary five-second trials;
- near and far stationary spot checks that remain visible in evidence;
- representative normal head-motion trace(s); and
- controlled transitions sufficient to calculate filter-induced response lag.

Accepted M0D `RawViewerPose` traces may be reused where their metadata satisfies the new procedure. The existing M0D run alone must not be presumed to satisfy every M0E trace requirement. Any new physical collection must be explicitly prescribed before use. Every parameter candidate replays the same calibrated input traces.

# 7. Deterministic metrics

Metrics operate on timestamped valid samples in millimeters. Invalid samples, rejected samples, and non-finite outputs are counted and reported rather than silently removed from validity accounting.

## 7.1 Stationary RMS jitter

For each axis and each stationary segment, let `x_i` be the position samples and `n` the number of valid samples:

```text
mean = (1/n) * sum(x_i)
RMS = sqrt((1/n) * sum((x_i - mean)^2))
```

Report X, Y, and Z independently for calibrated-unfiltered and filtered data. Do not hide an increased axis jitter behind an aggregate score.

## 7.2 Jitter reduction

For each axis report:

```text
jitter_reduction_mm = RMS_unfiltered - RMS_filtered
```

Positive values indicate reduction; negative values remain visible as increased jitter. If an optional percentage is reported, it is `100 * (RMS_unfiltered - RMS_filtered) / RMS_unfiltered` only when the unfiltered RMS is non-zero; zero-baseline cases report the absolute difference without division.

## 7.3 Filter-induced response lag

This metric is filter-induced response lag, not motion-to-photon latency.

For each evaluable transition and axis:

1. Determine the start and final levels from the transition fixture's defined initial and final stationary levels.
2. Set the 50% threshold to `(start + final) / 2`.
3. Let direction be `sign(final - start)`.
4. The first sustained input crossing is the timestamp of the first valid input sample on the final-level side of the threshold followed by at least two more consecutive valid input samples on that same side.
5. The first sustained output crossing is defined identically for the filtered output.
6. Lag is `output_crossing_timestamp - input_crossing_timestamp` using the original monotonic timestamps.

If either crossing cannot be established, the transition is not evaluable and the reason is recorded. Report every evaluable transition, the median lag, and p95 lag. Do not interpolate a crossing or substitute wall-clock frame periods.

## 7.4 Overshoot

For a transition with final level `F` and direction `d = sign(F - start)`, inspect the filtered samples after the output crossing through the transition observation window. The overshoot is:

```text
max(max(d * (filtered_sample - F), 0))
```

This reports excursion beyond the final level in the direction of travel. Report zero when no excursion occurs, and preserve transitions for which the metric is not applicable.

## 7.5 Discontinuity

For each pair of consecutive valid filtered positions:

```text
distance = sqrt(
  (x_i - x_(i-1))^2 +
  (y_i - y_(i-1))^2 +
  (z_i - z_(i-1))^2
)
```

Report median, p95, p99, and maximum over the trace. Timestamp gaps and rejected samples are reported separately and must not be silently treated as zero-distance samples.

## 7.6 Validity and processing time

Record counts and locations of non-finite outputs, rejected samples, and invalid input samples. A valid finite calibrated trace must never produce a valid filtered pose containing NaN or Infinity.

Where practical, measure filter-only processing time around the filter operation, excluding I/O and unrelated rendering. Report at least median and p95. This is diagnostic/performance evidence and is not a hidden selection score.

# 8. Stationary acceptance and shortlist

For each required neutral five-second stationary trial after settling, use the existing NFR-VIS-009 target:

```text
X RMS <= 3 mm
Y RMS <= 3 mm
Z RMS <= 8 mm
```

The five trials are all required. Near/far stationary spot checks remain visible but do not silently replace the neutral gate.

A candidate is eligible for perceptual shortlist only when:

- finite valid input produces no invalid/non-finite filtered output; and
- all five required neutral trials satisfy the three per-axis thresholds above.

For each eligible candidate, calculate the worst observed required-trial normalized RMS:

```text
J = max(
  X_RMS / 3,
  Y_RMS / 3,
  Z_RMS / 8
)
```

The `max` is taken across all axis values and all five required trials, so one bad trial cannot be averaged away. Compare eligible candidates only on `J` and p95 filter-induced response lag.

Candidate A Pareto-dominates candidate B only when:

- `A.J <= B.J`;
- `A.p95Lag <= B.p95Lag`; and
- at least one inequality is strict.

Remove dominated candidates. Do not use a weighted score, an arbitrary tie-break score, or a preference for a lower single metric when the tradeoff is not dominance-based.

If the Pareto frontier contains 1-6 candidates, all frontier candidates proceed to M0E7. If more than 6 remain, stop for stronger review; do not invent a ranking. If zero candidates meet the validity/jitter requirements, M0E6 produces no perceptual shortlist and the NFR is not loosened after seeing results.

# 9. M0E7 perceptual comparison

Only objectively shortlisted candidates are compared. Candidate presentation should use neutral identifiers where practical and avoid unnecessarily exposing parameter values.

Logan's human judgment remains the perceptual evidence. Record observations around:

- stationary vibration or swimming;
- ordinary head-motion responsiveness;
- perceived lag;
- reversal or rubber-band behavior;
- depth responsiveness;
- reacquisition smoothness where included; and
- the overall fixed-window illusion.

The collection process may structure and record these observations, but it must not replace them with an automated preference score.

# 10. M0E8 interpretation boundary

M0E8 occurs only after the evidence package validates against this oracle once it is approved/frozen. Stronger reasoning interprets the objective and perceptual evidence. Possible outcomes are:

- retain identity calibration and select One Euro defaults;
- accept affine calibration and select One Euro defaults;
- retain the One Euro family but require another bounded parameter sweep;
- escalate because simple affine calibration is insufficient; or
- escalate because the One Euro family is insufficient.

Do not force a default when objective and perceptual evidence do not support one. Do not alter frozen criteria after seeing evidence. A need for nonlinear calibration, orientation-dependent calibration, new estimator mathematics, a new filter family, or solvePnP/OpenCV returns to architecture/oracle review.

# 11. Draft status and freeze gate

This specification is Class C material pending stronger-reasoning review. It is not frozen. M0E5/M0E6 evidence collection is blocked until the stronger review approves the governing criteria and the Oracle Registry records the approved/frozen state. A collection or implementation agent may implement a harness only against an approved/frozen revision and may not silently redefine formulas, thresholds, grid, validity rules, shortlist rules, or interpretation boundaries.
