# World Viewer

## Calibration and Filter Experiment Specification

## Draft v0.2

# Document Status

Draft version: 0.2
Date: September 28, 2026
Artifact: Class C calibration and filter experiment specification
Review status: approved by GPT-5.6 Sol High stronger-reasoning Class C review
Freeze status: frozen through `ORC-CALIBRATION-FILTER-001`

This is the first executable candidate procedure for M0E. No M0E evidence had been collected before this freeze, and Draft v0.1 must not be represented as having produced evidence. GPT-5.6 Sol High completed the stronger-reasoning Class C review of Draft v0.2 at repository baseline `29a978c95bcd2837dcafe63314c7b116effa6f3e`; the final review approved the Class C design after the per-axis-selection, metric-version, and duplicate-formula freeze-record corrections. This record freezes the governing procedure through the Oracle Registry. It does not claim that implementation or evidence collection has occurred. Implementation or harness work must not silently redefine the frozen criteria.

Machine-readable procedure identity:

```text
experimentProcedureVersion = 1
evidenceSchemaVersion = 1
validatorVersion = 1
metricVersion = 1
```

# 1. Purpose and scope

This specification governs the draft procedure for:

1. evaluating whether the initial host calibration model is sufficient;
2. sweeping the fixed One Euro filter family over a bounded objective grid;
3. forming an objective shortlist;
4. defining the boundary for Logan's perceptual comparison; and
5. interpreting validated evidence at M0E8 to retain defaults or escalate.

It does not redefine the selected M0D estimator, MediaPipe equations, landmark interpretation, or the canonical `RawViewerPose` contract. M0D supplies canonical screen-relative millimeters and representative recorded traces.

# 2. Required provenance and prescribed initial inputs

Every evidence package must identify all four procedure/provenance versions:

- evidence schema, experiment procedure, validator, and metric versions;
- source commit and timestamps for evidence-generation activity where useful;
- source M0D run ID/path;
- estimator ID, version, and configuration hash;
- calibration model/configuration;
- selected filter package/version and the exact candidate grid;
- trace IDs and content hashes; and
- all metric, shortlist, invalidation, and transition-result records needed for deterministic regeneration.

The prescribed initial input is the validated M0D evidence at:

```text
evidence/m0d/estimator-experiment-v3/run-1790638307359/
```

Use the selected Estimator A replay/output:

```text
estimatorId = mediapipe-facial-transform-v1
estimatorVersion = v1
estimatorConfigHash = fnv1a64-825a99daebb20f6c
```

The M0E analysis must consume this selected-estimator output. New physical collection is not required by default. Recollection is permitted only when the required selected-estimator trace is missing, required scenario/segment metadata is absent or invalid, a required input cannot be deterministically reconstructed, evidence validation fails for a reason that prevents the M0E metric, or a later approved/frozen procedure requires a measurement absent from the M0D run. Poor calibration or filter results alone are not a reason to recollect.

The initial evidence layout is:

