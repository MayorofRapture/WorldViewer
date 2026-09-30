import type { CalibrationProfile } from "../../shared/contracts/calibration";
import type { RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";
import { identityCalibrationTransform } from "../../shared/contracts/calibration";
import { OneEuroPoseFilter } from "../../engine/filter/poseFilter";
import { buildShortlist, calculateStationaryTrialMetric, enumerateOneEuroGrid, evaluateTransition, objectiveForCandidate, type CandidateObjective, type StationaryTrial, type OneEuroCandidateConfiguration, type MotionTransition, type TransitionMetric, type TransitionSample, type InvalidSampleLocation, type CandidateTransitionResult } from "./filterMetrics";

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
  const invalidSampleLocations: InvalidSampleLocation[] = [];
  for (const raw of input.rawPoses) {
    try {
      const output = filter.update(identityCalibrationTransform.apply(raw, input.calibrationProfile));
      if (![output.positionMm.x, output.positionMm.y, output.positionMm.z].every(Number.isFinite)) throw new RangeError("filter produced non-finite output");
    } catch (error) {
      invalidOutputCount += 1;
      const reason = error instanceof Error ? error.message : "filter update failed";
      invalidSampleLocations.push({ candidateId: candidate.candidateId, traceKind: "raw", timestampMs: raw.timestampMs, classification: reason.includes("non-finite") ? "non-finite-output" : "filter-rejection", reason });
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
        if (![output.x, output.y, output.z].every(Number.isFinite)) throw new RangeError("filter produced non-finite output");
        if (sample.phase === "capture") capture.push(output);
      } catch (error) {
        invalidOutputCount += 1;
        const reason = error instanceof Error ? error.message : "filter update failed";
        invalidSampleLocations.push({ candidateId: candidate.candidateId, traceKind: "stationary", stationaryTrialId: trial.trialId, timestampMs: sample.raw.timestampMs, classification: reason.includes("non-finite") ? "non-finite-output" : "filter-rejection", reason });
      }
    }
    const replayed = { trialId: trial.trialId, settle: [], capture };
    replayedStationaryTrials.push(replayed);
    return calculateStationaryTrialMetric(replayed);
  });
  const transitionMetrics: TransitionMetric[] = [];
  const transitionResults: CandidateTransitionResult[] = [];
  const transitionReplayOutputs: MotionTransition[] = [];
  for (const transition of input.transitionInputs ?? []) {
    const samples: TransitionSample[] = [];
    filter.reset();
    for (const sample of transition.samples) {
      try {
        const rawPosition = sample.rawPositionMm ?? sample.filteredPositionMm;
        const raw: RawViewerPose = { timestampMs: sample.timestampMs, positionMm: rawPosition, confidence: 1, estimatorId: "mediapipe-facial-transform-v1" };
        const output = filter.update(identityCalibrationTransform.apply(raw, input.calibrationProfile));
        if (![output.positionMm.x, output.positionMm.y, output.positionMm.z].every(Number.isFinite)) throw new RangeError("filter produced non-finite output");
        const axis = transition.axis;
        samples.push({ ...sample, output: output.positionMm[axis], filteredPositionMm: output.positionMm });
      } catch (error) {
        invalidOutputCount += 1;
        const reason = error instanceof Error ? error.message : "filter update failed";
        const rawPosition = sample.rawPositionMm ?? sample.filteredPositionMm;
        const inputNonFinite = ![rawPosition.x, rawPosition.y, rawPosition.z].every(Number.isFinite) || !Number.isFinite(sample.input);
        invalidSampleLocations.push({ candidateId: candidate.candidateId, traceKind: "transition", transitionId: transition.transitionId, timestampMs: sample.timestampMs, classification: inputNonFinite ? "non-finite-input" : reason.includes("non-finite") ? "non-finite-output" : "filter-rejection", reason });
        samples.push({ ...sample, output: Number.NaN, filteredPositionMm: { x: Number.NaN, y: Number.NaN, z: Number.NaN } });
      }
    }
    const outputTrace = { ...transition, samples };
    transitionReplayOutputs.push(outputTrace);
    const result = evaluateTransition(outputTrace);
    transitionResults.push(result);
    if (result.status === "evaluable") transitionMetrics.push({ transitionId: result.transitionId, axis: result.axis, lagMs: result.lagMs, overshootMm: result.overshootMm, discontinuityMm: result.discontinuityMm });
  }
  const p95LagMs = transitionResults.some((result) => result.status === "evaluable") ? transitionResults.filter((result): result is Extract<CandidateTransitionResult, { status: "evaluable" }> => result.status === "evaluable").sort((left, right) => left.lagMs - right.lagMs).at(Math.ceil(transitionMetrics.length * 0.95) - 1)?.lagMs ?? null : null;
  return objectiveForCandidate(candidate, stationaryTrials, p95LagMs, invalidOutputCount, transitionMetrics, 0, 0, input.stationaryTrials, input.transitionInputs, replayedStationaryTrials, transitionResults, transitionReplayOutputs, invalidSampleLocations);
}

export function runOneEuroSweep(input: FilterSweepInput): FilterSweepResult {
  const candidates = enumerateOneEuroGrid().map((candidate) => runOneEuroCandidate(candidate, input));
  return Object.freeze({ candidates: Object.freeze(candidates), shortlist: buildShortlist(candidates) });
}
