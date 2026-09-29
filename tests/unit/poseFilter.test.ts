import { describe, expect, it } from "vitest";
import { OneEuroPoseFilter } from "../../src/engine/filter/poseFilter";
import { createDefaultCalibrationProfile, identityCalibrationTransform } from "../../src/shared/contracts/calibration";

const sample = (timestampMs: number, x: number, y = 0, z = 600) => ({ timestampMs, positionMm: { x, y, z }, confidence: 0.75, estimatorId: "mediapipe-facial-transform-v1" });

describe("M0E One Euro adapter", () => {
  it("uses the approved adapter identity, timestamps, independent axes, and deterministic velocity", () => {
    const filter = new OneEuroPoseFilter({ minCutoffHz: 1, beta: 0, dCutoffHz: 1, initialFrequencyHz: 60 });
    expect(filter.id).toBe("1eurofilter@1.3.0");
    const first = filter.update(sample(100, 1, 2, 600));
    const second = filter.update(sample(200, 3, 6, 604));
    expect(first).toMatchObject({ timestampMs: 100, positionMm: { x: 1, y: 2, z: 600 }, velocityMmPerSec: { x: 0, y: 0, z: 0 }, confidence: 0.75 });
    expect(second.timestampMs).toBe(200);
    expect(second.velocityMmPerSec.x).toBeCloseTo((second.positionMm.x - 1) / 0.1);
    expect(second.velocityMmPerSec.y).toBeCloseTo((second.positionMm.y - 2) / 0.1);
    expect(second.velocityMmPerSec.z).toBeCloseTo((second.positionMm.z - 600) / 0.1);
  });

  it("rejects equal/decreasing timestamps without advancing state and reset is deterministic", () => {
    const filter = new OneEuroPoseFilter();
    filter.update(sample(100, 1));
    expect(() => filter.update(sample(100, 2))).toThrow(/strictly increasing/);
    expect(() => filter.update(sample(90, 2))).toThrow(/strictly increasing/);
    filter.reset(sample(200, 5));
    expect(filter.update(sample(300, 5))).toMatchObject({ positionMm: { x: 5, y: 0, z: 600 } });
  });

  it("preserves confidence and composes with the pure calibration transform", () => {
    const filter = new OneEuroPoseFilter({ minCutoffHz: 0.25, beta: 0.003, dCutoffHz: 1, initialFrequencyHz: 60 });
    const calibrated = identityCalibrationTransform.apply(sample(100, 2, 3, 4), { ...createDefaultCalibrationProfile(), poseCorrection: { scale: { x: 2, y: 1, z: 1 }, offsetMm: { x: 1, y: 0, z: 0 } } });
    expect(filter.update(calibrated).confidence).toBe(0.75);
  });
});
