import { describe, expect, it } from "vitest";
import {
  advanceM0D7Runner,
  beginM0D7ReplacementAttempt,
  buildM0D7ProcedureSteps,
  createM0D7Runner,
  beginM0D7Initialization,
  confirmM0D7TargetReached,
  invalidateM0D7Attempt,
  markM0D7Ready,
  startM0D7Runner,
} from "../../src/m0d/runner/m0d7Procedure";
import { createProceduralInvalidation } from "../../src/m0d/scenarios/m0dScenarioModel";

describe("M0D7 frozen live procedure", () => {
  it("materializes the exact ordered timing and target matrix", () => {
    const steps = buildM0D7ProcedureSteps();
    expect(steps).toHaveLength(93);
    expect(steps.slice(0, 2).map((step) => [step.kind, step.durationMs])).toEqual([["settle", 2000], ["capture", 3000]]);
    expect(steps.filter((step) => step.scenarioId === "neutral-stationary" && step.kind === "capture")).toHaveLength(5);
    expect(steps.filter((step) => step.scenarioId === "near-stationary-450" && step.kind === "capture")).toHaveLength(3);
    expect(steps.filter((step) => step.scenarioId === "far-stationary-750" && step.kind === "capture")).toHaveLength(3);
    expect(steps.filter((step) => step.scenarioId === "lateral-movement" && step.kind === "hold").map((step) => step.targetMm)).toEqual([-150, 0, 150, -150, 0, 150, -150, 0, 150]);
    expect(steps.slice(-3).map((step) => step.durationMs)).toEqual([30000, 15000, 60000]);
  });

  it("creates deterministic automatic markers across a time jump", () => {
    const steps = buildM0D7ProcedureSteps().slice(0, 3);
    let state = markM0D7Ready(beginM0D7Initialization(createM0D7Runner("run", steps)), { widthPx: 640, heightPx: 360, frameRate: 24 });
    state = startM0D7Runner(state, 100);
    state = advanceM0D7Runner(state, 2100);
    expect(state.stepIndex).toBe(1);
    expect(state.markers.map((marker) => marker.marker)).toEqual(["start", "end", "start"]);
    state = advanceM0D7Runner(state, 8100);
    expect(state.status).toBe("complete");
    expect(state.markers.at(-1)?.marker).toBe("end");
  });

  it("retains an invalid attempt and gives the replacement a new identity", () => {
    const steps = buildM0D7ProcedureSteps().slice(0, 2);
    let state = markM0D7Ready(beginM0D7Initialization(createM0D7Runner("run", steps)), { widthPx: 640, heightPx: 360, frameRate: 24 });
    state = startM0D7Runner(state, 0);
    state = invalidateM0D7Attempt(state, createProceduralInvalidation({ invalidationId: "inv-1", experimentRunId: "run", scenarioId: "calibration", trialId: null, attemptId: "run-attempt-1", originalAttemptId: null, replacementAttemptId: null, reason: "external-interruption", detail: "operator stopped the attempt" }));
    expect(state.status).toBe("invalidated");
    state = beginM0D7ReplacementAttempt(state, 50);
    expect(state.status).toBe("running");
    expect(state.attemptId).toBe("run-attempt-2");
    expect(state.proceduralInvalidations[0]?.replacementAttemptId).toBe("run-attempt-2");
  });

  it("requires an explicit Ready confirmation for movement holds", () => {
    const movement = buildM0D7ProcedureSteps().findIndex((step) => step.kind === "transition");
    let state = markM0D7Ready(beginM0D7Initialization(createM0D7Runner("run")), { widthPx: 640, heightPx: 360, frameRate: 24 });
    state = { ...state, stepIndex: movement, unitStartIndex: movement };
    state = startM0D7Runner(state, 0);
    expect(state.steps[state.stepIndex]?.kind).toBe("transition");
    const confirmed = confirmM0D7TargetReached(state, 500);
    expect(confirmed.steps[confirmed.stepIndex]?.kind).toBe("hold");
  });
});
