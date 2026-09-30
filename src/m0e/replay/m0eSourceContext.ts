import type { M0DObservationTraceRecord } from "../../m0d/evidence/m0dEvidenceContracts";
import type { SelectedEstimatorReplayRecord } from "./recordedReplay";

export type M0EReadinessStatus = "verified" | "not-proven-reusable" | "blocked";
export type M0ECalibrationAxis = "x" | "y" | "z";
export interface M0EStationaryWindow { readonly trialId: string; readonly scenarioId?: string; readonly settleTimestampsMs: readonly number[]; readonly captureTimestampsMs: readonly number[]; }
export interface M0EMotionTransitionWindow { readonly transitionId: string; readonly axis: M0ECalibrationAxis; readonly scenarioId: "lateral-movement" | "vertical-movement" | "approach-retreat"; readonly cycleId?: string; readonly targetMm?: number; readonly timestampsMs: readonly number[]; }
export interface M0ESourceReadinessIssue { readonly code: string; readonly detail: string; }
export interface M0ECalibrationReadiness { readonly axis: M0ECalibrationAxis; readonly status: M0EReadinessStatus; readonly cycles: number; readonly issues: readonly M0ESourceReadinessIssue[]; }
export interface M0ESourceReadiness {
  readonly sourceM0DRunId: string; readonly sourceM0DPath: string; readonly m0dSchemaVersion: number; readonly m0dExperimentSpecVersion: string; readonly m0dExperimentProcedureVersion: number;
  readonly m0dValidation: { readonly passed: boolean; readonly validatorVersion: number }; readonly selectedEstimator: { readonly id: string; readonly configHash: string };
  readonly traceIds: readonly string[]; readonly traceContentHashes: readonly string[]; readonly contentHashStatus: "unresolved-authority" | "verified";
  readonly replayAlignment: { readonly status: M0EReadinessStatus; readonly issues: readonly M0ESourceReadinessIssue[] };
  readonly calibration: Readonly<Record<M0ECalibrationAxis, M0ECalibrationReadiness>>;
  readonly neutralStationary: { readonly status: M0EReadinessStatus; readonly trialIds: readonly string[]; readonly issues: readonly M0ESourceReadinessIssue[] };
  readonly motionTransitions: { readonly status: M0EReadinessStatus; readonly transitionIds: readonly string[]; readonly issues: readonly M0ESourceReadinessIssue[] };
}
export interface M0ESourceContext { readonly validReplayRecords: readonly SelectedEstimatorReplayRecord[]; readonly invalidReplayRecords: readonly SelectedEstimatorReplayRecord[]; readonly stationaryTrials: readonly M0EStationaryWindow[]; readonly nearFarStationaryWindows: readonly M0EStationaryWindow[]; readonly transitions: readonly M0EMotionTransitionWindow[]; readonly readiness?: M0ESourceReadiness; }
export interface M0ESourceBundle { readonly sourceM0DRunId: string; readonly sourceM0DPath: string; readonly manifest: { readonly schemaVersion: number; readonly experimentSpecVersion: string; readonly experimentProcedureVersion: number; readonly estimatorA: { readonly estimatorId: string; readonly configHash: string } }; readonly validation: { readonly passed: boolean; readonly validatorVersion: number }; readonly traceContentHashes?: readonly string[]; }

