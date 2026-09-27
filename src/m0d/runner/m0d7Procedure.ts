import {
  M0D_SCENARIOS,
  type M0DProceduralInvalidationRecord,
  type M0DScenarioId,
} from "../scenarios/m0dScenarioModel";

export type M0D7StepKind = "settle" | "capture" | "transition" | "hold";

export interface M0D7ProcedureStep {
  readonly stepId: string;
  readonly unitId: string;
  readonly scenarioId: M0DScenarioId;
  readonly kind: M0D7StepKind;
  readonly durationMs: number | null;
  readonly trialNumber: number | null;
  readonly cycleNumber: number | null;
  readonly trialId: string | null;
  readonly cycleId: string | null;
  readonly holdId: string | null;
  readonly targetAxis: "x" | "y" | "z" | null;
  readonly targetMm: number | null;
  readonly instruction: string;
}

function step(
  scenarioId: M0DScenarioId,
  kind: M0D7StepKind,
  durationMs: number,
  trialNumber: number | null,
  cycleNumber: number | null,
  targetMm: number | null,
  instruction: string,
): M0D7ProcedureStep {
  const scenario = M0D_SCENARIOS.find((candidate) => candidate.id === scenarioId)!;
  return Object.freeze({
    stepId: `${scenarioId}-${kind}-${trialNumber ?? cycleNumber ?? 1}-${targetMm ?? "neutral"}`,
    unitId: `${scenarioId}-${trialNumber ?? cycleNumber ?? 1}-${targetMm ?? "neutral"}`,
    scenarioId,
    kind,
    durationMs,
    trialNumber,
    cycleNumber,
    trialId: trialNumber === null ? null : `${scenarioId}-trial-${trialNumber}`,
    cycleId: cycleNumber === null ? null : `${scenarioId}-cycle-${cycleNumber}`,
    holdId: kind === "capture" || kind === "hold" ? `${scenarioId}-${trialNumber ?? cycleNumber ?? 1}-${targetMm ?? "neutral"}` : null,
    targetAxis: scenario.targetAxis,
    targetMm,
    instruction,
  });
}

function stationarySteps(scenarioId: "neutral-stationary" | "near-stationary-450" | "far-stationary-750", trialCount: number, targetMm: number): M0D7ProcedureStep[] {
  const result: M0D7ProcedureStep[] = [];
  for (let trial = 1; trial <= trialCount; trial += 1) {
    result.push(step(scenarioId, "settle", 2_000, trial, null, targetMm, `Move to ${targetMm} mm depth and hold still while settling.`));
    result.push(step(scenarioId, "capture", 5_000, trial, null, targetMm, `Hold the ${targetMm} mm stationary target for capture.`));
  }
  return result;
}

function movementSteps(scenarioId: "lateral-movement" | "vertical-movement" | "approach-retreat", targets: readonly number[], cycles: number): M0D7ProcedureStep[] {
  const result: M0D7ProcedureStep[] = [];
  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    for (let ordinal = 0; ordinal < targets.length; ordinal += 1) {
      const target = targets[ordinal];
      if (target === undefined) continue;
      const unitId = `${scenarioId}-cycle-${cycle}-hold-${ordinal + 1}`;
      const base = step(scenarioId, "hold", 2_000, null, cycle, target, `Hold the ${target} mm target for 2 seconds.`);
      const hold = Object.freeze({ ...base, stepId: `${unitId}-hold`, unitId, holdId: unitId });
      const transition = Object.freeze({ ...base, stepId: `${unitId}-transition`, unitId, kind: "transition" as const, durationMs: null, holdId: unitId, instruction: `Move continuously to the ${target} mm target, then press Ready.` });
      result.push(transition, hold);
    }
  }
  return result;
}

