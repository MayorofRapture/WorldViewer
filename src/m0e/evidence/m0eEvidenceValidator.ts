import { buildShortlist, calculateStationaryTrialMetric, calculateTransitionMetric, enumerateOneEuroGrid, type CandidateObjective } from "../analysis/filterMetrics";
import { M0E_DRAFT_VERSION, M0E_EVIDENCE_SCHEMA_VERSION, M0E_EXPERIMENT_PROCEDURE_VERSION, M0E_METRIC_VERSION, M0E_REQUIRED_FILES, M0E_REQUIRED_GRID, M0E_REQUIRED_SCENARIO_IDS, M0E_VALIDATOR_VERSION, type M0EEvidenceBundle } from "./m0eEvidenceContracts";

export interface M0EValidationFailure {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface M0EValidationResult {
  readonly validatorVersion: typeof M0E_VALIDATOR_VERSION;
  readonly evidenceSchemaVersion: number | null;
  readonly checksPerformed: readonly string[];
  readonly passed: boolean;
  readonly failures: readonly M0EValidationFailure[];
}

const CHECKS = Object.freeze([
  "required-files",
  "exact-procedure-identity",
  "estimator-identity",
  "source-trace-provenance",
  "required-scenarios-and-trials",
  "candidate-grid",
  "finite-metrics",
  "calibration-summary",
  "stationary-metric-regeneration",
  "motion-metric-regeneration",
  "shortlist-regeneration",
  "invalidations",
  "m0e7-candidate-boundary",
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function add(failures: M0EValidationFailure[], code: string, path: string, message: string): void {
  failures.push(Object.freeze({ code, path, message }));
}

function exactCandidateGrid(candidates: readonly { readonly minCutoffHz: number; readonly beta: number; readonly dCutoffHz: number }[]): boolean {
  const expected = enumerateOneEuroGrid();
  if (candidates.length !== expected.length) return false;
  return expected.every((candidate) => candidates.some((actual) => actual.minCutoffHz === candidate.minCutoffHz && actual.beta === candidate.beta && actual.dCutoffHz === candidate.dCutoffHz));
}

function finiteCandidate(candidate: CandidateObjective): boolean {
  return finite(candidate.p95LagMs) && candidate.invalidOutputCount >= 0 && (candidate.jitterObjective === null || finite(candidate.jitterObjective)) && candidate.stationaryTrials.every((trial) => finite(trial.rms.x) && finite(trial.rms.y) && finite(trial.rms.z));
}

export function validateM0EEvidenceBundle(value: unknown): M0EValidationResult {
  const failures: M0EValidationFailure[] = [];
  const bundle = record(value) ? value as Partial<M0EEvidenceBundle> : null;
  const manifest = bundle?.manifest;
  const filesIncluded = bundle?.filesIncluded;
  const evidenceSchemaVersion = record(manifest) && finite(manifest.evidenceSchemaVersion) ? manifest.evidenceSchemaVersion : null;

  if (!Array.isArray(filesIncluded)) add(failures, "missing-required-files", "filesIncluded", "filesIncluded must be an array");
  else for (const required of M0E_REQUIRED_FILES) if (!filesIncluded.includes(required)) add(failures, "missing-required-files", "filesIncluded", `required file is missing: ${required}`);

  if (!record(manifest)) {
    add(failures, "invalid-manifest", "manifest", "manifest must be an object");
  } else {
    if (manifest.schemaVersion !== M0E_EVIDENCE_SCHEMA_VERSION || manifest.draftVersion !== M0E_DRAFT_VERSION || manifest.experimentProcedureVersion !== M0E_EXPERIMENT_PROCEDURE_VERSION || manifest.evidenceSchemaVersion !== M0E_EVIDENCE_SCHEMA_VERSION || manifest.validatorVersion !== M0E_VALIDATOR_VERSION || manifest.metricVersion !== M0E_METRIC_VERSION) add(failures, "invalid-procedure-identity", "manifest", "manifest versions must exactly match frozen M0E identity");
    if (manifest.estimatorId !== "mediapipe-facial-transform-v1" || manifest.estimatorVersion !== "v1" || manifest.estimatorConfigHash !== "fnv1a64-825a99daebb20f6c") add(failures, "invalid-estimator-identity", "manifest", "manifest estimator identity/configuration does not match ADR-006.01");
    if (manifest.calibrationModel !== "independent-per-axis-scale-offset" || manifest.filterPackage !== "1eurofilter" || manifest.filterPackageVersion !== "1.3.0") add(failures, "invalid-model-provenance", "manifest", "calibration/filter provenance does not match frozen reuse and oracle records");
    if (!Array.isArray(manifest.traceIds) || manifest.traceIds.length === 0 || !manifest.traceIds.every((traceId) => typeof traceId === "string" && traceId.trim().length > 0) || !Array.isArray(manifest.traceContentHashes) || manifest.traceContentHashes.length === 0) add(failures, "invalid-trace-provenance", "manifest.traceIds", "source trace IDs and content hashes are required");
    if (!Array.isArray(manifest.requiredScenarioIds) || M0E_REQUIRED_SCENARIO_IDS.some((scenarioId) => !manifest.requiredScenarioIds?.includes(scenarioId))) add(failures, "missing-calibration-scenarios", "manifest.requiredScenarioIds", "lateral, vertical, and approach-retreat scenarios are required");
    if (!Array.isArray(manifest.requiredNeutralTrialIds) || manifest.requiredNeutralTrialIds.length !== 5) add(failures, "missing-stationary-trials", "manifest.requiredNeutralTrialIds", "exactly five required neutral stationary trials are required");
    if (!Array.isArray(manifest.requiredTransitionAxes) || manifest.requiredTransitionAxes.length !== 3 || !(["x", "y", "z"] as const).every((axis) => manifest.requiredTransitionAxes?.includes(axis))) add(failures, "missing-transitions", "manifest.requiredTransitionAxes", "X, Y, and Z prescribed transitions are required");
    if (!exactCandidateGrid(Array.isArray(manifest.candidateGrid) ? manifest.candidateGrid : [])) add(failures, "invalid-candidate-grid", "manifest.candidateGrid", "manifest must contain exactly the frozen 25-candidate grid");
  }

  const filtering = bundle?.filtering;
  if (!record(filtering)) {
    add(failures, "missing-filtering-evidence", "filtering", "filtering evidence is required for claim-bearing validation");
  } else {
    const candidates: readonly unknown[] = Array.isArray(filtering.candidates) ? filtering.candidates : [];
    const ids = new Set<string>();
    if (candidates.length !== 25) add(failures, "invalid-candidate-count", "filtering.candidates", "all 25 candidates must be present exactly once");
    for (const candidateValue of candidates) {
      const candidate = candidateValue as Partial<CandidateObjective>;
      const configuration = candidate.candidate as Partial<CandidateObjective["candidate"]> | undefined;
      if (!record(candidateValue) || typeof configuration?.candidateId !== "string" || ids.has(configuration.candidateId)) add(failures, "invalid-candidate-identity", "filtering.candidates", "candidate IDs must be unique and well formed");
      else ids.add(configuration.candidateId);
      if (!record(candidateValue) || !finiteCandidate(candidate as CandidateObjective)) add(failures, "invalid-metric", "filtering.candidates", "candidate metrics must be finite");
    }
    const validCandidates = candidates.filter((candidateValue): candidateValue is CandidateObjective => record(candidateValue) && record((candidateValue as Partial<CandidateObjective>).candidate) && Array.isArray((candidateValue as Partial<CandidateObjective>).stationaryTrials) && typeof (candidateValue as Partial<CandidateObjective>).p95LagMs === "number") as readonly CandidateObjective[];
    const regenerated = buildShortlist(validCandidates);
    if (validCandidates.length !== candidates.length) add(failures, "invalid-candidate-metrics", "filtering.candidates", "all candidate metric records must be complete");
    const storedShortlist = Array.isArray(filtering.shortlistCandidateIds) ? filtering.shortlistCandidateIds : [];
    const regeneratedIds = regenerated.frontier.map((candidate) => candidate.candidate.candidateId);
    if (regenerated.status === "requires-stronger-review") add(failures, "shortlist-requires-review", "filtering.shortlistCandidateIds", "more than six frontier candidates require stronger review");
    if (regenerated.status === "no-shortlist" && storedShortlist.length !== 0) add(failures, "invalid-shortlist", "filtering.shortlistCandidateIds", "no-shortlist result cannot retain candidates");
    const sameIds = (left: readonly string[], right: readonly string[]): boolean => left.length === right.length && new Set(left).size === left.length && left.every((id) => right.includes(id));
    if (regenerated.status === "shortlist" && !sameIds(storedShortlist, regeneratedIds)) add(failures, "shortlist-regeneration-mismatch", "filtering.shortlistCandidateIds", "shortlist must match deterministic Pareto regeneration");
    if (bundle?.m0e7CandidateIds !== undefined && !sameIds(bundle.m0e7CandidateIds, storedShortlist)) add(failures, "m0e7-boundary-mismatch", "m0e7CandidateIds", "M0E7 candidate IDs must exactly match validated shortlist");
    if (!Array.isArray(filtering.stationaryTrials) || filtering.stationaryTrials.length !== 5) add(failures, "invalid-stationary-trials", "filtering.stationaryTrials", "all five stationary trials must be present");
    if (!Array.isArray(filtering.transitions) || filtering.transitions.length === 0) add(failures, "invalid-transitions", "filtering.transitions", "prescribed complete transitions must be present");
    if (filtering.stationaryTrialInputs !== undefined) {
      if (!Array.isArray(filtering.stationaryTrialInputs) || filtering.stationaryTrialInputs.length !== filtering.stationaryTrials.length) add(failures, "stationary-regeneration-mismatch", "filtering.stationaryTrialInputs", "stationary inputs must correspond one-to-one with stored metrics");
      else filtering.stationaryTrialInputs.forEach((input, index) => {
        const regeneratedMetric = calculateStationaryTrialMetric(input);
        const stored = filtering.stationaryTrials[index]!;
        if (regeneratedMetric.trialId !== stored.trialId || JSON.stringify(regeneratedMetric.rms) !== JSON.stringify(stored.rms) || regeneratedMetric.eligible !== stored.eligible) add(failures, "stationary-regeneration-mismatch", `filtering.stationaryTrials[${index}]`, "stored stationary metric does not match deterministic regeneration");
      });
    }
    if (filtering.transitionInputs !== undefined) {
      if (!Array.isArray(filtering.transitionInputs) || filtering.transitionInputs.length !== filtering.transitions.length) add(failures, "motion-regeneration-mismatch", "filtering.transitionInputs", "transition inputs must correspond one-to-one with stored metrics");
      else filtering.transitionInputs.forEach((input, index) => {
        const regeneratedMetric = calculateTransitionMetric(input);
        const stored = filtering.transitions[index]!;
        if (regeneratedMetric.transitionId !== stored.transitionId || regeneratedMetric.axis !== stored.axis || regeneratedMetric.lagMs !== stored.lagMs || regeneratedMetric.overshootMm !== stored.overshootMm || JSON.stringify(regeneratedMetric.discontinuityMm) !== JSON.stringify(stored.discontinuityMm)) add(failures, "motion-regeneration-mismatch", `filtering.transitions[${index}]`, "stored motion metric does not match deterministic regeneration");
      });
    }
  }

  if (!record(bundle?.calibration)) add(failures, "missing-calibration-summary", "calibration", "calibration summary must be present for claim-bearing validation");
  else {
    for (const axis of ["x", "y", "z"] as const) {
      const fit = bundle.calibration.axes?.[axis];
      const decision = bundle.calibration.decisions?.[axis];
      if (!record(fit) || typeof fit.scale !== "number" || !Number.isFinite(fit.scale) || typeof fit.offset !== "number" || !Number.isFinite(fit.offset) || typeof decision !== "string") add(failures, "invalid-calibration-summary", `calibration.axes.${axis}`, "calibration fit and decision must be finite and present");
      if (decision === "identity-adequate" && (fit?.scale !== 1 || fit?.offset !== 0)) add(failures, "identity-axis-not-preserved", `calibration.axes.${axis}`, "identity-passing axis must retain scale 1 and offset 0");
    }
  }

  if (bundle !== null && bundle.invalidations !== undefined && (!Array.isArray(bundle.invalidations) || bundle.invalidations.some((entry) => !record(entry) || typeof entry.reason !== "string" || typeof entry.detail !== "string"))) add(failures, "invalid-invalidation", "invalidations", "invalidations must contain explicit reason/detail records");

  return Object.freeze({ validatorVersion: M0E_VALIDATOR_VERSION, evidenceSchemaVersion, checksPerformed: CHECKS, passed: failures.length === 0, failures: Object.freeze(failures) });
}

export function frozenM0EIdentity(): { readonly draftVersion: string; readonly experimentProcedureVersion: number; readonly evidenceSchemaVersion: number; readonly validatorVersion: number; readonly metricVersion: number; readonly candidateGrid: typeof M0E_REQUIRED_GRID } {
  return Object.freeze({ draftVersion: M0E_DRAFT_VERSION, experimentProcedureVersion: M0E_EXPERIMENT_PROCEDURE_VERSION, evidenceSchemaVersion: M0E_EVIDENCE_SCHEMA_VERSION, validatorVersion: M0E_VALIDATOR_VERSION, metricVersion: M0E_METRIC_VERSION, candidateGrid: M0E_REQUIRED_GRID });
}
