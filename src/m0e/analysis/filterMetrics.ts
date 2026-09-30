import type { FilteredViewerPose } from "../../engine/viewer/contracts";
import type { Vec3Mm } from "../../shared/contracts/primitives";
import { average, median, rms } from "./calibrationAnalysis";
import type { RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";

export const ONE_EURO_GRID = Object.freeze({
  minCutoffHz: Object.freeze([0.25, 0.5, 1, 2, 4]),
  beta: Object.freeze([0, 0.001, 0.003, 0.01, 0.03]),
  dCutoffHz: 1,
});

export interface OneEuroCandidateConfiguration {
  readonly candidateId: string;
  readonly minCutoffHz: number;
  readonly beta: number;
  readonly dCutoffHz: number;
}

export function enumerateOneEuroGrid(): readonly OneEuroCandidateConfiguration[] {
  const candidates: OneEuroCandidateConfiguration[] = [];
  for (const minCutoffHz of ONE_EURO_GRID.minCutoffHz) {
    for (const beta of ONE_EURO_GRID.beta) {
      candidates.push(Object.freeze({ candidateId: `one-euro-${minCutoffHz}-${beta}-1`, minCutoffHz, beta, dCutoffHz: ONE_EURO_GRID.dCutoffHz }));
    }
  }
  return Object.freeze(candidates);
}

export interface StationaryTrial {
  readonly trialId: string;
  readonly settle: readonly Vec3Mm[];
  readonly capture: readonly Vec3Mm[];
  /** Preserved source replay input; positions above remain a compact synthetic fixture form. */
  readonly rawSamples?: readonly { readonly phase: "settle" | "capture"; readonly raw: RawViewerPose }[];
}

export interface StationaryRms {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface StationaryTrialMetric {
  readonly trialId: string;
  readonly rms: StationaryRms;
  readonly eligible: boolean;
}

export const STATIONARY_THRESHOLDS = Object.freeze({ x: 3, y: 3, z: 8 });

function finitePosition(position: Vec3Mm): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z);
}

export function calculateStationaryTrialMetric(trial: StationaryTrial): StationaryTrialMetric {
  if (trial.capture.length === 0 || trial.settle.some((position) => !finitePosition(position)) || trial.capture.some((position) => !finitePosition(position))) throw new RangeError("stationary trial must contain finite non-empty capture samples");
  const x = trial.capture.map((position) => position.x);
  const y = trial.capture.map((position) => position.y);
  const z = trial.capture.map((position) => position.z);
  const metric = Object.freeze({ x: rms(x.map((value) => value - average(x))), y: rms(y.map((value) => value - average(y))), z: rms(z.map((value) => value - average(z))) });
  return Object.freeze({ trialId: trial.trialId, rms: metric, eligible: metric.x <= STATIONARY_THRESHOLDS.x && metric.y <= STATIONARY_THRESHOLDS.y && metric.z <= STATIONARY_THRESHOLDS.z });
}

export function replayStationaryTrial(
  trial: StationaryTrial,
  reset: () => void,
  update: (position: Vec3Mm) => Vec3Mm,
): StationaryTrialMetric {
  reset();
  for (const position of trial.settle) update(position);
  const capture = trial.capture.map(update);
  return calculateStationaryTrialMetric({ trialId: trial.trialId, settle: trial.settle, capture });
}

export interface TransitionSample {
  readonly timestampMs: number;
  readonly input: number;
  readonly output: number;
  readonly filteredPositionMm: Vec3Mm;
  readonly rawPositionMm?: Vec3Mm;
}

export interface MotionTransition {
  readonly transitionId: string;
  readonly axis: "x" | "y" | "z";
  readonly start: number;
  readonly final: number;
  readonly samples: readonly TransitionSample[];
  readonly sourceInvalidationReason?: TransitionInvalidationReason;
}