const scenarios = ["lateral-movement", "vertical-movement", "approach-retreat"] as const;
const axes = ["x", "y", "z"] as const;
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
  const required = axes.map((_, index) => `neutral-stationary-trial-${index + 1}`);
  if (context.stationaryTrials.length !== 5 || new Set(context.stationaryTrials.map((trial) => trial.trialId)).size !== 5 || required.some((id) => !context.stationaryTrials.some((trial) => trial.trialId === id))) stationaryIssues.push(problem("missing-neutral-trial", "exactly five unique neutral stationary trials are required"));
  for (const trial of context.stationaryTrials) {
    if (!trial.settleTimestampsMs.length || !trial.captureTimestampsMs.length || !monotonic(trial.settleTimestampsMs) || !monotonic(trial.captureTimestampsMs) || trial.settleTimestampsMs.at(-1)! >= trial.captureTimestampsMs[0]!) stationaryIssues.push(problem("invalid-neutral-segments", `${trial.trialId} has missing, unordered, or overlapping settle/capture segments`));
    if (trial.settleTimestampsMs.at(-1)! - trial.settleTimestampsMs[0]! < 2000 || trial.captureTimestampsMs.at(-1)! - trial.captureTimestampsMs[0]! < 5000) stationaryIssues.push(problem("unproven-neutral-duration", `${trial.trialId} does not prove the frozen 2-second settle and 5-second capture durations`));
  }
  const transitionIssues: M0ESourceReadinessIssue[] = [];
  if (new Set(context.transitions.map((transition) => transition.transitionId)).size !== context.transitions.length) transitionIssues.push(problem("duplicate-transition-id", "transition IDs must be unique"));
  for (const transition of context.transitions) if (axisFor(transition.scenarioId) !== transition.axis || transition.timestampsMs.length < 2 || !monotonic(transition.timestampsMs)) transitionIssues.push(problem("invalid-transition-structure", `${transition.transitionId} has invalid scenario/axis mapping or timestamps`));
  for (const scenario of scenarios) if (!context.transitions.some((transition) => transition.scenarioId === scenario)) transitionIssues.push(problem("missing-transition-family", `${scenario} transition family is missing`));
  return Object.freeze({ sourceM0DRunId: source.sourceM0DRunId, sourceM0DPath: source.sourceM0DPath, m0dSchemaVersion: source.manifest.schemaVersion, m0dExperimentSpecVersion: source.manifest.experimentSpecVersion, m0dExperimentProcedureVersion: source.manifest.experimentProcedureVersion, m0dValidation: Object.freeze({ passed: source.validation.passed, validatorVersion: source.validation.validatorVersion }), selectedEstimator: Object.freeze({ id: source.manifest.estimatorA.estimatorId, configHash: source.manifest.estimatorA.configHash }), traceIds: Object.freeze(traceIds), traceContentHashes: Object.freeze(source.traceContentHashes ?? []), contentHashStatus: "unresolved-authority", replayAlignment: Object.freeze({ status: replayIssues.length ? "blocked" : "verified", issues: Object.freeze(replayIssues) }), calibration: Object.freeze({ x: calibrationReadiness(trace, "x"), y: calibrationReadiness(trace, "y"), z: calibrationReadiness(trace, "z") }), neutralStationary: Object.freeze({ status: stationaryIssues.length ? "not-proven-reusable" : "verified", trialIds: Object.freeze(context.stationaryTrials.map((trial) => trial.trialId)), issues: Object.freeze(stationaryIssues) }), motionTransitions: Object.freeze({ status: transitionIssues.length ? "not-proven-reusable" : "verified", transitionIds: Object.freeze(context.transitions.map((transition) => transition.transitionId)), issues: Object.freeze(transitionIssues) }) });
}

export function reconstructM0ESourceContext(trace: readonly M0DObservationTraceRecord[], replay: readonly SelectedEstimatorReplayRecord[], source?: M0ESourceBundle): M0ESourceContext {
  const grouped = new Map<string, { scenarioId: string; trialId: string; settle: number[]; capture: number[] }>();
  for (const row of trace) { const scenarioId = row.envelope.scenarioId; if (!["neutral-stationary", "near-stationary-450", "far-stationary-750"].includes(scenarioId) || typeof row.envelope.trialId !== "string") continue; const key = `${scenarioId}|${row.envelope.trialId}`; const group = grouped.get(key) ?? { scenarioId, trialId: row.envelope.trialId, settle: [], capture: [] }; if (row.envelope.stepKind === "settle") group.settle.push(row.observation.timestampMs); if (row.envelope.stepKind === "capture") group.capture.push(row.observation.timestampMs); grouped.set(key, group); }
  const stationary = [...grouped.values()].map((group) => Object.freeze({ trialId: group.trialId, scenarioId: group.scenarioId, settleTimestampsMs: Object.freeze(group.settle), captureTimestampsMs: Object.freeze(group.capture) }));
  const transitionMap = new Map<string, { transitionId: string; axis: M0ECalibrationAxis; scenarioId: M0EMotionTransitionWindow["scenarioId"]; cycleId?: string; targetMm?: number; timestampsMs: number[] }>();
  for (const row of trace) {
    const axis = axisFor(row.envelope.scenarioId);
    if (!axis || row.envelope.stepKind !== "transition" || !row.envelope.segmentId) continue;
    let transition = transitionMap.get(row.envelope.segmentId);
    if (!transition) {
      transition = { transitionId: row.envelope.segmentId, axis, scenarioId: row.envelope.scenarioId as M0EMotionTransitionWindow["scenarioId"], timestampsMs: [] };
      if (row.envelope.cycleId !== undefined) transition.cycleId = row.envelope.cycleId;
      if (typeof row.envelope.diagnostics.targetMm === "number") transition.targetMm = row.envelope.diagnostics.targetMm;
    }
    transition.timestampsMs.push(row.observation.timestampMs);
    transitionMap.set(row.envelope.segmentId, transition);
  }
  const context = Object.freeze({ validReplayRecords: Object.freeze(replay.filter((row) => row.valid)), invalidReplayRecords: Object.freeze(replay.filter((row) => !row.valid)), stationaryTrials: Object.freeze(stationary.filter((window) => window.scenarioId === "neutral-stationary")), nearFarStationaryWindows: Object.freeze(stationary.filter((window) => window.scenarioId !== "neutral-stationary")), transitions: Object.freeze([...transitionMap.values()].map((transition) => Object.freeze({ ...transition, timestampsMs: Object.freeze(transition.timestampsMs) }))) });
  return source ? Object.freeze({ ...context, readiness: makeReadiness(trace, replay, source) }) : context;
}
