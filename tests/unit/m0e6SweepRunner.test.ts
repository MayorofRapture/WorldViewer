import { describe, expect, it } from "vitest";
import { enumerateOneEuroGrid } from "../../src/m0e/analysis/filterMetrics";
import { M0E6_REQUIRED_NEUTRAL_TRIAL_IDS, M0E6InputValidationError, runM0E6DevelopmentSweep, serializeM0E6DevelopmentResult, type M0E6SweepInput } from "../../src/m0e/runner/m0e6SweepRunner";

const pose = (timestampMs: number, x = 0, y = 0, z = 600) => ({ timestampMs, positionMm: { x, y, z } });

function input(): M0E6SweepInput {
  return {
    authority: "fixture",
    stationaryTrials: M0E6_REQUIRED_NEUTRAL_TRIAL_IDS.map((trialId, index) => ({ trialId, settle: [pose(index * 100 + 1)], capture: [pose(index * 100 + 2), pose(index * 100 + 3)] })),
    transitions: [{ transitionId: "x-transition-1", axis: "x", start: 0, final: 10, samples: [pose(1000, 0), pose(1010, 6), pose(1020, 10), pose(1030, 10), pose(1040, 10)] .map((sample, index) => ({ ...sample, input: index === 0 ? 0 : 10 })) }],
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
    expect(result.candidates.every((candidate) => candidate.transitionReplayInputs?.map((transition) => transition.transitionId).join() === "x-transition-1")).toBe(true);
  });
});
