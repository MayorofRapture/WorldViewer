import type { M0DObservationTraceRecord } from "../../m0d/evidence/m0dEvidenceContracts";
import type { SelectedEstimatorReplayRecord } from "./recordedReplay";
import { computeM0ETraceContentHashesFromValidated, sourceArtifactsEqual, validateM0EAuthoritativeSourceArtifacts, type M0EAuthoritativeSourceArtifacts } from "../evidence/m0eSourceContentHash";

export type M0EReadinessStatus = "verified" | "not-proven-reusable" | "blocked";
export type M0ECalibrationAxis = "x" | "y" | "z";
export interface M0EStationaryWindow { readonly trialId: string; readonly scenarioId?: string; readonly settleTimestampsMs: readonly number[]; readonly captureTimestampsMs: readonly number[]; }
export interface M0EMotionTransitionWindow { readonly transitionId: string; readonly unitId?: string; readonly axis: M0ECalibrationAxis; readonly scenarioId: "lateral-movement" | "vertical-movement" | "approach-retreat"; readonly cycleId?: string; readonly targetMm?: number; readonly timestampsMs: readonly number[]; }
export interface M0ESourceReadinessIssue { readonly code: string; readonly detail: string; }
export interface M0ECalibrationReadiness { readonly axis: M0ECalibrationAxis; readonly status: M0EReadinessStatus; readonly cycles: number; readonly issues: readonly M0ESourceReadinessIssue[]; }
export interface M0ESourceReadiness {
  readonly sourceM0DRunId: string; readonly sourceM0DPath: string; readonly m0dSchemaVersion: number; readonly m0dExperimentSpecVersion: string; readonly m0dExperimentProcedureVersion: number;
  readonly m0dValidation: { readonly passed: boolean; readonly validatorVersion: number }; readonly selectedEstimator: { readonly id: string; readonly configHash: string };
  readonly traceIds: readonly string[]; readonly traceContentHashes: readonly string[]; readonly contentHashStatus: "verified" | "blocked" | "source-content-unavailable";
  readonly replayAlignment: { readonly status: M0EReadinessStatus; readonly issues: readonly M0ESourceReadinessIssue[] };
  readonly calibration: Readonly<Record<M0ECalibrationAxis, M0ECalibrationReadiness>>;
  readonly neutralStationary: { readonly status: M0EReadinessStatus; readonly trialIds: readonly string[]; readonly issues: readonly M0ESourceReadinessIssue[] };
  readonly motionTransitions: { readonly status: M0EReadinessStatus; readonly transitionIds: readonly string[]; readonly issues: readonly M0ESourceReadinessIssue[] };
}
export interface M0ESourceContext { readonly validReplayRecords: readonly SelectedEstimatorReplayRecord[]; readonly invalidReplayRecords: readonly SelectedEstimatorReplayRecord[]; readonly stationaryTrials: readonly M0EStationaryWindow[]; readonly nearFarStationaryWindows: readonly M0EStationaryWindow[]; readonly transitions: readonly M0EMotionTransitionWindow[]; readonly readiness?: M0ESourceReadiness; }
export interface M0ESourceBundle { readonly sourceM0DRunId: string; readonly sourceM0DPath: string; readonly manifest: { readonly schemaVersion: number; readonly experimentSpecVersion: string; readonly experimentProcedureVersion: number; readonly estimatorA: { readonly estimatorId: string; readonly configHash: string } }; readonly validation: { readonly passed: boolean; readonly validatorVersion: number }; readonly traceContentHashes?: readonly string[]; readonly authoritativeSourceArtifacts?: M0EAuthoritativeSourceArtifacts; }

const scenarios = ["lateral-movement", "vertical-movement", "approach-retreat"] as const;
const REQUIRED_NEUTRAL_TRIAL_IDS = Object.freeze(["neutral-stationary-trial-1", "neutral-stationary-trial-2", "neutral-stationary-trial-3", "neutral-stationary-trial-4", "neutral-stationary-trial-5"] as const);
const problem = (code: string, detail: string): M0ESourceReadinessIssue => Object.freeze({ code, detail });
const monotonic = (values: readonly number[]): boolean => values.every((value, index) => index === 0 || value > values[index - 1]!);
function axisFor(scenario: string): M0ECalibrationAxis | undefined { return scenario === "lateral-movement" ? "x" : scenario === "vertical-movement" ? "y" : scenario === "approach-retreat" ? "z" : undefined; }
function targets(axis: M0ECalibrationAxis): readonly number[] { return axis === "x" ? [-150, 0, 150, 0] : axis === "y" ? [-100, 0, 100, 0] : [450, 600, 750, 600, 450]; }