```text
evidence/milestone-0/m0e/
  manifest.json
  validation.json
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

`manifest.json` and `validation.json` are a small versioned manifest/validation model, not a general evidence framework. The manifest must include, at minimum, the four versions above, repository/source commit, input M0D run ID/path, estimator identity/version/config hash, calibration model/config, selected filter package/version, the exact 25-candidate grid, trace IDs/content hashes, metric version, and useful evidence-generation timestamps.

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

# 4. Physical reference collection and prescribed scenarios

The approximately +/-20 mm physical positioning envelope is a measurement-procedure criterion, not a product-wide absolute-pose NFR. M0D's lateral and vertical references are relative movement from neutral because the user's absolute physical neutral X/Y screen coordinate is not measured precisely. M0E must not force ordinary neutral eye position onto the physical screen origin.

Use the existing selected-estimator M0D scenarios when their segment and timing metadata satisfy this procedure:

- `lateral-movement`: three cycles with relative X holds at `-150 mm`, `0`, `+150 mm`;
- `vertical-movement`: three cycles with relative Y holds at `-100 mm`, `0`, `+100 mm`; and
- `approach-retreat`: three cycles with absolute Z holds at `450`, `600`, `750`, `600`, `450 mm`.

The existing five neutral stationary trials, near stationary trials, and far stationary trials may be used when their segment/timing metadata satisfies this procedure. All complete consecutive target-to-target transitions from the three movement scenarios are the prescribed motion/filter-lag input; the implementation agent must not select transitions after viewing results.

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

At each target, the source procedure must retain monotonic timestamps, target/segment/cycle IDs, the physical target interpretation, and the recorded samples. Invalid or non-finite samples are counted and reported. A documented procedural mistake is recorded as a procedural invalidation with its reason rather than silently discarded or converted to model-failure evidence.

For newly collected or explicitly approved replacement stationary traces, allow a two-second settle and then collect a five-second stationary segment. Record transitions separately from settled stationary samples. Existing M0D traces are acceptable only when their metadata proves the required M0E segments/timing are present.

The required neutral stationary evidence for final filter acceptance consists of five complete neutral-position five-second trials after settling. The calibration reference cycles and the stationary filter trials may share valid traces only when the trace metadata proves that the required procedure was followed.

# 5. Deterministic calibration fit and aggregation

## 5.1 X/Y relative-displacement fit

For each X or Y movement cycle, let `m_center` be the estimator median at that cycle's neutral hold and `m_target` the estimator median at an outer target. Define:

```text
delta_m = m_target - m_center
delta_t = commanded physical displacement
```

Use `delta_t = -150 mm` or `+150 mm` for X and `delta_t = -100 mm` or `+100 mm` for Y. Fit scale only in relative displacement space across all six accepted outer observations, three in each direction:

```text
s = sum(delta_m_i * delta_t_i) / sum(delta_m_i^2)
```

The denominator must be finite and greater than zero. The resulting scale must be finite and strictly positive.

Preserve the neutral absolute anchor. Let `a` be the median of the three accepted associated center-hold medians for that axis. Set:

```text
o = a - s * a
  = (1 - s) * a
```

Thus `corrected(a) = a`; M0E corrects movement scale around the estimator's neutral anchor and does not redefine neutral as physical screen origin.

For every accepted outer observation, report `cycleId`, target displacement, signed residual, and absolute residual for:

```text
corrected_displacement = s * delta_m
residual = corrected_displacement - delta_t
```

Repeat the same calculation for the identity baseline with `s = 1` and `o = 0`.

## 5.2 Z absolute affine fit

Z uses genuine absolute screen-plane references at `450 mm`, `600 mm`, and `750 mm`. For the initial adequacy check, aggregate the outer observations deterministically:

```text
m_450 = median(all accepted 450 mm hold medians)
m_750 = median(all accepted 750 mm hold medians)

