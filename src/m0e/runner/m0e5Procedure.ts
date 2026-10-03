import { createProceduralInvalidation, type M0DProceduralInvalidationRecord } from "../../m0d/scenarios/m0dScenarioModel";

export type M0E5StepKind = "transition" | "hold" | "settle" | "capture";
export type M0E5ScenarioId = "lateral-movement" | "vertical-movement" | "neutral-stationary";
export type M0E5TargetAxis = "x" | "y" | null;

export interface M0E5ProcedureStep {
  readonly stepId: string;
  readonly unitId: string;
  readonly scenarioId: M0E5ScenarioId;
  readonly kind: M0E5StepKind;
  readonly durationMs: number | null;
  readonly cycleNumber: number | null;
  readonly trialNumber: number | null;
  readonly cycleId: string | null;
  readonly trialId: string | null;
  readonly segmentId: string;
  readonly targetAxis: M0E5TargetAxis;
  readonly targetMm: number | null;
  readonly physicalInterpretation: string;
  readonly instruction: string;
}

const TARGETS = Object.freeze({ x: [-150, 0, 150, 0], y: [-100, 0, 100, 0] } as const);

function interpretation(axis: "x" | "y", target: number): string {
  if (target === 0) return "RETURN TO CENTER";
  if (axis === "x") return target < 0 ? "LEFT" : "RIGHT";
  return target < 0 ? "DOWN" : "UP";
}

function movementStep(axis: "x" | "y", cycle: number, target: number, ordinal: number, kind: "transition" | "hold"): M0E5ProcedureStep {
  const scenarioId = axis === "x" ? "lateral-movement" : "vertical-movement";
  const cycleId = `${scenarioId}-cycle-${cycle}`;
  const unitId = `${cycleId}-segment-${ordinal + 1}`;
  const physicalInterpretation = interpretation(axis, target);
  const instruction = target === 0
    ? "Return to CENTER, then press Ready."
    : `Move ${physicalInterpretation} ${Math.abs(target)} mm from center, then press Ready.`;
  return Object.freeze({ stepId: `${unitId}-${kind}`, unitId, scenarioId, kind, durationMs: kind === "hold" ? 2_000 : null, cycleNumber: cycle, trialNumber: null, cycleId, trialId: null, segmentId: unitId, targetAxis: axis, targetMm: target, physicalInterpretation, instruction: kind === "hold" ? `Hold ${physicalInterpretation} for 2 seconds.` : instruction });
}

function stationaryStep(trial: number, kind: "settle" | "capture"): M0E5ProcedureStep {
  const trialId = `neutral-stationary-trial-${trial}`;
  const unitId = trialId;
  const segmentId = `${trialId}-${kind}`;
  return Object.freeze({ stepId: segmentId, unitId, scenarioId: "neutral-stationary", kind, durationMs: kind === "settle" ? 2_000 : 5_000, cycleNumber: null, trialNumber: trial, cycleId: null, trialId, segmentId, targetAxis: null, targetMm: 0, physicalInterpretation: "CENTER", instruction: kind === "settle" ? "Remain at CENTER and settle." : "Remain at CENTER for stationary capture." });
}

export function buildM0E5ProcedureSteps(): readonly M0E5ProcedureStep[] {
  const steps: M0E5ProcedureStep[] = [];
  for (const axis of ["x", "y"] as const) for (let cycle = 1; cycle <= 3; cycle += 1) for (const [ordinal, target] of TARGETS[axis].entries()) steps.push(movementStep(axis, cycle, target, ordinal, "transition"), movementStep(axis, cycle, target, ordinal, "hold"));
  for (const trial of [1, 2, 3, 4, 5]) steps.push(stationaryStep(trial, "settle"), stationaryStep(trial, "capture"));
  return Object.freeze(steps);
}

export interface M0E5SegmentMarker { readonly marker: "start" | "end"; readonly monotonicMs: number; readonly stepId: string; readonly unitId: string; readonly attemptId: string; readonly scenarioId: M0E5ScenarioId; readonly kind: M0E5StepKind; readonly cycleId: string | null; readonly trialId: string | null; }
export type M0E5RunnerStatus = "idle" | "initializing" | "ready" | "running" | "invalidated" | "complete" | "cancelled" | "failed";
export interface M0E5RunnerState { readonly status: M0E5RunnerStatus; readonly runId: string; readonly attemptId: string; readonly attemptNumber: number; readonly stepIndex: number; readonly unitStartIndex: number; readonly stepStartedAtMs: number | null; readonly steps: readonly M0E5ProcedureStep[]; readonly markers: readonly M0E5SegmentMarker[]; readonly proceduralInvalidations: readonly M0DProceduralInvalidationRecord[]; readonly proceduralError: string | null; readonly actualCameraConfiguration: Readonly<{ widthPx: number | null; heightPx: number | null; frameRate: number | null }> | null; readonly cameraConfigurationVerified: boolean; }