function calibrationReadiness(trace: readonly M0DObservationTraceRecord[], axis: M0ECalibrationAxis): M0ECalibrationReadiness {
  const scenario = axis === "x" ? "lateral-movement" : axis === "y" ? "vertical-movement" : "approach-retreat";
  const cycles = new Map<string, M0DObservationTraceRecord[]>();
  for (const row of trace) if (row.envelope.scenarioId === scenario && row.envelope.cycleId) (cycles.get(row.envelope.cycleId) ?? (cycles.set(row.envelope.cycleId, []), cycles.get(row.envelope.cycleId)!)).push(row);
  const issues: M0ESourceReadinessIssue[] = [];
  const orderedCycles = [...cycles.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (orderedCycles.length !== 3) issues.push(problem("incomplete-calibration-cycles", `expected three ${axis.toUpperCase()} cycles, found ${orderedCycles.length}`));
  for (const [cycleId, rows] of orderedCycles) {
    const segments = new Map<string, M0DObservationTraceRecord[]>();
    for (const row of rows) if (row.envelope.stepKind === "hold") (segments.get(row.envelope.segmentId) ?? (segments.set(row.envelope.segmentId, []), segments.get(row.envelope.segmentId)!)).push(row);
    const ordered = [...segments.values()].sort((left, right) => left[0]!.observation.timestampMs - right[0]!.observation.timestampMs);
    const actualTargets = ordered.map((segment) => segment[0]!.envelope.diagnostics.targetMm);
    if (actualTargets.length !== targets(axis).length || actualTargets.some((value, index) => value !== targets(axis)[index]) || ordered.some((segment) => segment.some((row) => row.envelope.diagnostics.targetAxis !== undefined && row.envelope.diagnostics.targetAxis !== axis))) issues.push(problem("invalid-calibration-target-order", `${cycleId} does not contain the required target sequence or axis metadata`));
    for (const segment of ordered) if (segment.some((row) => row.envelope.stepKind !== "hold") || segment.length === 0 || !monotonic(segment.map((row) => row.observation.timestampMs))) issues.push(problem("incomplete-calibration-hold", `${cycleId} contains an incomplete or non-monotonic target hold`));
  }
  return Object.freeze({ axis, status: issues.length === 0 ? "verified" : "not-proven-reusable", cycles: orderedCycles.length, issues: Object.freeze(issues) });
}

function makeReadiness(trace: readonly M0DObservationTraceRecord[], replay: readonly SelectedEstimatorReplayRecord[], source: M0ESourceBundle): M0ESourceReadiness {
  const replayIssues: M0ESourceReadinessIssue[] = [];
  if (source.sourceM0DRunId !== "run-1790638307359" || source.sourceM0DPath !== "evidence/m0d/estimator-experiment-v3/run-1790638307359") replayIssues.push(problem("wrong-source-identity", "claim-bearing M0E source must be the prescribed M0D run and path"));
  if (!source.validation.passed) replayIssues.push(problem("m0d-validation-failed", "M0D validation did not pass"));
  if (source.manifest.schemaVersion !== 1 || source.manifest.experimentSpecVersion !== "0.4" || source.manifest.experimentProcedureVersion !== 3) replayIssues.push(problem("wrong-m0d-procedure-identity", "M0D schema/spec/procedure identity does not match the prescribed source"));
  if (source.manifest.estimatorA.estimatorId !== "mediapipe-facial-transform-v1" || source.manifest.estimatorA.configHash !== "fnv1a64-825a99daebb20f6c") replayIssues.push(problem("wrong-estimator-identity", "selected Estimator A identity/configuration does not match the prescribed source"));
  const traceIds = [...new Set(trace.map((row) => row.envelope.traceId))];
  if (traceIds.length !== 1 || replay.length !== trace.length) replayIssues.push(problem("replay-source-cardinality-mismatch", "replay and observation source rows are not one-to-one"));
  for (let index = 0; index < Math.min(trace.length, replay.length); index += 1) {
    const sourceRow = trace[index]!; const row = replay[index]!;
    if (row.timestampMs !== sourceRow.observation.timestampMs || row.observationTraceId !== sourceRow.envelope.traceId) replayIssues.push(problem("replay-source-misalignment", `replay row ${index} does not match source timestamp/trace identity`));
    if (row.valid !== (row.positionMm !== null) || (sourceRow.observation.facialTransformMatrix !== undefined && row.valid !== (sourceRow.observation.facialTransformMatrix !== null)) || (!row.valid && row.invalidReason.length === 0)) replayIssues.push(problem("replay-validity-coherence", `replay row ${index} is not coherent with its retained position/invalid record`));
    if (row.estimatorId !== source.manifest.estimatorA.estimatorId || row.estimatorConfigHash !== source.manifest.estimatorA.configHash) replayIssues.push(problem("replay-estimator-mismatch", `replay row ${index} has the wrong estimator identity`));
  }
  const context = reconstructM0ESourceContext(trace, replay);
  const stationaryIssues: M0ESourceReadinessIssue[] = [];
  const actualNeutralTrialIds = context.stationaryTrials.map((trial) => trial.trialId);
  const requiredNeutralTrialIdSet = new Set<string>(REQUIRED_NEUTRAL_TRIAL_IDS);
  const actualNeutralTrialIdSet = new Set(actualNeutralTrialIds);
  if (actualNeutralTrialIds.length !== REQUIRED_NEUTRAL_TRIAL_IDS.length || actualNeutralTrialIdSet.size !== actualNeutralTrialIds.length || actualNeutralTrialIdSet.size !== requiredNeutralTrialIdSet.size || [...requiredNeutralTrialIdSet].some((id) => !actualNeutralTrialIdSet.has(id)) || [...actualNeutralTrialIdSet].some((id) => !requiredNeutralTrialIdSet.has(id))) stationaryIssues.push(problem("invalid-neutral-trial-identity", "the neutral stationary trial IDs must exactly equal the five frozen identities"));
  for (const trial of context.stationaryTrials) {
    if (!trial.settleTimestampsMs.length || !trial.captureTimestampsMs.length || !monotonic(trial.settleTimestampsMs) || !monotonic(trial.captureTimestampsMs) || trial.settleTimestampsMs.at(-1)! >= trial.captureTimestampsMs[0]!) stationaryIssues.push(problem("invalid-neutral-segments", `${trial.trialId} has missing, unordered, or overlapping settle/capture segments`));
    if (trial.settleTimestampsMs.at(-1)! - trial.settleTimestampsMs[0]! < 2000 || trial.captureTimestampsMs.at(-1)! - trial.captureTimestampsMs[0]! < 5000) stationaryIssues.push(problem("unproven-neutral-duration", `${trial.trialId} does not prove the frozen 2-second settle and 5-second capture durations`));
  }
  const transitionIssues: M0ESourceReadinessIssue[] = [];
  const rawTransitionRows = trace.filter((row) => scenarios.includes(row.envelope.scenarioId as typeof scenarios[number]) && row.envelope.stepKind === "transition" && row.envelope.segmentId);
  const rawDefinitions = new Map<string, typeof rawTransitionRows>();
  for (const row of rawTransitionRows) (rawDefinitions.get(row.envelope.segmentId) ?? (rawDefinitions.set(row.envelope.segmentId, []), rawDefinitions.get(row.envelope.segmentId)!)).push(row);
  for (const [transitionId, rows] of rawDefinitions) {
    const first = rows[0]!;
    const firstAxis = axisFor(first.envelope.scenarioId);
    const firstTarget = typeof first.envelope.diagnostics.targetMm === "number" ? first.envelope.diagnostics.targetMm : undefined;
    if (rows.some((row) => axisFor(row.envelope.scenarioId) !== firstAxis || row.envelope.scenarioId !== first.envelope.scenarioId || row.envelope.cycleId !== first.envelope.cycleId || (typeof row.envelope.diagnostics.targetMm === "number" ? row.envelope.diagnostics.targetMm : undefined) !== firstTarget)) transitionIssues.push(problem("conflicting-transition-identity", `${transitionId} has conflicting scenario, axis, cycle, or target metadata across raw transition rows`));
    if (new Set(rows.map((row) => row.envelope.unitId)).size > 1) transitionIssues.push(problem("duplicate-transition-definition", `${transitionId} is associated with more than one transition definition`));
  }
  const expectedTransitionDefinitions = new Map<string, { scenarioId: string; cycleId: string; unitId: string; targetMm?: number }>();
  const holdRows = trace.filter((row) => scenarios.includes(row.envelope.scenarioId as typeof scenarios[number]) && row.envelope.stepKind === "hold" && row.envelope.cycleId && row.envelope.unitId);
  for (const row of holdRows) {
    const scenarioId = row.envelope.scenarioId;
    const cycleId = row.envelope.cycleId!;
    const unitId = row.envelope.unitId!;
    const key = `${scenarioId}|${cycleId}|${unitId}`;
    const targetMm = typeof row.envelope.diagnostics.targetMm === "number" ? row.envelope.diagnostics.targetMm : undefined;
    const prior = expectedTransitionDefinitions.get(key);
    if (prior && (prior.targetMm !== targetMm || prior.scenarioId !== scenarioId || prior.cycleId !== cycleId)) transitionIssues.push(problem("conflicting-transition-identity", `${unitId} has conflicting source hold metadata`));
    else expectedTransitionDefinitions.set(key, { scenarioId, cycleId, unitId, ...(targetMm === undefined ? {} : { targetMm }) });
  }
  const actualTransitionDefinitions = new Map<string, M0EMotionTransitionWindow>();
  for (const transition of context.transitions) if (transition.cycleId && transition.unitId) {
    const key = `${transition.scenarioId}|${transition.cycleId}|${transition.unitId}`;
    if (actualTransitionDefinitions.has(key)) transitionIssues.push(problem("duplicate-transition-definition", `${transition.unitId} has multiple reconstructed transition definitions`));
    else actualTransitionDefinitions.set(key, transition);
  }
  for (const [key, expected] of expectedTransitionDefinitions) if (!actualTransitionDefinitions.has(key)) transitionIssues.push(problem("missing-expected-transition", `${expected.unitId} is required by the source cycle metadata but has no complete transition rows`));
  for (const [key, transition] of actualTransitionDefinitions) if (!expectedTransitionDefinitions.has(key)) transitionIssues.push(problem("extra-transition", `${transition.transitionId} is not a complete transition represented by source cycle metadata`));
  for (const transition of context.transitions) if (axisFor(transition.scenarioId) !== transition.axis || transition.timestampsMs.length < 2 || !monotonic(transition.timestampsMs)) transitionIssues.push(problem("invalid-transition-structure", `${transition.transitionId} has invalid scenario/axis mapping or timestamps`));
  for (const scenario of scenarios) if (!context.transitions.some((transition) => transition.scenarioId === scenario)) transitionIssues.push(problem("missing-transition-family", `${scenario} transition family is missing`));
  const artifacts = source.authoritativeSourceArtifacts;
  const sourceValidation = artifacts ? validateM0EAuthoritativeSourceArtifacts(artifacts) : undefined;
  const expectedTraceIds = sourceValidation?.ok ? sourceValidation.traceIds : [];
  const expectedHashes = sourceValidation?.ok ? computeM0ETraceContentHashesFromValidated(sourceValidation) : [];
  const sourceContentIssues: M0ESourceReadinessIssue[] = [];
  if (!artifacts) sourceContentIssues.push(problem("source-content-unavailable", "authoritative M0D source artifacts were not supplied"));
  else if (sourceValidation === undefined) sourceContentIssues.push(problem("source-content-unavailable", "authoritative M0D source artifacts were not supplied"));
  else if (!sourceValidation.ok) sourceContentIssues.push(problem(sourceValidation.failure.code, `${sourceValidation.failure.path}: ${sourceValidation.failure.message}`));
  else {
    if (!sourceArtifactsEqual({ observationTrace: trace, selectedEstimatorReplay: replay }, artifacts)) sourceContentIssues.push(problem("source-reconstruction-mismatch", "readiness inputs do not correspond to the authoritative source artifacts"));
    if (JSON.stringify(traceIds) !== JSON.stringify(expectedTraceIds)) sourceContentIssues.push(problem("source-trace-id-mismatch", "reconstructed trace IDs do not match the authoritative source"));
    if (source.traceContentHashes !== undefined && JSON.stringify(source.traceContentHashes) !== JSON.stringify(expectedHashes)) sourceContentIssues.push(problem("source-content-hash-mismatch", "source manifest hashes do not match the authoritative source"));
  }
  return Object.freeze({ sourceM0DRunId: source.sourceM0DRunId, sourceM0DPath: source.sourceM0DPath, m0dSchemaVersion: source.manifest.schemaVersion, m0dExperimentSpecVersion: source.manifest.experimentSpecVersion, m0dExperimentProcedureVersion: source.manifest.experimentProcedureVersion, m0dValidation: Object.freeze({ passed: source.validation.passed, validatorVersion: source.validation.validatorVersion }), selectedEstimator: Object.freeze({ id: source.manifest.estimatorA.estimatorId, configHash: source.manifest.estimatorA.configHash }), traceIds: Object.freeze(traceIds), traceContentHashes: Object.freeze(artifacts ? expectedHashes : (source.traceContentHashes ?? [])), contentHashStatus: artifacts && sourceContentIssues.length === 0 ? "verified" : artifacts ? "blocked" : "source-content-unavailable", replayAlignment: Object.freeze({ status: replayIssues.length ? "blocked" : "verified", issues: Object.freeze(replayIssues.concat(sourceContentIssues)) }), calibration: Object.freeze({ x: calibrationReadiness(trace, "x"), y: calibrationReadiness(trace, "y"), z: calibrationReadiness(trace, "z") }), neutralStationary: Object.freeze({ status: stationaryIssues.length ? "not-proven-reusable" : "verified", trialIds: Object.freeze(context.stationaryTrials.map((trial) => trial.trialId)), issues: Object.freeze(stationaryIssues) }), motionTransitions: Object.freeze({ status: transitionIssues.length ? "not-proven-reusable" : "verified", transitionIds: Object.freeze(context.transitions.map((transition) => transition.transitionId)), issues: Object.freeze(transitionIssues) }) });
}

export function reconstructM0ESourceContext(trace: readonly M0DObservationTraceRecord[], replay: readonly SelectedEstimatorReplayRecord[], source?: M0ESourceBundle): M0ESourceContext {
  const grouped = new Map<string, { scenarioId: string; trialId: string; settle: number[]; capture: number[] }>();
  for (const row of trace) { const scenarioId = row.envelope.scenarioId; if (!["neutral-stationary", "near-stationary-450", "far-stationary-750"].includes(scenarioId) || typeof row.envelope.trialId !== "string") continue; const key = `${scenarioId}|${row.envelope.trialId}`; const group = grouped.get(key) ?? { scenarioId, trialId: row.envelope.trialId, settle: [], capture: [] }; if (row.envelope.stepKind === "settle") group.settle.push(row.observation.timestampMs); if (row.envelope.stepKind === "capture") group.capture.push(row.observation.timestampMs); grouped.set(key, group); }
  const stationary = [...grouped.values()].map((group) => Object.freeze({ trialId: group.trialId, scenarioId: group.scenarioId, settleTimestampsMs: Object.freeze(group.settle), captureTimestampsMs: Object.freeze(group.capture) }));
  const transitionMap = new Map<string, { transitionId: string; unitId?: string; axis: M0ECalibrationAxis; scenarioId: M0EMotionTransitionWindow["scenarioId"]; cycleId?: string; targetMm?: number; timestampsMs: number[] }>();
  for (const row of trace) {
    const axis = axisFor(row.envelope.scenarioId);
    if (!axis || row.envelope.stepKind !== "transition" || !row.envelope.segmentId) continue;
    const existing = transitionMap.get(row.envelope.segmentId);
    if (existing) { existing.timestampsMs.push(row.observation.timestampMs); continue; }
    const transition = { transitionId: row.envelope.segmentId, ...(row.envelope.unitId === undefined ? {} : { unitId: row.envelope.unitId }), axis, scenarioId: row.envelope.scenarioId as M0EMotionTransitionWindow["scenarioId"], ...(row.envelope.cycleId === undefined ? {} : { cycleId: row.envelope.cycleId }), ...(typeof row.envelope.diagnostics.targetMm === "number" ? { targetMm: row.envelope.diagnostics.targetMm } : {}), timestampsMs: [row.observation.timestampMs] };
    transitionMap.set(row.envelope.segmentId, transition);
  }
  const context = Object.freeze({ validReplayRecords: Object.freeze(replay.filter((row) => row.valid)), invalidReplayRecords: Object.freeze(replay.filter((row) => !row.valid)), stationaryTrials: Object.freeze(stationary.filter((window) => window.scenarioId === "neutral-stationary")), nearFarStationaryWindows: Object.freeze(stationary.filter((window) => window.scenarioId !== "neutral-stationary")), transitions: Object.freeze([...transitionMap.values()].map((transition) => Object.freeze({ ...transition, timestampsMs: Object.freeze(transition.timestampsMs) }))) });
  return source ? Object.freeze({ ...context, readiness: makeReadiness(trace, replay, source) }) : context;
}