export function buildM0D7ProcedureSteps(): readonly M0D7ProcedureStep[] {
  const steps = [
    step("calibration", "settle", 2_000, 1, null, 600, "Move to 600 mm depth and hold still while settling."),
    step("calibration", "capture", 3_000, 1, null, 600, "Hold the 600 mm calibration target for capture."),
    ...stationarySteps("neutral-stationary", 5, 600),
    ...stationarySteps("near-stationary-450", 3, 450),
    ...stationarySteps("far-stationary-750", 3, 750),
    ...movementSteps("lateral-movement", [-150, 0, 150], 3),
    ...movementSteps("vertical-movement", [-100, 0, 100], 3),
    ...movementSteps("approach-retreat", [450, 600, 750, 600, 450], 3),
    step("natural-seated-motion", "capture", 30_000, 1, null, null, "Remain seated and move naturally."),
    step("partial-visibility-head-turn", "capture", 15_000, 1, null, 600, "Remain near neutral and turn left/right approximately 25–30 degrees."),
    step("processing-cadence", "capture", 60_000, 1, null, null, "Remain seated with light natural motion."),
  ];
  return Object.freeze(steps);
}

export interface M0D7SegmentMarker {
  readonly marker: "start" | "end";
  readonly monotonicMs: number;
  readonly stepId: string;
  readonly unitId: string;
  readonly attemptId: string;
  readonly scenarioId: M0DScenarioId;
  readonly trialNumber: number | null;
  readonly cycleNumber: number | null;
  readonly trialId: string | null;
  readonly cycleId: string | null;
  readonly holdId: string | null;
  readonly kind: M0D7StepKind;
}

export interface M0D7AnomalyReference {
  readonly anomalyId: string;
  readonly scenarioId: M0DScenarioId;
  readonly attemptId: string;
  readonly detail: string;
}

export type M0D7RunnerStatus = "idle" | "initializing" | "ready" | "running" | "invalidated" | "complete" | "cancelled" | "failed";

export interface M0D7RunnerState {
  readonly status: M0D7RunnerStatus;
  readonly runId: string;
  readonly attemptId: string;
  readonly attemptNumber: number;
  readonly stepIndex: number;
  readonly unitStartIndex: number;
  readonly stepStartedAtMs: number | null;
  readonly steps: readonly M0D7ProcedureStep[];
  readonly markers: readonly M0D7SegmentMarker[];
  readonly proceduralInvalidations: readonly M0DProceduralInvalidationRecord[];
  readonly anomalies: readonly M0D7AnomalyReference[];
  readonly proceduralError: string | null;
  readonly actualCameraConfiguration: Readonly<{ widthPx: number | null; heightPx: number | null; frameRate: number | null }> | null;
}

function freezeState(state: M0D7RunnerState): M0D7RunnerState {
  return Object.freeze({ ...state, markers: Object.freeze([...state.markers]), proceduralInvalidations: Object.freeze([...state.proceduralInvalidations]), anomalies: Object.freeze([...state.anomalies]) });
}

export function createM0D7Runner(runId: string, steps: readonly M0D7ProcedureStep[] = buildM0D7ProcedureSteps()): M0D7RunnerState {
  if (runId.trim().length === 0) throw new RangeError("runId must be non-empty");
  return freezeState({ status: "idle", runId, attemptId: `${runId}-attempt-1`, attemptNumber: 1, stepIndex: 0, unitStartIndex: 0, stepStartedAtMs: null, steps: [...steps], markers: [], proceduralInvalidations: [], anomalies: [], proceduralError: null, actualCameraConfiguration: null });
}

export function beginM0D7Initialization(state: M0D7RunnerState): M0D7RunnerState {
  return state.status === "idle" ? freezeState({ ...state, status: "initializing", proceduralError: null }) : state;
}

export function markM0D7Ready(state: M0D7RunnerState, actualCameraConfiguration: M0D7RunnerState["actualCameraConfiguration"]): M0D7RunnerState {
  return state.status === "initializing" ? freezeState({ ...state, status: "ready", actualCameraConfiguration }) : state;
}

function segmentMarker(state: M0D7RunnerState, current: M0D7ProcedureStep, marker: "start" | "end", monotonicMs: number, attemptId = state.attemptId): M0D7SegmentMarker {
  return { marker, monotonicMs, stepId: current.stepId, unitId: current.unitId, attemptId, scenarioId: current.scenarioId, kind: current.kind, trialNumber: current.trialNumber, cycleNumber: current.cycleNumber, trialId: current.trialId, cycleId: current.cycleId, holdId: current.holdId };
}

