import { describe, expect, it } from "vitest";
import { enumerateOneEuroGrid, nearestRankPercentile } from "../../src/m0e/analysis/filterMetrics";
import { buildM0E6DevelopmentShortlist, M0E6_REQUIRED_NEUTRAL_TRIAL_IDS, M0E6InputValidationError, runM0E6DevelopmentSweep, serializeM0E6DevelopmentResult, type M0E6SweepInput } from "../../src/m0e/runner/m0e6SweepRunner";

const pose = (timestampMs: number, x = 0, y = 0, z = 600) => ({ timestampMs, positionMm: { x, y, z } });

function input(): M0E6SweepInput {
  return {
    authority: "fixture",
    stationaryTrials: M0E6_REQUIRED_NEUTRAL_TRIAL_IDS.map((trialId, index) => ({ trialId, settle: [pose(index * 100 + 1)], capture: [pose(index * 100 + 2), pose(index * 100 + 3)] })),
    transitions: [transition("x-transition-1", 1000)],
  };
}

function inputWithTransitions(transitions: M0E6SweepInput["transitions"]): M0E6SweepInput {
  return { ...input(), transitions };
}

function transition(transitionId: string, offset: number, sourceInvalidationReason?: "source-procedural-invalidation", inputCrossingIndex = 1): M0E6SweepInput["transitions"][number] {
  return {
    transitionId,
    axis: "x",
    start: 0,
    final: 10,
    ...(sourceInvalidationReason === undefined ? {} : { sourceInvalidationReason }),
    samples: Array.from({ length: 241 }, (_, index) => ({ ...pose(offset + index * 10, index === 0 ? 0 : 10), input: index < inputCrossingIndex ? 0 : 10 })),
  };
}

