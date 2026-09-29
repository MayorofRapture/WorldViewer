import { describe, expect, it } from "vitest";
import { REFERENCE_TEST_ONE_EURO_CONFIGURATION } from "../../src/engine/filter/poseFilter";
import { createDefaultCalibrationProfile, identityCalibrationTransform, type CalibratedViewerPose, type CalibrationProfile, type CalibrationTransformContract } from "../../src/shared/contracts/calibration";
import { LivePoseProcessingPipeline } from "../../src/m0e/livePoseProcessingPipeline";
import type { RawViewerPose } from "../../src/engine/pose/SyntheticViewerPoseSource";

const raw = (timestampMs: number, x: number, confidence = 0.75): RawViewerPose => Object.freeze({
  timestampMs,
  positionMm: Object.freeze({ x, y: 2, z: 600 }),
  confidence,
  estimatorId: "mediapipe-facial-transform-v1",
});

function profileWithCorrection(): CalibrationProfile {
  const profile = createDefaultCalibrationProfile();
  return Object.freeze({
    ...profile,
    poseCorrection: Object.freeze({ scale: Object.freeze({ x: 2, y: 3, z: 4 }), offsetMm: Object.freeze({ x: 10, y: 20, z: 30 }) }),
  });
}

describe("LivePoseProcessingPipeline", () => {
  it("applies calibration before filtering and preserves contract fields", () => {
    const order: string[] = [];
    const transform: CalibrationTransformContract = {
      apply(sample, profile): CalibratedViewerPose {
        order.push("calibrate");
        return identityCalibrationTransform.apply(sample, profile);
      },
    };
    const pipeline = new LivePoseProcessingPipeline({ calibrationProfile: profileWithCorrection(), calibrationTransform: transform, oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION });
    const filtered = pipeline.ingest(raw(100, 5, 0.6));

    order.push("read-filtered");
    expect(filtered).toMatchObject({ timestampMs: 100, positionMm: { x: 20, y: 26, z: 2430 }, confidence: 0.6, velocityMmPerSec: { x: 0, y: 0, z: 0 } });
    expect(Object.keys(filtered ?? {})).not.toContain("estimatorId");
    expect(order).toEqual(["calibrate", "read-filtered"]);
  });

  it("caches one filtered result and does not re-filter on repeated reads", () => {
    const pipeline = new LivePoseProcessingPipeline({ calibrationProfile: createDefaultCalibrationProfile(), oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION });
    const first = pipeline.ingest(raw(100, 1));
    const cached = pipeline.getLatestFilteredPose();
    const secondRead = pipeline.getLatestFilteredPose();

    expect(cached).toBe(first);
    expect(secondRead).toBe(first);
  });

  it("ignores duplicate and stale samples without advancing filter state", () => {
    const pipeline = new LivePoseProcessingPipeline({ calibrationProfile: createDefaultCalibrationProfile(), oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION });
    const first = pipeline.ingest(raw(100, 1));
    expect(pipeline.ingest(raw(100, 100))).toBeNull();
    expect(pipeline.ingest(raw(90, 100))).toBeNull();
    const next = pipeline.ingest(raw(200, 3));

    expect(first?.positionMm.x).toBe(1);
    expect(next?.timestampMs).toBe(200);
    expect(next?.velocityMmPerSec.x).toBeCloseTo((next!.positionMm.x - first!.positionMm.x) / 0.1);
  });

  it("rejects a profile whose estimator identity or handoff parameters differ", () => {
    const identityMismatch = { ...createDefaultCalibrationProfile(), estimator: { ...createDefaultCalibrationProfile().estimator, id: "other-estimator" } };
    expect(() => new LivePoseProcessingPipeline({ calibrationProfile: identityMismatch, oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION })).toThrow(/selected Estimator A handoff/);

    const parametersMismatch = { ...createDefaultCalibrationProfile(), estimator: { ...createDefaultCalibrationProfile().estimator, parameters: { ...createDefaultCalibrationProfile().estimator.parameters, scaleA: 2 } } };
    expect(() => new LivePoseProcessingPipeline({ calibrationProfile: parametersMismatch, oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION })).toThrow(/selected Estimator A handoff/);
  });

  it("requires explicit filter configuration rather than supplying a production default", () => {
    const constructor = LivePoseProcessingPipeline as unknown as new (options: { calibrationProfile: CalibrationProfile; oneEuroConfiguration: undefined }) => unknown;
    expect(() => new constructor({ calibrationProfile: createDefaultCalibrationProfile(), oneEuroConfiguration: undefined })).toThrow();
  });
});
