import type { OneEuroCandidateConfiguration, CandidateObjective, MotionTransition, StationaryTrial, StationaryTrialMetric, TransitionMetric } from "../analysis/filterMetrics";
import type { AxisCalibrationFit, CalibrationDecision, XYCalibrationObservation, ZCalibrationObservation } from "../analysis/calibrationAnalysis";
import type { M0ESourceReadiness } from "../replay/m0eSourceContext";

export const M0E_DRAFT_VERSION = "0.3" as const;
export const M0E_EXPERIMENT_PROCEDURE_VERSION = 1 as const;
export const M0E_EVIDENCE_SCHEMA_VERSION = 1 as const;
export const M0E_VALIDATOR_VERSION = 2 as const;
export const M0E_METRIC_VERSION = 1 as const;

export interface M0EManifest {
  readonly schemaVersion: typeof M0E_EVIDENCE_SCHEMA_VERSION;
  readonly draftVersion: typeof M0E_DRAFT_VERSION;
  readonly experimentProcedureVersion: typeof M0E_EXPERIMENT_PROCEDURE_VERSION;
  readonly evidenceSchemaVersion: typeof M0E_EVIDENCE_SCHEMA_VERSION;
  readonly validatorVersion: typeof M0E_VALIDATOR_VERSION;
  readonly metricVersion: typeof M0E_METRIC_VERSION;
  readonly sourceCommit: string;
  readonly sourceM0DRunId: string;
  readonly sourceM0DPath: string;
  readonly estimatorId: "mediapipe-facial-transform-v1";
  readonly estimatorVersion: "v1";
  readonly estimatorConfigHash: "fnv1a64-825a99daebb20f6c";
  readonly traceIds: readonly string[];
  readonly traceContentHashes: readonly string[];
  readonly requiredScenarioIds: readonly ["lateral-movement", "vertical-movement", "approach-retreat"];
  readonly requiredNeutralTrialIds: readonly string[];
  readonly requiredTransitionAxes: readonly ["x", "y", "z"];
  readonly calibrationModel: "independent-per-axis-scale-offset";
  readonly filterPackage: "1eurofilter";
  readonly filterPackageVersion: "1.3.0";
  readonly candidateGrid: readonly OneEuroCandidateConfiguration[];
}

export interface M0ECalibrationEvidence {
  readonly axes: Readonly<Record<"x" | "y" | "z", AxisCalibrationFit>>;
  readonly decisions: Readonly<Record<"x" | "y" | "z", CalibrationDecision>>;
  readonly observations: Readonly<{ readonly x: readonly XYCalibrationObservation[]; readonly y: readonly XYCalibrationObservation[]; readonly z: readonly ZCalibrationObservation[] }>;
}

export interface M0EFilterEvidence {
  readonly stationaryTrials: readonly StationaryTrialMetric[];
  readonly stationaryTrialInputs: readonly StationaryTrial[];
  readonly transitions: readonly TransitionMetric[];
  readonly transitionInputs: readonly MotionTransition[];
  readonly candidates: readonly CandidateObjective[];
  readonly shortlistCandidateIds: readonly string[];
}

export interface M0EEvidenceBundle {
  readonly manifest: M0EManifest;
  readonly calibration?: M0ECalibrationEvidence;
  readonly filtering?: M0EFilterEvidence;
  readonly filesIncluded: readonly string[];
  readonly invalidations?: readonly { readonly reason: string; readonly detail: string }[];
  readonly m0e7CandidateIds?: readonly string[];
  /** Host-private source proof; required for non-fixture claim-bearing bundles. */
  readonly sourceReadiness?: M0ESourceReadiness;
}

export const M0E_REQUIRED_FILES = Object.freeze([
  "manifest.json",
  "validation.json",
  "calibration/raw-samples.csv",
  "calibration/fit-summary.json",
  "filtering/stationary-trace.csv",
  "filtering/motion-trace.csv",
  "filtering/sweep-results.json",
  "filtering/shortlist.json",
  "perceptual-comparison.md",
] as const);

export const M0E_REQUIRED_GRID = Object.freeze({
  minCutoffHz: Object.freeze([0.25, 0.5, 1, 2, 4]),
  beta: Object.freeze([0, 0.001, 0.003, 0.01, 0.03]),
  dCutoffHz: 1,
});

export const M0E_REQUIRED_SCENARIO_IDS = Object.freeze(["lateral-movement", "vertical-movement", "approach-retreat"] as const);
export const M0E_ALLOWED_INVALIDATION_REASONS = Object.freeze([
  "source-procedural-invalidation",
  "missing-required-samples",
  "invalid-non-finite-calibrated-input",
  "threshold-crossing-not-establishable",
] as const);
