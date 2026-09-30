import { describe, expect, it } from "vitest";
import { fitRelativeAxis, fitZAxisInitial, fitZAxisLeastSquares } from "../../src/m0e/analysis/calibrationAnalysis";
import { buildShortlist, calculateStationaryTrialMetric, calculateTransitionMetric, enumerateOneEuroGrid, evaluateTransition, nearestRankPercentile, objectiveForCandidate } from "../../src/m0e/analysis/filterMetrics";
import { runOneEuroCandidate } from "../../src/m0e/analysis/sweep";
import { createDefaultCalibrationProfile } from "../../src/shared/contracts/calibration";

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

  it("does not let opposite target errors cancel into identity", () => {
    const fit = fitRelativeAxis("x", [
      ...[-150, -150, -150].map((targetDisplacementMm, index) => ({ cycleId: `negative-${index}`, targetDisplacementMm, measuredTargetMm: -300, measuredCenterMm: 0 })),
      ...[150, 150, 150].map((targetDisplacementMm, index) => ({ cycleId: `positive-${index}`, targetDisplacementMm, measuredTargetMm: 300, measuredCenterMm: 0 })),
    ]);
    expect(fit.decision).not.toBe("identity-adequate");
    expect(fit.targetEvidence).toHaveLength(2);
    expect(fit.identityTargetEvidence?.every((group) => Math.abs(group.residual.medianSigned) > 20)).toBe(true);
  });

  it("classifies unstable repeatability separately from model escalation", () => {
    const fit = fitRelativeAxis("x", [
      { cycleId: "negative-1", targetDisplacementMm: -150, measuredTargetMm: -150, measuredCenterMm: 0 },
      { cycleId: "negative-2", targetDisplacementMm: -150, measuredTargetMm: -150, measuredCenterMm: 100 },
      { cycleId: "positive-1", targetDisplacementMm: 150, measuredTargetMm: 150, measuredCenterMm: 0 },
      { cycleId: "positive-2", targetDisplacementMm: 150, measuredTargetMm: 150, measuredCenterMm: 100 },
    ]);
    expect(fit.decision).toBe("inconclusive-collection-repeatability-problem");
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

  it("returns the final Z least-squares fit after held-out support", () => {
    const observations = [
      ...[400, 400, 400].map((measuredMm, index) => ({ holdId: `450-${index}`, targetMm: 450 as const, measuredMm })),
      ...[500, 500, 500].map((measuredMm, index) => ({ holdId: `600-${index}`, targetMm: 600 as const, measuredMm })),
      ...[600, 620, 620].map((measuredMm, index) => ({ holdId: `750-${index}`, targetMm: 750 as const, measuredMm })),
    ];
    const initial = fitZAxisInitial(observations);
    const final = fitZAxisLeastSquares(observations);
    expect(final.scale).not.toBeCloseTo(300 / 220);
    expect(initial.decision).toBe("fitted-correction-supported");
    expect(initial.scale).toBe(final.scale);
    expect(initial.offset).toBe(final.offset);
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

  it("counts overshoot only after the sustained output crossing", () => {
    const transition = calculateTransitionMetric({ transitionId: "x-pre-crossing-excursion", axis: "x", start: 0, final: 10, samples: [
      { timestampMs: 0, input: 0, output: 20, filteredPositionMm: { x: 20, y: 0, z: 600 } },
      { timestampMs: 10, input: 6, output: 4, filteredPositionMm: { x: 4, y: 0, z: 600 } },
      { timestampMs: 20, input: 8, output: 6, filteredPositionMm: { x: 6, y: 0, z: 600 } },
      { timestampMs: 30, input: 10, output: 10, filteredPositionMm: { x: 10, y: 0, z: 600 } },
      { timestampMs: 40, input: 10, output: 10, filteredPositionMm: { x: 10, y: 0, z: 600 } },
    ] });
    expect(transition.overshootMm).toBe(0);
  });

  it("preserves non-evaluable transitions and represents missing lag explicitly", () => {
    const transition = { transitionId: "x-no-crossing", axis: "x" as const, start: 0, final: 10, samples: [
      { timestampMs: 0, input: 0, output: 0, filteredPositionMm: { x: 0, y: 0, z: 600 } },
      { timestampMs: 10, input: 4, output: 1, filteredPositionMm: { x: 1, y: 0, z: 600 } },
      { timestampMs: 20, input: 4, output: 2, filteredPositionMm: { x: 2, y: 0, z: 600 } },
    ] };
    const result = evaluateTransition(transition);
    expect(result).toMatchObject({ status: "non-evaluable", reason: "threshold-crossing-not-establishable", transitionId: "x-no-crossing" });
    const candidate = objectiveForCandidate(enumerateOneEuroGrid()[0]!, [], null, 0, [], 0, 0, [], [transition], [], [result], [transition], []);
    expect(candidate.p95LagMs).toBeNull();
    expect(candidate.lagSummary).toEqual({ evaluableTransitionCount: 0, medianLagMs: null, p95LagMs: null });
    expect(buildShortlist([candidate]).frontier).toEqual([]);
  });

  it("excludes null-lag candidates from the Pareto comparison set", () => {
    const grid = enumerateOneEuroGrid();
    const eligibleTrials = Array.from({ length: 5 }, (_, index) => ({ trialId: `trial-${index}`, rms: { x: 1, y: 1, z: 2 }, eligible: true }));
    const candidate = objectiveForCandidate(grid[0]!, eligibleTrials, null);
    const result = buildShortlist([candidate]);
    expect(result.candidates).toEqual([candidate]);
    expect(result.frontier).toEqual([]);
    expect(result.status).toBe("no-shortlist");
  });

  it("does not let a null-lag candidate become an undominated frontier member", () => {
    const grid = enumerateOneEuroGrid();
    const betterTrials = Array.from({ length: 5 }, (_, index) => ({ trialId: `better-${index}`, rms: { x: 0, y: 0, z: 0 }, eligible: true }));
    const validTrials = Array.from({ length: 5 }, (_, index) => ({ trialId: `valid-${index}`, rms: { x: 1, y: 1, z: 2 }, eligible: true }));
    const nullLag = objectiveForCandidate(grid[0]!, betterTrials, null);
    const valid = objectiveForCandidate(grid[1]!, validTrials, 100);
    const result = buildShortlist([nullLag, valid]);
    expect(result.frontier).toEqual([valid]);
    expect(result.frontier).not.toContain(nullLag);
  });

  it("preserves null-lag candidates while calculating the frontier among comparable candidates", () => {
    const grid = enumerateOneEuroGrid();
    const trials = Array.from({ length: 5 }, (_, index) => ({ trialId: `trial-${index}`, rms: { x: 1, y: 1, z: 2 }, eligible: true }));
    const first = objectiveForCandidate(grid[0]!, trials, 100);
    const second = objectiveForCandidate(grid[1]!, trials, 80);
    const nullLag = objectiveForCandidate(grid[2]!, trials, null);
    const result = buildShortlist([first, second, nullLag]);
    expect(result.frontier).toEqual([second]);
    expect(result.candidates).toEqual([first, second, nullLag]);
    expect(result.candidates).toContain(nullLag);
  });

  it("returns no-shortlist when every eligible candidate lacks lag", () => {
    const grid = enumerateOneEuroGrid();
    const trials = Array.from({ length: 5 }, (_, index) => ({ trialId: `trial-${index}`, rms: { x: 1, y: 1, z: 2 }, eligible: true }));
    const candidates = [objectiveForCandidate(grid[0]!, trials, null), objectiveForCandidate(grid[1]!, trials, null)];
    const result = buildShortlist(candidates);
    expect(result.status).toBe("no-shortlist");
    expect(result.frontier).toHaveLength(0);
  });

  it("enumerates exactly 25 candidates and applies Pareto shortlist rules", () => {
    const grid = enumerateOneEuroGrid();
    expect(grid).toHaveLength(25);
    const trials = Array.from({ length: 5 }, (_, index) => ({ trialId: `trial-${index}`, rms: { x: 1, y: 1, z: 2 }, eligible: true }));
    const dominated = objectiveForCandidate(grid[0]!, trials, 100);
    const frontier = objectiveForCandidate(grid[1]!, trials, 80);
    expect(buildShortlist([dominated, frontier]).frontier).toEqual([frontier]);
  });

  it("replays each candidate's stationary source and produces candidate-specific RMS", () => {
    const rawSamples = Array.from({ length: 40 }, (_, index) => ({ phase: index < 10 ? "settle" as const : "capture" as const, raw: { timestampMs: index * 16, positionMm: { x: index % 2 === 0 ? 0 : 10, y: 0, z: 600 }, confidence: 1, estimatorId: "mediapipe-facial-transform-v1" } }));
    const input = { rawPoses: [], calibrationProfile: createDefaultCalibrationProfile(), stationaryTrials: [{ trialId: "neutral-stationary-trial-1", settle: [], capture: [], rawSamples }, { trialId: "neutral-stationary-trial-2", settle: [], capture: [], rawSamples }, { trialId: "neutral-stationary-trial-3", settle: [], capture: [], rawSamples }, { trialId: "neutral-stationary-trial-4", settle: [], capture: [], rawSamples }, { trialId: "neutral-stationary-trial-5", settle: [], capture: [], rawSamples }] };
    const low = runOneEuroCandidate(enumerateOneEuroGrid()[0]!, input);
    const high = runOneEuroCandidate(enumerateOneEuroGrid()[24]!, input);
    expect(low.stationaryTrials[0]!.rms.x).not.toBe(high.stationaryTrials[0]!.rms.x);
  });
});
