export const M0D_SCENARIO_IDS = [
  "calibration",
  "neutral-stationary",
  "near-stationary-450",
  "far-stationary-750",
  "lateral-movement",
  "vertical-movement",
  "approach-retreat",
  "natural-seated-motion",
  "partial-visibility-head-turn",
  "processing-cadence",
] as const;

export type M0DScenarioId = typeof M0D_SCENARIO_IDS[number];

export interface M0DScenarioDefinition {
  readonly id: M0DScenarioId;
  readonly category: "calibration" | "stationary" | "movement" | "natural-motion" | "partial-visibility" | "processing";
  readonly targetDepthMm: number | null;
  readonly settleSeconds: number | null;
  readonly captureSeconds: number | null;
  readonly trialCount: number | null;
  readonly cycleCount: number | null;
  readonly holdSeconds: number | null;
  readonly prescribedTargetsMm: readonly number[];
  readonly targetAxis: "x" | "y" | "z" | null;
}

export const M0D_SCENARIOS: readonly M0DScenarioDefinition[] = Object.freeze([
  { id: "calibration", category: "calibration", targetDepthMm: 600, settleSeconds: 2, captureSeconds: 3, trialCount: 1, cycleCount: null, holdSeconds: null, prescribedTargetsMm: [600], targetAxis: "z" },
  { id: "neutral-stationary", category: "stationary", targetDepthMm: 600, settleSeconds: 2, captureSeconds: 5, trialCount: 5, cycleCount: null, holdSeconds: null, prescribedTargetsMm: [600], targetAxis: "z" },
  { id: "near-stationary-450", category: "stationary", targetDepthMm: 450, settleSeconds: 2, captureSeconds: 5, trialCount: 3, cycleCount: null, holdSeconds: null, prescribedTargetsMm: [450], targetAxis: "z" },
  { id: "far-stationary-750", category: "stationary", targetDepthMm: 750, settleSeconds: 2, captureSeconds: 5, trialCount: 3, cycleCount: null, holdSeconds: null, prescribedTargetsMm: [750], targetAxis: "z" },
  { id: "lateral-movement", category: "movement", targetDepthMm: 600, settleSeconds: null, captureSeconds: null, trialCount: null, cycleCount: 3, holdSeconds: 2, prescribedTargetsMm: [-150, 0, 150], targetAxis: "x" },
  { id: "vertical-movement", category: "movement", targetDepthMm: 600, settleSeconds: null, captureSeconds: null, trialCount: null, cycleCount: 3, holdSeconds: 2, prescribedTargetsMm: [-100, 0, 100], targetAxis: "y" },
  { id: "approach-retreat", category: "movement", targetDepthMm: null, settleSeconds: null, captureSeconds: null, trialCount: null, cycleCount: 3, holdSeconds: 2, prescribedTargetsMm: [450, 600, 750, 600, 450], targetAxis: "z" },
  { id: "natural-seated-motion", category: "natural-motion", targetDepthMm: null, settleSeconds: null, captureSeconds: 30, trialCount: 1, cycleCount: null, holdSeconds: null, prescribedTargetsMm: [], targetAxis: null },
  { id: "partial-visibility-head-turn", category: "partial-visibility", targetDepthMm: 600, settleSeconds: null, captureSeconds: 15, trialCount: 1, cycleCount: null, holdSeconds: null, prescribedTargetsMm: [], targetAxis: null },
  { id: "processing-cadence", category: "processing", targetDepthMm: null, settleSeconds: null, captureSeconds: 60, trialCount: 1, cycleCount: null, holdSeconds: null, prescribedTargetsMm: [], targetAxis: null },
]);

export function getM0DScenario(id: string): M0DScenarioDefinition | null {
  return M0D_SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}

export const M0D_PROCEDURAL_INVALIDATION_REASONS = [
  "wrong-scenario-configuration",
  "wrong-camera-capture-mode",
  "capture-failed-incomplete-corrupt",
  "application-worker-crash",
  "operator-moved-during-stationary-settling",
  "target-position-materially-wrong",
  "validator-missing-required-fields",
  "external-interruption",
] as const;

export type M0DProceduralInvalidationReason = typeof M0D_PROCEDURAL_INVALIDATION_REASONS[number];

export interface M0DProceduralInvalidationRecord {
  readonly schemaVersion: 1;
  readonly invalidationId: string;
  readonly experimentRunId: string;
  readonly scenarioId: M0DScenarioId;
  readonly trialId: string | null;
  readonly attemptId: string;
  readonly originalAttemptId: string | null;
  readonly replacementAttemptId: string | null;
  readonly reason: M0DProceduralInvalidationReason;
  readonly detail: string;
}

export interface M0DAnomalyRecord {
  readonly schemaVersion: 1;
  readonly anomalyId: string;
  readonly experimentRunId: string;
  readonly scenarioId: M0DScenarioId;
  readonly trialId: string | null;
  readonly attemptId: string;
  readonly sequenceNumber: number | null;
  readonly estimatorId: string | null;
  readonly kind: string;
  readonly detail: string;
  readonly triggersRerun: false;
}

export function createProceduralInvalidation(
  input: Omit<M0DProceduralInvalidationRecord, "schemaVersion">,
): M0DProceduralInvalidationRecord {
  return Object.freeze({ schemaVersion: 1, ...input });
}

export function createAnomaly(
  input: Omit<M0DAnomalyRecord, "schemaVersion" | "triggersRerun">,
): M0DAnomalyRecord {
  return Object.freeze({ schemaVersion: 1, triggersRerun: false as const, ...input });
}