describe("M0E6 development sweep runner", () => {
  it("executes exactly the frozen 25 candidates in stable order and is deterministic", () => {
    const first = runM0E6DevelopmentSweep(input());
    const second = runM0E6DevelopmentSweep(input());
    expect(first.candidateConfigurations).toEqual(enumerateOneEuroGrid());
    expect(first.candidates).toHaveLength(25);
    expect(first).toEqual(second);
    expect(serializeM0E6DevelopmentResult(first)).toBe(serializeM0E6DevelopmentResult(second));
  });

  it("requires the complete frozen neutral trial identity set and rejects malformed input", () => {
    const malformed = { ...input(), stationaryTrials: input().stationaryTrials.slice(1) };
    expect(() => runM0E6DevelopmentSweep(malformed)).toThrow(M0E6InputValidationError);
  });

  it("is explicitly development-only and preserves all candidate transition identities", () => {
    const result = runM0E6DevelopmentSweep(input());
    expect(result).toMatchObject({ authority: "fixture", claimBearing: false, finalFilterSelection: "not-performed", m0e7: "not-started", m0e8: "not-started" });
    expect(result.candidates).toHaveLength(25);
    expect(result.transitionReplayInputs.map((transition) => transition.transitionId)).toEqual(["x-transition-1"]);
  });

  it("propagates nearest-rank p95 lag from the candidate's evaluable transition results", () => {
    const result = runM0E6DevelopmentSweep(inputWithTransitions([transition("x-transition-1", 1000, undefined, 1), transition("x-transition-2", 2000, undefined, 20)]));
    const candidate = result.candidates[0]!;
    const lags = candidate.transitionResults?.filter((entry): entry is Extract<typeof entry, { status: "evaluable" }> => entry.status === "evaluable").map((entry) => entry.lagMs) ?? [];
    expect(lags.length).toBe(2);
    expect(new Set(lags).size).toBe(2);
    expect(candidate.p95LagMs).toBe(nearestRankPercentile(lags, 0.95));
    expect(candidate.p95LagMs).toBe(candidate.lagSummary.p95LagMs);
  });

  it("retains candidate-specific filtered stationary replay outputs for all five neutral trials", () => {
    const sourceTrials = M0E6_REQUIRED_NEUTRAL_TRIAL_IDS.map((trialId, index) => ({
      trialId,
      settle: [pose(index * 100 + 1, 0), pose(index * 100 + 2, 1), pose(index * 100 + 3, -1)],
      capture: [pose(index * 100 + 4, 2), pose(index * 100 + 5, -2), pose(index * 100 + 6, 3), pose(index * 100 + 7, 0)],
    }));
    const result = runM0E6DevelopmentSweep({ ...input(), stationaryTrials: sourceTrials });
    const candidate = result.candidates[0]!;
    const outputs = candidate.stationaryReplayOutputs ?? [];

    expect(outputs).toHaveLength(5);
    expect(outputs.map((trial) => trial.trialId)).toEqual([...M0E6_REQUIRED_NEUTRAL_TRIAL_IDS]);
    expect(outputs.every((trial) => trial.settle.length > 0 && trial.capture.length > 0)).toBe(true);
    expect(outputs.some((trial, index) => JSON.stringify(trial) !== JSON.stringify(sourceTrials[index]))).toBe(true);
    expect(result.candidates.every((entry) => entry.stationaryReplayOutputs?.length === 5)).toBe(true);
  });

  it("produces an ordinary shortlist when a candidate has finite jitter and lag objectives", () => {
    const result = runM0E6DevelopmentSweep(input());
    expect(result.frontierStatus).toBe("shortlist");
    expect(result.paretoFrontier.length).toBeGreaterThanOrEqual(1);
    expect(result.paretoFrontier.length).toBeLessThanOrEqual(6);
  });

  it("keeps non-evaluable transitions visible and returns no shortlist when lag is unavailable", () => {
    const result = runM0E6DevelopmentSweep(inputWithTransitions([transition("x-invalid", 1000, "source-procedural-invalidation")]));
    expect(result.frontierStatus).toBe("no-shortlist");
    expect(result.paretoFrontier).toHaveLength(0);
    expect(result.candidates[0]?.transitionResults?.[0]).toMatchObject({ status: "non-evaluable", reason: "source-procedural-invalidation" });
  });

  it("rejects non-finite prepared input before execution rather than misclassifying it", () => {
    const malformed = inputWithTransitions([{ ...transition("x-invalid-input", 1000), samples: [{ ...transition("x-invalid-input", 1000).samples[0]!, input: Number.NaN }] }]);
    expect(() => runM0E6DevelopmentSweep(malformed)).toThrow(M0E6InputValidationError);
  });

  it("supports the stronger-review frontier state through the runner shortlist boundary", () => {
    const result = runM0E6DevelopmentSweep(input());
    const candidates = result.candidates.slice(0, 7).map((candidate, index) => ({ ...candidate, eligible: true, jitterObjective: index + 1, p95LagMs: 7 - index, lagSummary: { ...candidate.lagSummary, p95LagMs: 7 - index } }));
    const shortlist = buildM0E6DevelopmentShortlist(candidates);
    expect(shortlist.status).toBe("requires-stronger-review");
    expect(shortlist.frontier.length).toBeGreaterThan(6);
  });

  it("preserves typed source replay inputs and gives every candidate identical transition inputs", () => {
    const source = transition("x-source", 1000);
    const result = runM0E6DevelopmentSweep(inputWithTransitions([source]));
    expect(result.transitionReplayInputs).toEqual([source]);
    const inputShapes = result.candidates.map(() => result.transitionReplayInputs.map((entry) => ({ transitionId: entry.transitionId, axis: entry.axis, start: entry.start, final: entry.final, samples: entry.samples.map((sample) => ({ timestampMs: sample.timestampMs, input: sample.input, positionMm: sample.positionMm })) })));
    expect(inputShapes.every((shape) => JSON.stringify(shape) === JSON.stringify(inputShapes[0]))).toBe(true);
    expect(result.transitionReplayInputs[0]?.samples[0]?.positionMm).toEqual(source.samples[0]?.positionMm);
  });
});
