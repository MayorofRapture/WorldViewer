import { describe, expect, it } from "vitest";
import {
  calculateCandidateMetricSummary,
  cadenceSummary,
  cadenceStructuralStatus,
  calculateStructuralFailureSummary,
  crossAxisDrift,
  faceDetectedRate,
  percentileNearestRank,
  referenceError,
  repeatabilityRms,
  robustOutlierSummary,
  robustStationaryOutlierSummary,
  stationaryAxisRms,
  trialMedianPose,
  validAndNullOutputRates,
  directionalStructuralStatus,
} from "../../src/m0d/metrics/m0dMetrics";

const p = (x: number, y: number, z: number) => ({ x, y, z });

describe("M0D frozen metrics", () => {
  it("calculates stationary, trial, repeatability, reference, and cross-axis metrics", () => {
    expect(stationaryAxisRms([p(0, 0, 600), p(2, 0, 600)])).toEqual({ x: 1, y: 0, z: 0 });
    expect(trialMedianPose([p(1, 2, 3), p(3, 4, 5), p(2, 3, 4)])).toEqual(p(2, 3, 4));
    expect(repeatabilityRms([p(0, 0, 0), p(2, 0, 0)])).toBe(1);
    expect(referenceError(p(2, -3, 4), p(1, -1, 5))).toEqual({ signedMm: p(1, -2, -1), absoluteMm: p(1, 2, 1) });
    expect(crossAxisDrift([p(10, 2, 0), p(10, 100, 0)], [p(0, 0, 0), p(0, 4, 0)], "x")).toMatchObject({ offAxisRmsMm: 49, offAxisMaximumMm: 49, offAxisRmsByAxis: { y: 49, z: 0 } });
  });

  it("uses nearest-rank percentiles and reports robust outliers without removal", () => {
    expect(percentileNearestRank([1, 2, 3, 4], 0.95)).toBe(4);
    const result = robustOutlierSummary([1, 1, 1, 1, 100]);
    expect(result).toMatchObject({ median: 1, mad: 0, valuesRetained: true, outlierIndices: [] });
    expect(robustStationaryOutlierSummary([p(0, 0, 0), p(0, 0, 1), p(0, 0, 2), p(0, 0, 3), p(0, 0, 100)])).toMatchObject({ outlierCount: 1, outlierRate: 1 / 5, valuesRetained: true });
    expect(robustOutlierSummary([1, 1, 1, 1, 1])).toMatchObject({ mad: 0, outlierIndices: [], outlierRate: 0 });
    expect(robustStationaryOutlierSummary([p(0, 0, 0), p(0, 0, 0), p(0, 0, 100)])).toMatchObject({ outlierCount: 0 });
  });

  it("keeps valid/null rates denominator-explicit and preserves cadence attribution statuses", () => {
    expect(faceDetectedRate(3, 4)).toBe(0.75);
    expect(validAndNullOutputRates(3, 1)).toEqual({ validRate: 0.75, nullRate: 0.25 });
    expect(validAndNullOutputRates(0, 0)).toEqual({ validRate: null, nullRate: null });
    expect(cadenceStructuralStatus(10, 10, 10)).toBe("Unverified / insufficient to judge");
    expect(cadenceStructuralStatus(20, 10, 20)).toBe("Unverified / insufficient attribution to estimator");
    expect(cadenceStructuralStatus(20, 20, 10)).toBe("Structural failure");
    expect(cadenceStructuralStatus(20, 20, 20)).toBe("Verified");
    expect(cadenceSummary([0, 1000, 2000], [0, 1000], [0, 1000])).toMatchObject({ sourceRateHz: 1, faceRateHz: 1, validRateOfSource: 1, windowStartMs: 0, windowEndMs: 1000 });
    expect(cadenceSummary(Array.from({ length: 20 }, (_, index) => index * 100), Array.from({ length: 20 }, (_, index) => index * 100), Array.from({ length: 10 }, (_, index) => index * 200))).toMatchObject({ sourceRateHz: 10, faceRateHz: 10, status: "Unverified / insufficient to judge" });
  });

  it("reports discontinuity and processing summaries and leaves unavailable values null", () => {
    const summary = calculateCandidateMetricSummary({
      stationaryPositionsMm: [p(0, 0, 600), p(1, 0, 600)],
      trialPositionsMm: [p(0, 0, 600), p(2, 0, 600)],
      referencePositionMm: p(0, 0, 600),
      estimatedMovementPositionMm: p(10, 2, 600),
      referenceMovementPositionMm: p(10, 0, 600),
      neutralMovementPositionMm: p(0, 0, 600),
      commandedDisplacementMm: 10,
      commandedAxis: "x",
      sourceTimestampsMs: [0, 1000],
      faceTimestampsMs: [0, 1000],
      validTimestampsMs: [0, 1000],
      faceDetectedCount: 2,
      poseSamples: [
        { sequenceNumber: 0, timestampMs: 0, positionMm: p(0, 0, 600), processingMs: 1 },
        { sequenceNumber: 1, timestampMs: 1000, positionMm: p(3, 0, 600), processingMs: 2 },
      ],
      calibrationBurden: { manualMeasurementCount: 1, calibrationCaptureCount: 1, calibrationDurationSeconds: 5, candidateCalibrationStepCount: 2, description: "one shared capture" },
    });
    expect(summary.discontinuity).toMatchObject({ median: 3, maximum: 3 });
    expect(summary.processing).toMatchObject({ median: 1.5, p95: 2 });
    expect(summary.referenceError).toEqual({ signedMm: p(0, 2, 0), absoluteMm: p(0, 2, 0) });
    expect(summary.relativeMovementError.normalizedByCommandedDisplacement).toBe(0.2);
  });

  it("applies the frozen directional and hard structural rules without ranking candidates", () => {
    expect(directionalStructuralStatus([{ first: -1, neutral: 0, last: 1 }, { first: -2, neutral: 0, last: 2 }])).toBe("Verified");
    expect(directionalStructuralStatus([{ first: 1, neutral: 0, last: 2 }, { first: 2, neutral: 0, last: 1 }])).toBe("Structural failure");
    expect(directionalStructuralStatus([{ first: -1, neutral: 0, last: 1 }])).toBe("Unverified");
    const result = calculateStructuralFailureSummary({ replayable: true, calibrationValid: true, replayOutputs: [{ valid: true, positionMm: { x: Number.NaN, y: 0, z: 1 } }], xCycles: [{ first: 1, neutral: 0, last: 2 }, { first: 2, neutral: 0, last: 1 }] });
    expect(result.status).toBe("Structural failure");
    expect(result.hardFailures).toContain("valid-output-nonfinite-position");
  });
});
