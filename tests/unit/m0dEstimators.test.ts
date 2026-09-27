import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createScreenGeometry } from "../../src/engine/geometry/screenGeometry";
import { createSharedEstimatorCalibration, type CalibrationResult } from "../../src/m0d/estimators/calibration";
import { PINNED_CANONICAL_FACE_MODEL } from "../../src/m0d/estimators/canonicalFaceModel";
import {
  calibrateEstimatorA,
  HOMOGENEOUS_W_TOLERANCE,
  mediaPipeFacialTransformEstimator,
  transformCanonicalPoint,
  type EstimatorACalibration,
  validateEstimatorACalibration,
} from "../../src/m0d/estimators/mediaPipeFacialTransformEstimator";
import {
  calculateInterocularPixelGeometry,
  calibrateEstimatorB,
  interocularScaleEstimator,
  type EstimatorBCalibration,
  validateEstimatorBCalibration,
} from "../../src/m0d/estimators/interocularScaleEstimator";
import type { PoseEstimationContext } from "../../src/m0d/estimators/estimatorContracts";
import {
  affineMatrix,
  estimatorAObservation,
  estimatorBObservation,
  FIXTURE_CAMERA_ORIGIN,
  FIXTURE_CANONICAL_POINT_CM,
} from "../fixtures/m0d/estimatorFixtures";

function unwrap<T>(result: CalibrationResult<T>): T {
  if (!result.ok) throw new Error(result.message);
  return result.calibration;
}

function context<T>(calibration: T): PoseEstimationContext<T> {
  return {
    display: createScreenGeometry(300, 200),
    camera: { cameraId: "synthetic-camera", positionScreenMm: FIXTURE_CAMERA_ORIGIN, captureWidthPx: 640, captureHeightPx: 360, captureFps: 24 },
    calibration,
  };
}

function sharedObservation() {
  const matrixObservation = estimatorAObservation();
  const landmarkObservation = estimatorBObservation();
  return Object.freeze({
    ...matrixObservation,
    face: Object.freeze({
      ...matrixObservation.face!,
      normalizedLandmarks: landmarkObservation.face!.normalizedLandmarks,
    }),
  });
}

function estimatorACalibration(): EstimatorACalibration {
  const shared = unwrap(createSharedEstimatorCalibration(FIXTURE_CAMERA_ORIGIN));
  return unwrap(calibrateEstimatorA([
    estimatorAObservation({ translationZ: -53.46566307544708 }),
    estimatorAObservation({ translationZ: -63.46566307544708 }),
    estimatorAObservation({ translationZ: -73.46566307544708 }),
  ], shared));
}

function estimatorBCalibration(): EstimatorBCalibration {
  const shared = unwrap(createSharedEstimatorCalibration(FIXTURE_CAMERA_ORIGIN));
  return unwrap(calibrateEstimatorB([
    estimatorBObservation({ leftCenterPx: [305, 180], rightCenterPx: [335, 180] }),
    estimatorBObservation({ leftCenterPx: [300, 180], rightCenterPx: [340, 180] }),
    estimatorBObservation({ leftCenterPx: [295, 180], rightCenterPx: [345, 180] }),
  ], shared));
}

describe("shared M0D estimator calibration", () => {
  it("keeps runtime canonical constants in parity with the pinned artifact", () => {
    const artifact = JSON.parse(readFileSync("evidence/m0d/estimator-experiment-v3/canonical-face-model.json", "utf8")) as { CC: number[]; DcanonMm: number };
    expect(PINNED_CANONICAL_FACE_MODEL.cyclopeanPointCm).toEqual({ x: artifact.CC[0], y: artifact.CC[1], z: artifact.CC[2] });
    expect(PINNED_CANONICAL_FACE_MODEL.interocularDistanceMm).toBe(artifact.DcanonMm);
  });

  it("derives one shared positive camera-relative reference depth without fixing camera origin", () => {
    const shared = createSharedEstimatorCalibration({ x: 0, y: 103.188, z: 0 });
    expect(shared).toMatchObject({ ok: true, calibration: { zrefScreenMm: 600, zrefCameraMm: 600 } });
    expect(createSharedEstimatorCalibration({ x: 0, y: 103.188, z: 600 })).toMatchObject({ ok: false, reason: "nonpositive-camera-depth" });
    expect(createSharedEstimatorCalibration({ x: Number.NaN, y: 0, z: 0 })).toMatchObject({ ok: false, reason: "invalid-camera-origin" });
  });

  it("uses the same normalized neutral trace to derive both candidate calibrations", () => {
    const shared = unwrap(createSharedEstimatorCalibration(FIXTURE_CAMERA_ORIGIN));
    const trace = [sharedObservation(), { ...sharedObservation(), timestampMs: 1042 }];
    const calibrationA = calibrateEstimatorA(trace, shared);
    const calibrationB = calibrateEstimatorB(trace, shared);
    expect(calibrationA.ok).toBe(true);
    expect(calibrationB.ok).toBe(true);
    expect(unwrap(calibrationA).zrefCameraMm).toBe(unwrap(calibrationB).zrefCameraMm);
  });

  it("does not mutate the shared calibration or normalized observations", () => {
    const shared = unwrap(createSharedEstimatorCalibration(FIXTURE_CAMERA_ORIGIN));
    const observation = estimatorAObservation();
    const beforeObservation = JSON.stringify(observation);
    const beforeShared = JSON.stringify(shared);
    calibrateEstimatorA([observation], shared);
    calibrateEstimatorB([observation], shared);
    expect(JSON.stringify(observation)).toBe(beforeObservation);
    expect(JSON.stringify(shared)).toBe(beforeShared);
  });
});