export const TRANSITION_INVALIDATION_REASONS = Object.freeze([
  "source-procedural-invalidation",
  "missing-required-samples",
  "invalid-non-finite-calibrated-input",
  "threshold-crossing-not-establishable",
] as const);
export type TransitionInvalidationReason = typeof TRANSITION_INVALIDATION_REASONS[number];

export interface TransitionDiscontinuitySummary {
  readonly median: number;
  readonly p95: number;
  readonly p99: number;
  readonly max: number;
}

export interface EvaluableTransitionResult {
  readonly status: "evaluable";
  readonly transitionId: string;
  readonly axis: "x" | "y" | "z";
  readonly start: number;
  readonly final: number;
  readonly inputCrossingTimestampMs: number;
  readonly outputCrossingTimestampMs: number;
  readonly lagMs: number;
  readonly overshootMm: number;
  readonly discontinuityMm: readonly number[];
  readonly discontinuitySummary: TransitionDiscontinuitySummary;
}

export interface NonEvaluableTransitionResult {
  readonly status: "non-evaluable";
  readonly transitionId: string;
  readonly axis: "x" | "y" | "z";
  readonly start: number;
  readonly final: number;
  readonly reason: TransitionInvalidationReason;
  readonly sampleCount: number;
}

export type CandidateTransitionResult = EvaluableTransitionResult | NonEvaluableTransitionResult;

export interface InvalidSampleLocation {
  readonly candidateId: string;
  readonly traceKind: "stationary" | "transition" | "raw";
  readonly transitionId?: string;
  readonly stationaryTrialId?: string;
  readonly timestampMs: number;
  readonly classification: "filter-rejection" | "non-finite-output" | "non-finite-input";
  readonly reason: string;
}

export interface TransitionMetric {
  readonly transitionId: string;
  readonly axis: "x" | "y" | "z";
  readonly lagMs: number;
  readonly overshootMm: number;
  readonly discontinuityMm: readonly number[];
}

function sign(value: number): number {
  return value >= 0 ? 1 : -1;
}

function crossingTimestamp(samples: readonly TransitionSample[], value: "input" | "output", start: number, final: number): number {
  if (samples.length < 3) throw new RangeError("transition requires three qualifying samples");
  const direction = sign(final - start);
  const threshold = start + (final - start) * 0.5;
  for (let index = 0; index <= samples.length - 3; index += 1) {
    const window = samples.slice(index, index + 3);
    const qualifies = window.every((sample) => Number.isFinite(sample[value]) && direction * (sample[value] - threshold) >= 0);
    if (qualifies) return window[0]!.timestampMs;
  }
  throw new RangeError(`transition has no stable ${value} crossing`);
}

export function nearestRankPercentile(values: readonly number[], percentile: number): number {
  if (values.length === 0 || !Number.isFinite(percentile) || percentile < 0 || percentile > 1) throw new RangeError("percentile requires a non-empty array and a value from zero through one");
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil(percentile * sorted.length)));
  return sorted[rank - 1]!;
}

export function calculateTransitionMetric(transition: MotionTransition): TransitionMetric {
  if (transition.samples.length < 3 || transition.samples.some((sample, index) => !Number.isFinite(sample.timestampMs) || !Number.isFinite(sample.input) || !Number.isFinite(sample.output) || !finitePosition(sample.filteredPositionMm) || (index > 0 && sample.timestampMs <= transition.samples[index - 1]!.timestampMs))) throw new RangeError("transition samples must be finite and timestamps strictly increasing");
  const inputCrossing = crossingTimestamp(transition.samples, "input", transition.start, transition.final);
  const outputCrossing = crossingTimestamp(transition.samples, "output", transition.start, transition.final);
  const direction = sign(transition.final - transition.start);
  const outputCrossingIndex = transition.samples.findIndex((sample) => sample.timestampMs === outputCrossing);
  if (outputCrossingIndex < 0) throw new RangeError("output crossing sample is not present in transition trace");
  const overshootMm = Math.max(...transition.samples.slice(outputCrossingIndex).map((sample) => Math.max(direction * (sample.output - transition.final), 0)));
  const discontinuityMm = transition.samples.slice(1).map((sample, index) => {
    const previous = transition.samples[index]!.filteredPositionMm;
    return Math.hypot(sample.filteredPositionMm.x - previous.x, sample.filteredPositionMm.y - previous.y, sample.filteredPositionMm.z - previous.z);
  });
  return Object.freeze({ transitionId: transition.transitionId, axis: transition.axis, lagMs: outputCrossing - inputCrossing, overshootMm, discontinuityMm: Object.freeze(discontinuityMm) });
}