s = (750 - 450) / (m_750 - m_450)
o = 450 - s * m_450
```

Use all accepted `600 mm` hold medians for the held-out center validation. Apply the fit and report each signed and absolute residual. Scale must be finite and strictly positive.

When the center validation passes, final production Z parameters may be obtained by ordinary least-squares affine fitting over all accepted individual `450/600/750` hold-median observations:

```text
m_bar = average(m_i)
t_bar = average(t_i)
s = sum((m_i - m_bar) * (t_i - t_bar)) / sum((m_i - m_bar)^2)
o = t_bar - s * m_bar
```

Each accepted hold median remains an individual `(m_i, t_i)` observation for final residual and repeatability reporting. Do not average away the observations before those reports. No robust, nonlinear, orientation-conditioned, or cross-axis fit is authorized.

## 5.3 Residual and repeatability reporting

For every evaluated target, report individual signed residuals, individual absolute residuals, median signed residual, and maximum absolute residual. X/Y residuals are relative-displacement residuals. Z residuals are absolute target-coordinate residuals.

For repeated corrected measurements at the same physical target/displacement, let corrected values be `c_j` and:

```text
G = median(c_j)
repeatabilityRms = sqrt(average((c_j - G)^2))
```

For X/Y, compute repeatability on corrected relative displacements separately for negative and positive targets. For Z, compute it separately at `450`, `600`, and `750 mm`. Record repeatability even when the model otherwise passes. This is the established trial-median repeatability concept used by M0D.

## 5.4 Deterministic interpretation

Identity host correction is adequate only if, for every evaluated target, both conditions hold:

```text
abs(median residual) <= 20 mm
repeatabilityRms <= 20 mm
```

Evaluate X, Y, and Z independently. For each axis `A`, use its prescribed targets and applicable identity criteria. If that axis satisfies both frozen identity criteria, retain exactly:

```text
scale.A = 1
offset.A = 0
```

Do not replace an identity-passing axis merely because a fitted value would numerically reduce residual error. If identity fails for one axis, only that axis may be evaluated for its permitted fitted correction. Use the fitted scale and offset for that axis only if its permitted affine correction satisfies all applicable frozen criteria: the fitted scale is finite and strictly positive, every applicable target's absolute median residual is at most `20 mm`, every applicable target's repeatability RMS is at most `20 mm`, and, for Z, the held-out `600 mm` check satisfies the same residual limit.

Mixed profiles are valid and expected. For example:

```text
X passes identity: scale.x = 1, offset.x = 0
Y fails identity but affine passes: scale.y = fitted, offset.y = fitted
Z fails identity but affine passes: scale.z = fitted, offset.z = fitted
```

Do not require all three axes to become non-identity because one axis needs correction. Do not introduce cross-axis compensation or coupled calibration.

If repeatability exceeds the physical tolerance for an individual axis but residual structure does not clearly establish model failure, classify that axis's result as:

```text
inconclusive / collection-repeatability problem
```

Do not automatically claim that the affine model failed. Escalation remains per axis and per evidence/model result. Escalate for architecture review when valid, repeatable evidence shows a required scale at or below zero, a non-finite fit, Z center-interpolation residual above `20 mm`, systematic residual outside the envelope after affine correction, orientation-dependent error, nonlinear target-dependent behavior, cross-axis behavior requiring coupled correction, or estimator mathematics would need to change. Here, `systematic residual outside the envelope` means the per-target residual/repeatability criteria above fail after valid collection; it is not an undefined subjective judgment.

Procedural failure is distinct from calibration-model failure. A documented operator mistake, camera interruption, invalid capture, or out-of-tolerance target placement invalidates the affected collection segment and requires a prescribed rerun; it is not evidence that the model failed.

# 6. Filter under test

The filter family is fixed to One Euro through the approved reuse decision:

```text
1eurofilter@1.3.0
```

The sweep does not compare filter families. Filtering is independent on X/Y/Z. Use actual monotonic sample timestamps and convert milliseconds to seconds only at the approved adapter boundary; do not force a fixed update frequency when timestamps are available. Each candidate starts with reset filter state for each replayed trace.

## 6.1 Fixed parameter grid

The draft grid contains 25 candidates:

```text
minCutoffHz: 0.25, 0.5, 1.0, 2.0, 4.0
beta:        0, 0.001, 0.003, 0.01, 0.03
dCutoffHz:   1.0
```

The unfiltered calibrated trace is a baseline, not a 26th One Euro candidate. No candidate may be added or removed after viewing results.

## 6.2 Stationary settling and required traces

For each stationary trial:

1. reset the candidate filter at the start of the recorded settle segment;
2. replay the entire two-second settle segment through `CalibrationTransform` and `PoseFilter`;
3. exclude all settle-segment samples from stationary RMS; and
4. calculate RMS only over the following five-second capture segment.

If a source trace lacks the required two-second pre-roll/settle segment, it cannot satisfy this stationary acceptance trial without an explicitly approved alternative procedure. All candidates receive the same settle and capture samples. The required neutral set is all five complete neutral trials; near/far stationary trials remain visible evidence and do not replace the neutral gate.

The evidence set includes:

- five required neutral stationary five-second trials;
- near and far stationary spot checks that remain visible in evidence;
- representative normal head-motion trace(s); and
- all complete consecutive target-to-target transitions from `lateral-movement`, `vertical-movement`, and `approach-retreat`.

The prescribed initial source is the selected Estimator A output from M0D run `run-1790638307359`. Accepted M0D `RawViewerPose` traces may be reused where their metadata satisfies this procedure. Every parameter candidate replays the same calibrated input traces and exactly the same transition IDs.

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

Use all complete valid consecutive target-to-target transitions from `lateral-movement` for X, `vertical-movement` for Y, and `approach-retreat` for Z. Measure only the relevant axis. Every candidate uses exactly the same transition IDs. A transition may be non-evaluable only for a frozen deterministic reason: missing required samples, invalid/non-finite calibrated input, threshold crossing not establishable under this rule, or procedural invalidation already present in source evidence. Do not remove a transition because a candidate performs poorly. Preserve per-transition IDs and results, including invalidation reasons.

For each evaluable transition and axis:

1. Determine the start and final levels from the transition fixture's defined initial and final stationary levels.
2. Set the 50% threshold to `(start + final) / 2`.
3. Let direction be `sign(final - start)`.
4. A sustained crossing is the first sample reaching/passing the threshold on the final-target side followed by two consecutive valid samples remaining on that side, three qualifying samples total.
5. Define the first sustained input and output crossings identically for the input and filtered output.
6. Lag is `output_crossing_timestamp - input_crossing_timestamp` using the original monotonic timestamps.

If either crossing cannot be established, the transition is not evaluable and the reason is recorded. Report every evaluable transition, per-transition lag, the median lag, and p95 lag. Do not interpolate a crossing or substitute assumed frame periods.

## 7.4 Overshoot

Use the same prescribed transition set as lag. For a transition with final level `F` and direction `d = sign(F - start)`, inspect the filtered samples after the output crossing through the transition observation window. The overshoot is:

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

## 7.6 Percentiles, validity, and processing time

All M0E percentiles use the WorldViewer/M0D nearest-rank convention. For sorted values of length `n`:

```text
rank = ceil(p * n)
```

Clamp the rank to valid array bounds. Use this convention for p95 filter lag, p95 discontinuity, p99 discontinuity, processing p95, and every other M0E percentile unless a different frozen formula is explicitly stated. Library-default interpolation is not permitted to change results.

Record counts and locations of non-finite outputs, rejected samples, and invalid input samples. A valid finite calibrated trace must never produce a valid filtered pose containing NaN or Infinity.

Where practical, measure filter-only processing time around the filter operation, excluding I/O and unrelated rendering. Report at least median and p95. This is diagnostic/performance evidence and is not a hidden selection score.

# 8. Stationary acceptance and shortlist

For all five required neutral stationary capture segments after the recorded settle, use the existing NFR-VIS-009 target:

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

# 10. Minimum evidence validation

The versioned validator represented by `validation.json` must deterministically check at least:

1. required files are present;
2. schema, procedure, and validator versions match;
3. required estimator identity/configuration matches the prescribed selected estimator;
4. referenced input trace IDs/content hashes match source evidence;
5. required calibration scenarios and segments exist;
6. required stationary trials exist;
7. required movement transitions exist;
8. all 25 unique filter candidates are represented exactly once;
9. parameter combinations exactly match the frozen grid;
10. required metric inputs/results are finite;
11. calibration fit summary can be regenerated from preserved inputs;
12. stationary filter metrics can be regenerated from preserved traces;
13. lag, overshoot, and discontinuity metrics can be regenerated from preserved traces;
14. the shortlist can be regenerated deterministically from sweep results;
15. no candidate absent from the sweep was inserted into the shortlist;
16. no Pareto-dominated candidate was retained when the frozen rule removes it;
17. invalidations and non-evaluable transitions are explicitly recorded with allowed reasons; and
18. M0E7 candidate IDs correspond exactly to the validated shortlist.

Validation failure prevents M0E8 from treating the package as claim-bearing evidence. This task defines the requirement only; it does not create validator implementation code.

# 11. M0E8 interpretation boundary

M0E8 occurs only after the evidence package validates against this oracle once it is approved/frozen. Stronger reasoning interprets the objective and perceptual evidence. Possible outcomes are:

- retain identity calibration and select One Euro defaults;
- accept affine calibration and select One Euro defaults;
- retain the One Euro family but require another bounded parameter sweep;
- escalate because simple affine calibration is insufficient; or
- escalate because the One Euro family is insufficient.

Do not force a default when objective and perceptual evidence do not support one. Do not alter frozen criteria after seeing evidence. A need for nonlinear calibration, orientation-dependent calibration, new estimator mathematics, a new filter family, or solvePnP/OpenCV returns to architecture/oracle review.

# 12. Status and freeze record

This specification remains `Draft v0.2` and is approved/frozen Class C material through `ORC-CALIBRATION-FILTER-001`. GPT-5.6 Sol High completed the stronger-reasoning review against repository baseline `29a978c95bcd2837dcafe63314c7b116effa6f3e` and approved the design after the three specified freeze-record corrections. The governing executable identity is `Draft v0.2`, `experimentProcedureVersion = 1`, `evidenceSchemaVersion = 1`, `validatorVersion = 1`, and `metricVersion = 1`. No M0E evidence had been collected before freeze; evidence execution remains unperformed and depends on the required implementation, harness, and validator prerequisites. A collection or implementation agent may implement against this approved/frozen revision but may not silently redefine formulas, thresholds, grid, validity rules, shortlist rules, or interpretation boundaries.