describe("mediapipe-facial-transform-v1", () => {
  it("applies the pinned column-major canonical point transform", () => {
    const transformed = transformCanonicalPoint(estimatorAObservation({ translationX: 1, translationY: 2 }), FIXTURE_CANONICAL_POINT_CM);
    expect(transformed).toEqual({ ok: true, runtimePoint: [1, 4.62461793422699, -60] });
  });

  it("uses median neutral depth and uniform XYZ scale", () => {
    const calibration = estimatorACalibration();
    expect(calibration.scaleA).toBeCloseTo(1, 12);
    expect(calibration.zMedianRaw).toBe(600);
    expect(calibration.canonicalPointCm).toEqual(PINNED_CANONICAL_FACE_MODEL.cyclopeanPointCm);
    expect(() => validateEstimatorACalibration({ ...calibration, scaleA: calibration.scaleA + 0.1 })).toThrow("scaleA");
  });

  it("returns finite canonical pose with frozen confidence and identity", () => {
    const calibration = estimatorACalibration();
    const observation = estimatorAObservation({ translationX: -10, translationY: 5 - FIXTURE_CANONICAL_POINT_CM.y });
    const result = mediaPipeFacialTransformEstimator.estimateWithDiagnostic(observation, context(calibration));
    expect(result.invalidReason).toBeNull();
    expect(result.pose).toMatchObject({ estimatorId: "mediapipe-facial-transform-v1", confidence: 1, positionMm: { x: 100, y: 153.188, z: 600 } });
  });

  it("preserves the X/Y/Z sign convention for representative motion", () => {
    const calibration = estimatorACalibration();
    const estimate = (x: number, y: number, z: number) => mediaPipeFacialTransformEstimator.estimate(estimatorAObservation({ translationX: x, translationY: y - FIXTURE_CANONICAL_POINT_CM.y, translationZ: z }), context(calibration));
    expect(estimate(-10, 5, -63.46566307544708)?.positionMm).toMatchObject({ x: 100, y: 153.188, z: 600 });
    expect(estimate(10, -5, -73.46566307544708)?.positionMm.z).toBe(700);
  });

  it("reports missing, malformed, non-finite, and invalid homogeneous results", () => {
    const calibration = estimatorACalibration();
    const evaluate = (observation: ReturnType<typeof estimatorAObservation>) => mediaPipeFacialTransformEstimator.estimateWithDiagnostic(observation, context(calibration));
    expect(evaluate(estimatorAObservation({ missingMatrix: true })).invalidReason).toBe("missing-facial-transform-matrix");
    expect(evaluate(estimatorAObservation({ matrix: affineMatrix().slice(0, 15) })).invalidReason).toBe("invalid-facial-transform-matrix");
    expect(evaluate(estimatorAObservation({ matrix: affineMatrix(0, 0, -63.46566307544708, Number.NaN) })).invalidReason).toBe("invalid-facial-transform-matrix");
    const overflowingMatrix = [...affineMatrix()];
    overflowingMatrix[4] = Number.MAX_VALUE;
    expect(evaluate(estimatorAObservation({ matrix: overflowingMatrix })).invalidReason).toBe("non-finite-transformed-point");
    expect(evaluate(estimatorAObservation({ homogeneousW: 1 + HOMOGENEOUS_W_TOLERANCE / 2 })).invalidReason).toBeNull();
    expect(evaluate(estimatorAObservation({ homogeneousW: 1 + HOMOGENEOUS_W_TOLERANCE * 2 })).invalidReason).toBe("non-unit-homogeneous-w");
  });

  it("fails calibration explicitly and rejects resulting nonpositive depth", () => {
    const shared = unwrap(createSharedEstimatorCalibration(FIXTURE_CAMERA_ORIGIN));
    expect(calibrateEstimatorA([estimatorAObservation({ missingMatrix: true })], shared)).toMatchObject({ ok: false, reason: "no-valid-calibration-samples" });
    const calibration = estimatorACalibration();
    const result = mediaPipeFacialTransformEstimator.estimateWithDiagnostic(estimatorAObservation({ translationZ: -2 }), context(calibration));
    expect(result.invalidReason).toBe("nonpositive-result-depth");
  });
});