export function startM0D7Runner(state: M0D7RunnerState, nowMs: number): M0D7RunnerState {
  if (state.status !== "ready") return state;
  const current = state.steps[state.stepIndex];
  if (current === undefined) return freezeState({ ...state, status: "complete", stepStartedAtMs: null });
  return freezeState({ ...state, status: "running", stepStartedAtMs: nowMs, proceduralError: null, markers: [...state.markers, segmentMarker(state, current, "start", nowMs)] });
}

export function confirmM0D7TargetReached(state: M0D7RunnerState, nowMs: number): M0D7RunnerState {
  if (state.status !== "running" || state.stepStartedAtMs === null) return state;
  const current = state.steps[state.stepIndex];
  const hold = state.steps[state.stepIndex + 1];
  if (current?.kind !== "transition" || hold?.kind !== "hold") return state;
  return freezeState({ ...state, stepIndex: state.stepIndex + 1, stepStartedAtMs: nowMs, markers: [...state.markers, segmentMarker(state, current, "end", nowMs), segmentMarker(state, hold, "start", nowMs)] });
}

export function advanceM0D7Runner(state: M0D7RunnerState, nowMs: number): M0D7RunnerState {
  if (state.status !== "running" || state.stepStartedAtMs === null || nowMs < state.stepStartedAtMs) return state;
  let next = state;
  while (next.status === "running" && next.stepStartedAtMs !== null) {
    const current = next.steps[next.stepIndex];
    if (current === undefined || current.durationMs === null || nowMs < next.stepStartedAtMs + current.durationMs) break;
    const endAt = next.stepStartedAtMs + current.durationMs;
    const endMarker = segmentMarker(next, current, "end", endAt);
    const nextIndex = next.stepIndex + 1;
    const nextStep = next.steps[nextIndex];
    next = nextStep === undefined
      ? freezeState({ ...next, status: "complete", stepIndex: nextIndex, stepStartedAtMs: null, markers: [...next.markers, endMarker] })
      : freezeState({ ...next, stepIndex: nextIndex, unitStartIndex: nextStep.unitId === current.unitId ? next.unitStartIndex : nextIndex, stepStartedAtMs: endAt, markers: [...next.markers, endMarker, segmentMarker(next, nextStep, "start", endAt)] });
  }
  return next;
}

export function currentM0D7Step(state: M0D7RunnerState): M0D7ProcedureStep | null {
  return state.steps[state.stepIndex] ?? null;
}

export function cancelM0D7Runner(state: M0D7RunnerState, reason = "operator cancelled run"): M0D7RunnerState {
  return freezeState({ ...state, status: "cancelled", proceduralError: reason });
}

export function failM0D7Runner(state: M0D7RunnerState, reason: string): M0D7RunnerState {
  return freezeState({ ...state, status: "failed", proceduralError: reason });
}

export function recordM0D7Anomaly(state: M0D7RunnerState, anomaly: M0D7AnomalyReference): M0D7RunnerState {
  return freezeState({ ...state, anomalies: [...state.anomalies, anomaly] });
}

export function invalidateM0D7Attempt(state: M0D7RunnerState, invalidation: M0DProceduralInvalidationRecord): M0D7RunnerState {
  if (invalidation.attemptId !== state.attemptId) throw new RangeError("invalidation attemptId must match the active attempt");
  return freezeState({ ...state, status: "invalidated", proceduralInvalidations: [...state.proceduralInvalidations, invalidation], proceduralError: invalidation.detail });
}

export function beginM0D7ReplacementAttempt(state: M0D7RunnerState, nowMs: number): M0D7RunnerState {
  if (state.status !== "invalidated") return state;
  const attemptNumber = state.attemptNumber + 1;
  const attemptId = `${state.runId}-attempt-${attemptNumber}`;
  const invalidations = state.proceduralInvalidations.map((record) => record.replacementAttemptId === null && record.attemptId === state.attemptId ? { ...record, replacementAttemptId: attemptId } : record);
  const next = freezeState({ ...state, status: "running", attemptId, attemptNumber, stepIndex: state.unitStartIndex, stepStartedAtMs: nowMs, proceduralError: null, proceduralInvalidations: invalidations });
  const current = next.steps[next.unitStartIndex];
  return current === undefined ? freezeState({ ...next, status: "complete", stepStartedAtMs: null }) : freezeState({ ...next, markers: [...next.markers, segmentMarker(next, current, "start", nowMs, attemptId)] });
}