export function summarizeTransitionDiscontinuity(values: readonly number[]): TransitionDiscontinuitySummary {
  if (values.length === 0) throw new RangeError("discontinuity summary requires values");
  return Object.freeze({ median: median(values), p95: nearestRankPercentile(values, 0.95), p99: nearestRankPercentile(values, 0.99), max: Math.max(...values) });
}

export function evaluateTransition(transition: MotionTransition): CandidateTransitionResult {
  const base = { transitionId: transition.transitionId, axis: transition.axis, start: transition.start, final: transition.final } as const;
  if (transition.sourceInvalidationReason !== undefined) return Object.freeze({ ...base, status: "non-evaluable", reason: transition.sourceInvalidationReason, sampleCount: transition.samples.length });
  if (transition.samples.length < 3) return Object.freeze({ ...base, status: "non-evaluable", reason: "missing-required-samples", sampleCount: transition.samples.length });
  if (transition.samples.some((sample) => !Number.isFinite(sample.input))) return Object.freeze({ ...base, status: "non-evaluable", reason: "invalid-non-finite-calibrated-input", sampleCount: transition.samples.length });
  try {
    const metric = calculateTransitionMetric(transition);
    const inputCrossingTimestampMs = crossingTimestamp(transition.samples, "input", transition.start, transition.final);
    const outputCrossingTimestampMs = crossingTimestamp(transition.samples, "output", transition.start, transition.final);
    return Object.freeze({ ...base, status: "evaluable", inputCrossingTimestampMs, outputCrossingTimestampMs, lagMs: metric.lagMs, overshootMm: metric.overshootMm, discontinuityMm: metric.discontinuityMm, discontinuitySummary: summarizeTransitionDiscontinuity(metric.discontinuityMm) });
  } catch {
    return Object.freeze({ ...base, status: "non-evaluable", reason: "threshold-crossing-not-establishable", sampleCount: transition.samples.length });
  }
}

export interface DiscontinuitySummary {
  readonly median: number;
  readonly p95: number;
  readonly p99: number;
  readonly max: number;
}

export function summarizeDiscontinuity(values: readonly number[]): DiscontinuitySummary {
  if (values.length === 0) throw new RangeError("discontinuity summary requires values");
  return Object.freeze({ median: median(values), p95: nearestRankPercentile(values, 0.95), p99: nearestRankPercentile(values, 0.99), max: Math.max(...values) });
}

export interface CandidateObjective {
  readonly candidate: OneEuroCandidateConfiguration;
  readonly stationaryTrials: readonly StationaryTrialMetric[];
  readonly p95LagMs: number | null;
  readonly lagSummary: { readonly evaluableTransitionCount: number; readonly medianLagMs: number | null; readonly p95LagMs: number | null };
  readonly invalidOutputCount: number;
  readonly eligible: boolean;
  readonly jitterObjective: number | null;
  readonly transitionMetrics?: readonly TransitionMetric[];
  readonly transitionResults?: readonly CandidateTransitionResult[];
  readonly transitionReplayOutputs?: readonly MotionTransition[];
  readonly invalidSampleLocations?: readonly InvalidSampleLocation[];
  readonly sourceInvalidCount?: number;
  readonly filterRejectionCount?: number;
  readonly nonFiniteOutputCount?: number;
  readonly stationaryReplayInputs?: readonly StationaryTrial[];
  readonly stationaryReplayOutputs?: readonly StationaryTrial[];
  readonly transitionReplayInputs?: readonly MotionTransition[];
}