describe("interocular-scale-v1", () => {
  it("computes eye centers, cyclopean center, and pixel distance", () => {
    const geometry = calculateInterocularPixelGeometry(estimatorBObservation({ leftCenterPx: [300, 180], rightCenterPx: [340, 180] }));
    expect(geometry).toEqual({ ok: true, geometry: { leftEyeCenterPx: { x: 300, y: 180 }, rightEyeCenterPx: { x: 340, y: 180 }, cyclopeanCenterPx: { x: 320, y: 180 }, dPx: 40 } });
  });

  it("derives neutral focal calibration and deterministic neutral pose", () => {
    const calibration = estimatorBCalibration();
    expect(calibration.dRefPx).toBe(40);
    expect(calibration.fEffPx).toBeCloseTo((40 * 600) / PINNED_CANONICAL_FACE_MODEL.interocularDistanceMm, 12);
    const result = interocularScaleEstimator.estimateWithDiagnostic(estimatorBObservation(), context(calibration));
    expect(result.invalidReason).toBeNull();
    expect(result.pose).toMatchObject({ estimatorId: "interocular-scale-v1", confidence: 1, positionMm: { x: 0, y: 103.188, z: 600 } });
  });

  it("applies depth and lateral/vertical sign conventions", () => {
    const calibration = estimatorBCalibration();
    const near = interocularScaleEstimator.estimate(estimatorBObservation({ leftCenterPx: [295, 180], rightCenterPx: [345, 180] }), context(calibration));
    const rightAndUp = interocularScaleEstimator.estimate(estimatorBObservation({ leftCenterPx: [320, 160], rightCenterPx: [360, 160] }), context(calibration));
    expect(near?.positionMm.z).toBeCloseTo(480, 12);
    expect(rightAndUp?.positionMm.x).toBeLessThan(0);
    expect(rightAndUp?.positionMm.y).toBeGreaterThan(103.188);
  });

  it("reports missing landmarks, invalid dimensions, zero distance, and non-finite values", () => {
    const calibration = estimatorBCalibration();
    const evaluate = (observation: ReturnType<typeof estimatorBObservation>) => interocularScaleEstimator.estimateWithDiagnostic(observation, context(calibration));
    expect(evaluate(estimatorBObservation({ missingLandmarkIndex: 33 })).invalidReason).toBe("missing-required-landmark");
    expect(evaluate(estimatorBObservation({ frameWidthPx: 0 })).invalidReason).toBe("invalid-frame-dimensions");
    expect(evaluate(estimatorBObservation({ leftCenterPx: [320, 180], rightCenterPx: [320, 180] })).invalidReason).toBe("nonpositive-interocular-distance");
    expect(evaluate(estimatorBObservation({ nonFiniteLandmarkIndex: 362 })).invalidReason).toBe("non-finite-landmark");
  });

  it("fails calibration and rejects a resulting nonpositive screen-relative depth", () => {
    const shared = unwrap(createSharedEstimatorCalibration(FIXTURE_CAMERA_ORIGIN));
    expect(calibrateEstimatorB([estimatorBObservation({ missingLandmarkIndex: 33 })], shared)).toMatchObject({ ok: false, reason: "no-valid-calibration-samples" });
    expect(() => interocularScaleEstimator.validateCalibration({ ...estimatorBCalibration(), fEffPx: 0 })).toThrow("fEffPx");
    expect(() => validateEstimatorBCalibration({ ...estimatorBCalibration(), fEffPx: estimatorBCalibration().fEffPx + 0.1 })).toThrow("fEffPx");
    expect(() => validateEstimatorBCalibration({ ...estimatorBCalibration(), canonicalInterocularDistanceMm: 64 })).toThrow("canonical interocular");
    const negativeOrigin = unwrap(createSharedEstimatorCalibration({ x: 0, y: 103.188, z: -2000 }));
    const calibration = unwrap(calibrateEstimatorB([estimatorBObservation()], negativeOrigin));
    const result = interocularScaleEstimator.estimateWithDiagnostic(estimatorBObservation({ leftCenterPx: [280, 180], rightCenterPx: [360, 180] }), context(calibration));
    expect(result.invalidReason).toBe("nonpositive-result-depth");
  });
});

describe("shared estimator boundary", () => {
  it("consumes one normalized observation type and remains replay-compatible", () => {
    const calibrationA = estimatorACalibration();
    const calibrationB = estimatorBCalibration();
    const observation = sharedObservation();
    const a1 = mediaPipeFacialTransformEstimator.estimateWithDiagnostic(observation, context(calibrationA));
    const a2 = mediaPipeFacialTransformEstimator.estimateWithDiagnostic(observation, context(calibrationA));
    const b1 = interocularScaleEstimator.estimateWithDiagnostic(observation, context(calibrationB));
    expect(a2).toEqual(a1);
    expect(a1.pose?.confidence).toBe(1);
    expect(b1.pose?.confidence).toBe(1);
    expect(JSON.stringify({ a: a1, b: b1 })).not.toContain("undefined");
  });
});
