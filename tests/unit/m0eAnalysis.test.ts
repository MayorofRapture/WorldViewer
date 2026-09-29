import { describe, expect, it } from "vitest";
import { fitRelativeAxis, fitZAxisInitial, fitZAxisLeastSquares } from "../../src/m0e/analysis/calibrationAnalysis";
import { buildShortlist, calculateStationaryTrialMetric, calculateTransitionMetric, enumerateOneEuroGrid, nearestRankPercentile, objectiveForCandidate } from "../../src/m0e/analysis/filterMetrics";

describe("M0E frozen analysis primitives", () => {
  it("fits X/Y relative displacement and preserves an identity-passing axis", () => {
    const fit = fitRelativeAxis("x", [
      { cycleId: "1", targetDisplacementMm: -150, measuredTargetMm: -150, measuredCenterMm: 5 },
      { cycleId: "2", targetDisplacementMm: 150, measuredTargetMm: 155, measuredCenterMm: 5 },
    ]);
    expect(fit.decision).toBe("identity-adequate");
    expect(fit.scale).toBe(1);
    expect(fit.offset).toBe(0);
  });

  it("supports fitted Z and the frozen least-squares formula", () => {
    const observations = [
      { holdId: "450-1", targetMm: 450 as const, measuredMm: 400 },
      { holdId: "600-1", targetMm: 600 as const, measuredMm: 500 },
      { holdId: "750-1", targetMm: 750 as const, measuredMm: 600 },
    ];
    expect(fitZAxisInitial(observations)).toMatchObject({ scale: 1.5, offset: -150, decision: "fitted-correction-supported" });
    expect(fitZAxisLeastSquares(observations)).toEqual({ scale: 1.5, offset: -150 });
  });

  it("implements settling RMS, nearest-rank percentiles, lag, overshoot, and discontinuity", () => {
    const stationary = calculateStationaryTrialMetric({ trialId: "neutral-1", settle: [{ x: 0, y: 0, z: 600 }], capture: [{ x: 0, y: 0, z: 600 }, { x: 2, y: 0, z: 604 }] });
    expect(stationary.rms.x).toBe(1);
    expect(stationary.rms.z).toBe(2);
    expect(nearestRankPercentile([1, 2, 3, 4], 0.95)).toBe(4);
    const transition = calculateTransitionMetric({ transitionId: "x-1", axis: "x", start: 0, final: 10, samples: [
      { timestampMs: 0, input: 6, output: 0, filteredPositionMm: { x: 0, y: 0, z: 600 } },
      { timestampMs: 10, input: 8, output: 4, filteredPositionMm: { x: 4, y: 0, z: 600 } },
      { timestampMs: 20, input: 10, output: 6, filteredPositionMm: { x: 6, y: 0, z: 600 } },
      { timestampMs: 30, input: 10, output: 12, filteredPositionMm: { x: 12, y: 0, z: 600 } },
      { timestampMs: 40, input: 10, output: 11, filteredPositionMm: { x: 11, y: 0, z: 600 } },
    ] });
    expect(transition.lagMs).toBe(20);
    expect(transition.overshootMm).toBe(2);
    expect(transition.discontinuityMm).toContain(6);
  });

  it("enumerates exactly 25 candidates and applies Pareto shortlist rules", () => {
    const grid = enumerateOneEuroGrid();
    expect(grid).toHaveLength(25);
    const trials = Array.from({ length: 5 }, (_, index) => ({ trialId: `trial-${index}`, rms: { x: 1, y: 1, z: 2 }, eligible: true }));
    const dominated = objectiveForCandidate(grid[0]!, trials, 100);
    const frontier = objectiveForCandidate(grid[1]!, trials, 80);
    expect(buildShortlist([dominated, frontier]).frontier).toEqual([frontier]);
  });
});
