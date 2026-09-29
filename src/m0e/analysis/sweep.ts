import type { CalibrationProfile } from "../../shared/contracts/calibration";
import type { RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";
import { identityCalibrationTransform } from "../../shared/contracts/calibration";
import { OneEuroPoseFilter } from "../../engine/filter/poseFilter";
import { buildShortlist, calculateStationaryTrialMetric, enumerateOneEuroGrid, objectiveForCandidate, type CandidateObjective, type StationaryTrial, type OneEuroCandidateConfiguration } from "./filterMetrics";

export interface FilterSweepInput {
  readonly rawPoses: readonly RawViewerPose[];
  readonly calibrationProfile: CalibrationProfile;
  readonly stationaryTrials: readonly StationaryTrial[];
  readonly lagByCandidate?: Readonly<Record<string, number>>;
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
  const stationaryTrials = input.stationaryTrials.map((trial) => calculateStationaryTrialMetric(trial));
  return objectiveForCandidate(candidate, stationaryTrials, input.lagByCandidate?.[candidate.candidateId] ?? 0, invalidOutputCount);
}

export function runOneEuroSweep(input: FilterSweepInput): FilterSweepResult {
  const candidates = enumerateOneEuroGrid().map((candidate) => runOneEuroCandidate(candidate, input));
  return Object.freeze({ candidates: Object.freeze(candidates), shortlist: buildShortlist(candidates) });
}
