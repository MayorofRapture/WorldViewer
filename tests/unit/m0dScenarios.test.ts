import { describe, expect, it } from "vitest";
import {
  M0D_PROCEDURAL_INVALIDATION_REASONS,
  M0D_SCENARIOS,
  createAnomaly,
  createProceduralInvalidation,
} from "../../src/m0d/scenarios/m0dScenarioModel";

describe("M0D frozen scenario model", () => {
  it("contains the complete frozen scenario timing and target matrix", () => {
    expect(M0D_SCENARIOS).toHaveLength(10);
    expect(M0D_SCENARIOS.find((scenario) => scenario.id === "neutral-stationary")).toMatchObject({ settleSeconds: 2, captureSeconds: 5, trialCount: 5, targetDepthMm: 600 });
    expect(M0D_SCENARIOS.find((scenario) => scenario.id === "lateral-movement")).toMatchObject({ cycleCount: 3, holdSeconds: 2, prescribedTargetsMm: [-150, 0, 150] });
    expect(M0D_SCENARIOS.find((scenario) => scenario.id === "processing-cadence")).toMatchObject({ captureSeconds: 60 });
  });

  it("keeps procedural invalidation reasons separate from non-rerun anomalies", () => {
    expect(M0D_PROCEDURAL_INVALIDATION_REASONS).toHaveLength(8);
    const invalidation = createProceduralInvalidation({ invalidationId: "inv-1", experimentRunId: "run", scenarioId: "neutral-stationary", unitId: "neutral-stationary-trial-1", trialId: "trial-1", attemptId: "attempt-1", originalAttemptId: null, replacementAttemptId: "attempt-2", reason: "external-interruption", detail: "operator stopped capture" });
    const anomaly = createAnomaly({ anomalyId: "anomaly-1", experimentRunId: "run", scenarioId: "neutral-stationary", trialId: "trial-1", attemptId: "attempt-2", sequenceNumber: 4, estimatorId: null, kind: "dropout", detail: "one missing frame" });
    expect(invalidation).not.toHaveProperty("triggersRerun");
    expect(anomaly.triggersRerun).toBe(false);
    expect(() => createProceduralInvalidation({ invalidationId: "inv-2", experimentRunId: "run", scenarioId: "neutral-stationary", unitId: "neutral-stationary-trial-1", trialId: "trial-1", attemptId: "attempt-3", originalAttemptId: null, replacementAttemptId: null, reason: "operator-moved-after-settling-during-stationary-capture", stationaryPhase: "settling", detail: "movement during settling" })).toThrow("only during stationary capture");
    expect(createProceduralInvalidation({ invalidationId: "inv-3", experimentRunId: "run", scenarioId: "neutral-stationary", unitId: "neutral-stationary-trial-1", trialId: "trial-1", attemptId: "attempt-4", originalAttemptId: null, replacementAttemptId: null, reason: "operator-moved-after-settling-during-stationary-capture", stationaryPhase: "capture", detail: "movement after settling" }).stationaryPhase).toBe("capture");
  });
});
