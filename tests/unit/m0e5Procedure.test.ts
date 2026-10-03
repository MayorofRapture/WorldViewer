import { describe, expect, it } from "vitest";
import { advanceM0E5Runner, beginM0E5Initialization, beginM0E5ReplacementAttempt, confirmM0E5TargetReached, createM0E5Runner, invalidateM0E5Attempt, markM0E5Ready, startM0E5Runner } from "../../src/m0e/runner/m0e5Procedure";
import { buildM0E5ProcedureSteps } from "../../src/m0e/runner/m0e5Procedure";

describe("M0E5 recollection procedure", () => {
  it("contains exactly three X and Y cycles with mandatory center returns", () => {
    const steps = buildM0E5ProcedureSteps().filter((step) => step.kind === "transition");
    expect(steps.filter((step) => step.scenarioId === "lateral-movement").map((step) => step.targetMm)).toEqual([-150, 0, 150, 0, -150, 0, 150, 0, -150, 0, 150, 0]);
    expect(steps.filter((step) => step.scenarioId === "vertical-movement").map((step) => step.targetMm)).toEqual([-100, 0, 100, 0, -100, 0, 100, 0, -100, 0, 100, 0]);
    expect(new Set(steps.filter((step) => step.scenarioId === "lateral-movement").map((step) => step.cycleId)).size).toBe(3);
    expect(new Set(steps.filter((step) => step.scenarioId === "vertical-movement").map((step) => step.cycleId)).size).toBe(3);
  });
  it("contains exactly five frozen neutral trials with settle then capture", () => {
    const neutral = buildM0E5ProcedureSteps().filter((step) => step.scenarioId === "neutral-stationary");
    expect(neutral.map((step) => step.trialId)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5].map((trial) => `neutral-stationary-trial-${trial}`));
    expect(neutral.map((step) => [step.kind, step.durationMs])).toEqual(["settle", "capture", "settle", "capture", "settle", "capture", "settle", "capture", "settle", "capture"].map((kind, index) => [kind, index % 2 === 0 ? 2000 : 5000]));
  });
  it("excludes historical M0D scenarios", () => {
    const scenarios = new Set(buildM0E5ProcedureSteps().map((step) => step.scenarioId));
    expect(["approach-retreat", "near-stationary-450", "far-stationary-750", "natural-seated-motion", "partial-visibility-head-turn", "processing-cadence"]).not.toEqual(expect.arrayContaining([...scenarios]));
  });
  it("requires confirmation, advances neutral automatically, and links replacement attempts", () => {
    let state = createM0E5Runner("test-run"); state = beginM0E5Initialization(state); state = markM0E5Ready(state, { widthPx: 640, heightPx: 360, frameRate: 24 }); state = startM0E5Runner(state, 0); expect(state.steps[state.stepIndex]?.kind).toBe("transition"); state = confirmM0E5TargetReached(state, 10); expect(state.steps[state.stepIndex]?.kind).toBe("hold"); state = advanceM0E5Runner(state, 2010); expect(state.steps[state.stepIndex]?.kind).toBe("transition"); state = invalidateM0E5Attempt(state, "external-interruption", "interrupted"); expect(state.status).toBe("invalidated"); state = beginM0E5ReplacementAttempt(state, 3000); expect(state.status).toBe("running"); expect(state.proceduralInvalidations[0]?.replacementAttemptId).toBe(state.attemptId);
  });
});
