import type { CalibratedViewerPose } from "../../shared/contracts/calibration";
import { OneEuroPoseFilter } from "../../engine/filter/poseFilter";
import {
  buildShortlist,
  calculateStationaryTrialMetric,
  enumerateOneEuroGrid,
  evaluateTransition,
  objectiveForCandidate,
  type CandidateObjective,
  type InvalidSampleLocation,
  type MotionTransition,
  type OneEuroCandidateConfiguration,
  type StationaryTrial,
  type TransitionSample,
} from "../analysis/filterMetrics";
import { stableM0EJsonStringify } from "../evidence/m0eSerialization";

export const M0E6_REQUIRED_NEUTRAL_TRIAL_IDS = Object.freeze([
  "neutral-stationary-trial-1",
  "neutral-stationary-trial-2",
  "neutral-stationary-trial-3",
  "neutral-stationary-trial-4",
  "neutral-stationary-trial-5",
] as const);

export type M0E6Authority = "fixture" | "provisional";

export interface M0E6PreparedSample {
  readonly timestampMs: number;
  readonly positionMm: { readonly x: number; readonly y: number; readonly z: number };
  readonly confidence?: number;
  readonly estimatorId?: string;
}

export interface M0E6StationaryTrialInput {
  readonly trialId: string;
  readonly settle: readonly M0E6PreparedSample[];
  readonly capture: readonly M0E6PreparedSample[];
}

export interface M0E6TransitionSampleInput {
  readonly timestampMs: number;
  readonly input: number;
  readonly positionMm: { readonly x: number; readonly y: number; readonly z: number };
}

export interface M0E6TransitionInput {
  readonly transitionId: string;
  readonly axis: "x" | "y" | "z";
  readonly start: number;
  readonly final: number;
  readonly samples: readonly M0E6TransitionSampleInput[];
  readonly sourceInvalidationReason?: MotionTransition["sourceInvalidationReason"];
}

export interface M0E6SweepInput {
  readonly authority: M0E6Authority;
  readonly stationaryTrials: readonly M0E6StationaryTrialInput[];
  readonly transitions: readonly M0E6TransitionInput[];
  readonly candidateConfigurations?: readonly OneEuroCandidateConfiguration[];
}

export interface M0E6ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class M0E6InputValidationError extends RangeError {
  readonly issues: readonly M0E6ValidationIssue[];

