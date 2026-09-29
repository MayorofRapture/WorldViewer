import type { CalibrationProfile } from "../../shared/contracts/calibration";
import type { RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";
import { identityCalibrationTransform } from "../../shared/contracts/calibration";
import { OneEuroPoseFilter } from "../../engine/filter/poseFilter";
import { buildShortlist, calculateStationaryTrialMetric, calculateTransitionMetric, enumerateOneEuroGrid, nearestRankPercentile, objectiveForCandidate, type CandidateObjective, type StationaryTrial, type OneEuroCandidateConfiguration, type MotionTransition, type TransitionMetric, type TransitionSample } from "./filterMetrics";

export interface FilterSweepInput {
  readonly rawPoses: readonly RawViewerPose[];
  readonly calibrationProfile: CalibrationProfile;
  readonly stationaryTrials: readonly StationaryTrial[];
  readonly transitionInputs?: readonly MotionTransition[];
}

export interface FilterSweepResult {
  readonly candidates: readonly CandidateObjective[];
  readonly shortlist: ReturnType<typeof buildShortlist>;
}

export function runOneEuroCandidate(
  candidate: OneEuroCandidateConfiguration,
  input: FilterSweepInput,
): CandidateObjective {
  const filter = new OneEuroPoseFilter({ minCutoffHz: candidate.minCutoffHz, beta: candidate.beta, dCutoffHz: candidate.dCutoffHz, initialFrequencyHz: 60 });
  let invalidOutputCount = 0;
  for (const raw of input.rawPoses) {
    try {
      filter.update(identityCalibrationTransform.apply(raw, input.calibrationProfile));
    } catch {
      invalidOutputCount += 1;
    }
  }
  const replayedStationaryTrials: StationaryTrial[] = [];
  const stationaryTrials = input.stationaryTrials.map((trial) => {
    if (trial.rawSamples === undefined) { replayedStationaryTrials.push(trial); return calculateStationaryTrialMetric(trial); }
    filter.reset();
    const capture: { x: number; y: number; z: number }[] = [];
    for (const sample of trial.rawSamples) {
      try {
        const output = filter.update(identityCalibrationTransform.apply(sample.raw, input.calibrationProfile)).positionMm;
        if (sample.phase === "capture") capture.push(output);
      } catch { invalidOutputCount += 1; }
    }
    const replayed = { trialId: trial.trialId, settle: [], capture };
    replayedStationaryTrials.push(replayed);
    return calculateStationaryTrialMetric(replayed);
  });
  const transitionMetrics: TransitionMetric[] = [];
  for (const transition of input.transitionInputs ?? []) {
    const samples: TransitionSample[] = [];
    filter.reset();
    for (const sample of transition.samples) {
      try {
        const rawPosition = sample.rawPositionMm ?? sample.filteredPositionMm;
        const raw: RawViewerPose = { timestampMs: sample.timestampMs, positionMm: rawPosition, confidence: 1, estimatorId: "mediapipe-facial-transform-v1" };
        const output = filter.update(identityCalibrationTransform.apply(raw, input.calibrationProfile));
        const axis = transition.axis;
        samples.push({ ...sample, output: output.positionMm[axis], filteredPositionMm: output.positionMm });
      } catch { invalidOutputCount += 1; }
    }
    if (samples.length >= 3) {
      try { transitionMetrics.push(calculateTransitionMetric({ ...transition, samples })); } catch { /* preserve non-evaluable transition in the evidence layer */ }
    }
  }
  const p95LagMs = transitionMetrics.length === 0 ? 0 : nearestRankPercentile(transitionMetrics.map((metric) => metric.lagMs), 0.95);
  return objectiveForCandidate(candidate, stationaryTrials, p95LagMs, invalidOutputCount, transitionMetrics, 0, 0, input.stationaryTrials, input.transitionInputs, replayedStationaryTrials);
}

export function runOneEuroSweep(input: FilterSweepInput): FilterSweepResult {
  const candidates = enumerateOneEuroGrid().map((candidate) => runOneEuroCandidate(candidate, input));
  return Object.freeze({ candidates: Object.freeze(candidates), shortlist: buildShortlist(candidates) });
}