export function objectiveForCandidate(candidate: OneEuroCandidateConfiguration, stationaryTrials: readonly StationaryTrialMetric[], p95LagMs: number | null, invalidOutputCount = 0, transitionMetrics?: readonly TransitionMetric[], sourceInvalidCount = 0, filterRejectionCount = 0, stationaryReplayInputs?: readonly StationaryTrial[], transitionReplayInputs?: readonly MotionTransition[], stationaryReplayOutputs?: readonly StationaryTrial[], transitionResults?: readonly CandidateTransitionResult[], transitionReplayOutputs?: readonly MotionTransition[], invalidSampleLocations?: readonly InvalidSampleLocation[]): CandidateObjective {
  const eligible = invalidOutputCount === 0 && stationaryTrials.length === 5 && stationaryTrials.every((trial) => trial.eligible);
  const jitterObjective = eligible
    ? Math.max(...stationaryTrials.flatMap((trial) => [trial.rms.x / 3, trial.rms.y / 3, trial.rms.z / 8]))
    : null;
  const lags = (transitionResults ?? []).filter((result): result is EvaluableTransitionResult => result.status === "evaluable").map((result) => result.lagMs);
  const lagSummary = Object.freeze({ evaluableTransitionCount: lags.length, medianLagMs: lags.length === 0 ? null : median(lags), p95LagMs: lags.length === 0 ? null : nearestRankPercentile(lags, 0.95) });
  return Object.freeze({ candidate, stationaryTrials: Object.freeze([...stationaryTrials]), p95LagMs, lagSummary, invalidOutputCount, eligible, jitterObjective, ...(transitionMetrics === undefined ? {} : { transitionMetrics: Object.freeze([...transitionMetrics]) }), ...(transitionResults === undefined ? {} : { transitionResults: Object.freeze([...transitionResults]) }), ...(transitionReplayOutputs === undefined ? {} : { transitionReplayOutputs: Object.freeze([...transitionReplayOutputs]) }), ...(invalidSampleLocations === undefined ? {} : { invalidSampleLocations: Object.freeze([...invalidSampleLocations]) }), sourceInvalidCount, filterRejectionCount, nonFiniteOutputCount: invalidOutputCount, ...(stationaryReplayInputs === undefined ? {} : { stationaryReplayInputs: Object.freeze([...stationaryReplayInputs]) }), ...(transitionReplayInputs === undefined ? {} : { transitionReplayInputs: Object.freeze([...transitionReplayInputs]) }), ...(stationaryReplayOutputs === undefined ? {} : { stationaryReplayOutputs: Object.freeze([...stationaryReplayOutputs]) }) });
}

export function dominates(left: CandidateObjective, right: CandidateObjective): boolean {
  if (!left.eligible || !right.eligible || left.jitterObjective === null || right.jitterObjective === null || left.p95LagMs === null || right.p95LagMs === null) return false;
  return left.jitterObjective <= right.jitterObjective && left.p95LagMs <= right.p95LagMs && (left.jitterObjective < right.jitterObjective || left.p95LagMs < right.p95LagMs);
}

export interface ShortlistResult {
  readonly status: "shortlist" | "requires-stronger-review" | "no-shortlist";
  readonly frontier: readonly CandidateObjective[];
  readonly candidates: readonly CandidateObjective[];
}

export function buildShortlist(candidates: readonly CandidateObjective[]): ShortlistResult {
  const eligible = candidates.filter((candidate) => candidate.eligible);
  const frontier = eligible.filter((candidate) => !eligible.some((other) => other !== candidate && dominates(other, candidate)));
  const status = frontier.length === 0 ? "no-shortlist" : frontier.length > 6 ? "requires-stronger-review" : "shortlist";
  return Object.freeze({ status, frontier: Object.freeze(frontier), candidates: Object.freeze([...candidates]) });
}

export function filterPositionTrace(poses: readonly FilteredViewerPose[]): readonly Vec3Mm[] {
  return Object.freeze(poses.map((pose) => pose.positionMm));
}