  constructor(issues: readonly M0E6ValidationIssue[]) {
    super(`invalid M0E6 development sweep input (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
    this.name = "M0E6InputValidationError";
    this.issues = Object.freeze([...issues]);
  }
}

export interface M0E6DevelopmentResult {
  readonly authority: M0E6Authority;
  readonly claimBearing: false;
  readonly finalFilterSelection: "not-performed";
  readonly m0e7: "not-started";
  readonly m0e8: "not-started";
  readonly candidateConfigurations: readonly OneEuroCandidateConfiguration[];
  readonly stationaryReplayInputs: readonly M0E6StationaryTrialInput[];
  readonly transitionReplayInputs: readonly M0E6TransitionInput[];
  readonly candidates: readonly CandidateObjective[];
  readonly paretoFrontier: readonly CandidateObjective[];
  readonly frontierStatus: ReturnType<typeof buildShortlist>["status"];
}

const finite = (value: number): boolean => Number.isFinite(value);
const positionFinite = (position: M0E6PreparedSample["positionMm"]): boolean => finite(position.x) && finite(position.y) && finite(position.z);
const timestampsMonotonic = (samples: readonly { readonly timestampMs: number }[]): boolean => samples.every((sample, index) => index === 0 || sample.timestampMs > samples[index - 1]!.timestampMs);

function validateCandidateGrid(configurations: readonly OneEuroCandidateConfiguration[] | undefined, issues: M0E6ValidationIssue[]): readonly OneEuroCandidateConfiguration[] {
  const expected = enumerateOneEuroGrid();
  if (configurations === undefined) return expected;
  if (configurations.length !== expected.length) issues.push({ path: "candidateConfigurations", message: "exactly 25 frozen candidates are required" });
  const seen = new Set<string>();
  configurations.forEach((candidate, index) => {
    const expectedCandidate = expected[index];
    if (seen.has(candidate.candidateId)) issues.push({ path: `candidateConfigurations[${index}].candidateId`, message: "duplicate candidate ID" });
    seen.add(candidate.candidateId);
    if (expectedCandidate === undefined || JSON.stringify(candidate) !== JSON.stringify(expectedCandidate)) issues.push({ path: `candidateConfigurations[${index}]`, message: "candidate does not match the frozen ordered grid" });
  });
  return configurations;
}

export function validateM0E6SweepInput(input: M0E6SweepInput): void {
  const issues: M0E6ValidationIssue[] = [];
  validateCandidateGrid(input.candidateConfigurations, issues);
  const required = new Set<string>(M0E6_REQUIRED_NEUTRAL_TRIAL_IDS);
  const trialIds = new Set<string>();
  if (input.stationaryTrials.length !== M0E6_REQUIRED_NEUTRAL_TRIAL_IDS.length) issues.push({ path: "stationaryTrials", message: "all five frozen neutral trials are required" });
  for (const [index, trial] of input.stationaryTrials.entries()) {
    if (!required.has(trial.trialId)) issues.push({ path: `stationaryTrials[${index}].trialId`, message: "trial ID is not one of the five frozen neutral identities" });
    if (trialIds.has(trial.trialId)) issues.push({ path: `stationaryTrials[${index}].trialId`, message: "duplicate neutral trial ID" });
    trialIds.add(trial.trialId);
    if (trial.settle.length === 0 || trial.capture.length === 0) issues.push({ path: `stationaryTrials[${index}]`, message: "settle and capture samples are both required" });
    if (!timestampsMonotonic(trial.settle) || !timestampsMonotonic(trial.capture) || (trial.settle.at(-1)?.timestampMs ?? -Infinity) >= (trial.capture[0]?.timestampMs ?? Infinity)) issues.push({ path: `stationaryTrials[${index}]`, message: "settle/capture timestamps must be strictly increasing and non-overlapping" });
    for (const [sampleIndex, sample] of [...trial.settle, ...trial.capture].entries()) if (!finite(sample.timestampMs) || !positionFinite(sample.positionMm)) issues.push({ path: `stationaryTrials[${index}].samples[${sampleIndex}]`, message: "calibrated samples must be finite" });
  }
  if (trialIds.size !== required.size || [...required].some((id) => !trialIds.has(id))) issues.push({ path: "stationaryTrials", message: "neutral trial IDs must exactly equal the frozen five-trial set" });
  const transitionIds = new Set<string>();
  for (const [index, transition] of input.transitions.entries()) {
    if (transitionIds.has(transition.transitionId)) issues.push({ path: `transitions[${index}].transitionId`, message: "duplicate transition ID" });
    transitionIds.add(transition.transitionId);
    if (!["x", "y", "z"].includes(transition.axis) || !finite(transition.start) || !finite(transition.final) || transition.start === transition.final) issues.push({ path: `transitions[${index}]`, message: "malformed axis or transition levels" });
    if (transition.samples.length < 3 || !timestampsMonotonic(transition.samples)) issues.push({ path: `transitions[${index}].samples`, message: "transition timestamps must be strictly increasing with at least three samples" });
    for (const [sampleIndex, sample] of transition.samples.entries()) if (!finite(sample.timestampMs) || !finite(sample.input) || !positionFinite(sample.positionMm)) issues.push({ path: `transitions[${index}].samples[${sampleIndex}]`, message: "calibrated transition input must be finite" });
  }
  if (issues.length > 0) throw new M0E6InputValidationError(issues);
}

function pose(sample: M0E6PreparedSample): CalibratedViewerPose {
  return { timestampMs: sample.timestampMs, positionMm: sample.positionMm, confidence: sample.confidence ?? 1, estimatorId: sample.estimatorId ?? "m0e6-development-fixture" };
}

function invalidStationaryMetric(trialId: string): ReturnType<typeof calculateStationaryTrialMetric> {
  return { trialId, rms: { x: Infinity, y: Infinity, z: Infinity }, eligible: false };
}

function runCandidate(candidate: OneEuroCandidateConfiguration, input: M0E6SweepInput): CandidateObjective {
  const filter = new OneEuroPoseFilter({ minCutoffHz: candidate.minCutoffHz, beta: candidate.beta, dCutoffHz: candidate.dCutoffHz, initialFrequencyHz: 60 });
  let invalidOutputCount = 0;
  const invalidLocations: InvalidSampleLocation[] = [];
  const stationaryOutputs: StationaryTrial[] = [];
  const stationaryMetrics = input.stationaryTrials.map((trial) => {
    filter.reset();
    const settle: { x: number; y: number; z: number }[] = [];
    const capture: { x: number; y: number; z: number }[] = [];
    for (const sample of [...trial.settle, ...trial.capture]) {
      try {
        const output = filter.update(pose(sample)).positionMm;
        (trial.settle.includes(sample) ? settle : capture).push(output);
      } catch (error) {
        invalidOutputCount += 1;
        invalidLocations.push({ candidateId: candidate.candidateId, traceKind: "stationary", stationaryTrialId: trial.trialId, timestampMs: sample.timestampMs, classification: "filter-rejection", reason: error instanceof Error ? error.message : "filter update failed" });
      }
    }
    const replayed = { trialId: trial.trialId, settle, capture };
    stationaryOutputs.push(replayed);
    try { return calculateStationaryTrialMetric(replayed); } catch { return invalidStationaryMetric(trial.trialId); }
  });
  const transitionOutputs: MotionTransition[] = [];
  const transitionResults = input.transitions.map((transition) => {
    filter.reset();
    const samples: TransitionSample[] = [];
    for (const sample of transition.samples) {
      try {
        const filtered = filter.update(pose({ timestampMs: sample.timestampMs, positionMm: sample.positionMm })).positionMm;
        samples.push({ timestampMs: sample.timestampMs, input: sample.input, output: filtered[transition.axis], filteredPositionMm: filtered, rawPositionMm: sample.positionMm });
      } catch (error) {
        invalidOutputCount += 1;
        invalidLocations.push({ candidateId: candidate.candidateId, traceKind: "transition", transitionId: transition.transitionId, timestampMs: sample.timestampMs, classification: "filter-rejection", reason: error instanceof Error ? error.message : "filter update failed" });
        samples.push({ timestampMs: sample.timestampMs, input: sample.input, output: Number.NaN, filteredPositionMm: { x: Number.NaN, y: Number.NaN, z: Number.NaN }, rawPositionMm: sample.positionMm });
      }
    }
    const output: MotionTransition = { transitionId: transition.transitionId, axis: transition.axis, start: transition.start, final: transition.final, samples, ...(transition.sourceInvalidationReason === undefined ? {} : { sourceInvalidationReason: transition.sourceInvalidationReason }) };
    transitionOutputs.push(output);
    return evaluateTransition(output);
  });
  const metrics = transitionResults.filter((result): result is Extract<typeof result, { status: "evaluable" }> => result.status === "evaluable").map((result) => ({ transitionId: result.transitionId, axis: result.axis, lagMs: result.lagMs, overshootMm: result.overshootMm, discontinuityMm: result.discontinuityMm }));
  return objectiveForCandidate(candidate, stationaryMetrics, null, invalidOutputCount, metrics, 0, 0, input.stationaryTrials as unknown as readonly StationaryTrial[], input.transitions as unknown as readonly MotionTransition[], stationaryOutputs, transitionResults, transitionOutputs, invalidLocations);
}

export function runM0E6DevelopmentSweep(input: M0E6SweepInput): M0E6DevelopmentResult {
  validateM0E6SweepInput(input);
  const candidateConfigurations = input.candidateConfigurations ?? enumerateOneEuroGrid();
  const candidates = candidateConfigurations.map((candidate) => runCandidate(candidate, input));
  const shortlist = buildShortlist(candidates);
  return Object.freeze({ authority: input.authority, claimBearing: false, finalFilterSelection: "not-performed", m0e7: "not-started", m0e8: "not-started", candidateConfigurations: Object.freeze([...candidateConfigurations]), stationaryReplayInputs: Object.freeze([...input.stationaryTrials]), transitionReplayInputs: Object.freeze([...input.transitions]), candidates: Object.freeze(candidates), paretoFrontier: shortlist.frontier, frontierStatus: shortlist.status });
}

export function serializeM0E6DevelopmentResult(result: M0E6DevelopmentResult): string {
  return `${stableM0EJsonStringify(result)}\n`;
}