function freeze(state: M0E5RunnerState): M0E5RunnerState { return Object.freeze({ ...state, markers: Object.freeze([...state.markers]), proceduralInvalidations: Object.freeze([...state.proceduralInvalidations]) }); }
export function createM0E5Runner(runId: string, steps = buildM0E5ProcedureSteps()): M0E5RunnerState { if (!runId.trim()) throw new RangeError("runId must be non-empty"); return freeze({ status: "idle", runId, attemptId: `${runId}-attempt-1`, attemptNumber: 1, stepIndex: 0, unitStartIndex: 0, stepStartedAtMs: null, steps: [...steps], markers: [], proceduralInvalidations: [], proceduralError: null, actualCameraConfiguration: null, cameraConfigurationVerified: false }); }
function marker(state: M0E5RunnerState, step: M0E5ProcedureStep, markerName: "start" | "end", time: number, attemptId = state.attemptId): M0E5SegmentMarker { return { marker: markerName, monotonicMs: time, stepId: step.stepId, unitId: step.unitId, attemptId, scenarioId: step.scenarioId, kind: step.kind, cycleId: step.cycleId, trialId: step.trialId }; }
export function beginM0E5Initialization(state: M0E5RunnerState): M0E5RunnerState { return state.status === "idle" ? freeze({ ...state, status: "initializing", proceduralError: null }) : state; }
export function markM0E5Ready(state: M0E5RunnerState, camera: M0E5RunnerState["actualCameraConfiguration"]): M0E5RunnerState { return state.status === "initializing" ? freeze({ ...state, status: "ready", actualCameraConfiguration: camera, cameraConfigurationVerified: true }) : state; }
export function failM0E5Runner(state: M0E5RunnerState, reason: string): M0E5RunnerState { return freeze({ ...state, status: "failed", proceduralError: reason }); }
export function startM0E5Runner(state: M0E5RunnerState, now: number): M0E5RunnerState { const step = state.steps[state.stepIndex]; return state.status !== "ready" ? state : step === undefined ? freeze({ ...state, status: "complete" }) : freeze({ ...state, status: "running", stepStartedAtMs: now, markers: [...state.markers, marker(state, step, "start", now)] }); }
export function confirmM0E5TargetReached(state: M0E5RunnerState, now: number): M0E5RunnerState { const current = state.steps[state.stepIndex]; const next = state.steps[state.stepIndex + 1]; return state.status !== "running" || current?.kind !== "transition" || next?.kind !== "hold" ? state : freeze({ ...state, stepIndex: state.stepIndex + 1, stepStartedAtMs: now, markers: [...state.markers, marker(state, current, "end", now), marker(state, next, "start", now)] }); }
export function advanceM0E5Runner(state: M0E5RunnerState, now: number): M0E5RunnerState { if (state.status !== "running" || state.stepStartedAtMs === null || now < state.stepStartedAtMs) return state; let next = state; while (next.status === "running" && next.stepStartedAtMs !== null) { const current = next.steps[next.stepIndex]; if (!current || current.durationMs === null || now < next.stepStartedAtMs + current.durationMs) break; const end = next.stepStartedAtMs + current.durationMs; const following = next.steps[next.stepIndex + 1]; next = following === undefined ? freeze({ ...next, status: "complete", stepIndex: next.stepIndex + 1, stepStartedAtMs: null, markers: [...next.markers, marker(next, current, "end", end)] }) : freeze({ ...next, stepIndex: next.stepIndex + 1, unitStartIndex: following.unitId === current.unitId ? next.unitStartIndex : next.stepIndex + 1, stepStartedAtMs: end, markers: [...next.markers, marker(next, current, "end", end), marker(next, following, "start", end)] }); } return next; }
export function currentM0E5Step(state: M0E5RunnerState): M0E5ProcedureStep | null { return state.steps[state.stepIndex] ?? null; }
export function cancelM0E5Runner(state: M0E5RunnerState, reason = "operator cancelled run"): M0E5RunnerState { return freeze({ ...state, status: "cancelled", proceduralError: reason }); }
export function invalidateM0E5Attempt(state: M0E5RunnerState, reason: "external-interruption" | "operator-moved-after-settling-during-stationary-capture", detail: string): M0E5RunnerState { const current = currentM0E5Step(state); if (!current || state.status !== "running") return state; const invalidation = createProceduralInvalidation({ invalidationId: `${state.runId}-invalidation-${state.proceduralInvalidations.length + 1}`, experimentRunId: state.runId, scenarioId: current.scenarioId, unitId: current.unitId, trialId: current.trialId, attemptId: state.attemptId, originalAttemptId: null, replacementAttemptId: null, reason, ...(reason === "operator-moved-after-settling-during-stationary-capture" ? { stationaryPhase: "capture" as const } : {}), detail }); return freeze({ ...state, status: "invalidated", proceduralInvalidations: [...state.proceduralInvalidations, invalidation], proceduralError: detail }); }
export function beginM0E5ReplacementAttempt(state: M0E5RunnerState, now: number): M0E5RunnerState { if (state.status !== "invalidated") return state; const attemptNumber = state.attemptNumber + 1; const attemptId = `${state.runId}-attempt-${attemptNumber}`; const invalidations = state.proceduralInvalidations.map((item) => item.replacementAttemptId === null && item.attemptId === state.attemptId ? { ...item, replacementAttemptId: attemptId } : item); const next = freeze({ ...state, status: "running", attemptId, attemptNumber, stepIndex: state.unitStartIndex, stepStartedAtMs: now, proceduralError: null, proceduralInvalidations: invalidations }); const current = next.steps[next.unitStartIndex]; return current ? freeze({ ...next, markers: [...next.markers, marker(next, current, "start", now, attemptId)] }) : freeze({ ...next, status: "complete", stepStartedAtMs: null }); }
