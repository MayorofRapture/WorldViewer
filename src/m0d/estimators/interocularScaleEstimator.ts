import type { TrackingObservation } from "../../mediapipe/trackingObservationNormalizer";
import type { Vec3Mm } from "../../shared/contracts/primitives";
import { PINNED_CANONICAL_FACE_MODEL } from "./canonicalFaceModel";
import {
  calibrationFailure,
  approximatelyEqual,
  median,
  type CalibrationResult,
  type SharedEstimatorCalibration,
  validateSharedEstimatorCalibration,
} from "./calibration";
import {
  createPose,
  type EstimatorEvaluation,
  type PoseEstimationContext,
  type ViewerPoseEstimator,
} from "./estimatorContracts";

export const INTEROCULAR_SCALE_ESTIMATOR_ID = "interocular-scale-v1" as const;

interface PixelPoint {
  readonly x: number;
  readonly y: number;
}

export interface InterocularPixelGeometry {
  readonly leftEyeCenterPx: PixelPoint;
  readonly rightEyeCenterPx: PixelPoint;
  readonly cyclopeanCenterPx: PixelPoint;
  readonly dPx: number;
}

type PixelGeometryResult =
  | { readonly ok: true; readonly geometry: InterocularPixelGeometry }
  | { readonly ok: false; readonly reason: "missing-required-landmark" | "invalid-frame-dimensions" | "non-finite-landmark" | "nonpositive-interocular-distance" };

export interface EstimatorBCalibration extends SharedEstimatorCalibration {
  readonly dRefPx: number;
  readonly fEffPx: number;
  readonly canonicalInterocularDistanceMm: number;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function midpoint(left: PixelPoint, right: PixelPoint): PixelPoint {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

export function calculateInterocularPixelGeometry(observation: TrackingObservation): PixelGeometryResult {
  const face = observation.face;
  if (face === undefined) return { ok: false, reason: "missing-required-landmark" };
  if (!finite(observation.frame.widthPx) || observation.frame.widthPx <= 0 || !finite(observation.frame.heightPx) || observation.frame.heightPx <= 0) return { ok: false, reason: "invalid-frame-dimensions" };
  const points = [33, 133, 362, 263].map((index) => face.normalizedLandmarks[index]);
  const [p33, p133, p362, p263] = points;
  if (p33 === undefined || p133 === undefined || p362 === undefined || p263 === undefined) return { ok: false, reason: "missing-required-landmark" };
  if ([p33, p133, p362, p263].some((point) => !finite(point.x) || !finite(point.y))) return { ok: false, reason: "non-finite-landmark" };
  const toPixels = (point: { x: number; y: number }): PixelPoint => ({ x: point.x * observation.frame.widthPx, y: point.y * observation.frame.heightPx });
  const leftEyeCenterPx = midpoint(toPixels(p33), toPixels(p133));
  const rightEyeCenterPx = midpoint(toPixels(p362), toPixels(p263));
  const cyclopeanCenterPx = midpoint(leftEyeCenterPx, rightEyeCenterPx);
  const dPx = Math.hypot(rightEyeCenterPx.x - leftEyeCenterPx.x, rightEyeCenterPx.y - leftEyeCenterPx.y);
  if (!finite(dPx) || !(dPx > 0)) return { ok: false, reason: "nonpositive-interocular-distance" };
  return { ok: true, geometry: { leftEyeCenterPx, rightEyeCenterPx, cyclopeanCenterPx, dPx } };
}

export function calibrateEstimatorB(
  observations: readonly TrackingObservation[],
  shared: SharedEstimatorCalibration,
): CalibrationResult<EstimatorBCalibration> {
  let validatedShared: SharedEstimatorCalibration;
  try {
    validatedShared = validateSharedEstimatorCalibration(shared);
  } catch (error) {
    return calibrationFailure("invalid-calibration-value", error instanceof Error ? error.message : "shared calibration is invalid");
  }
  const canonicalInterocularDistanceMm = PINNED_CANONICAL_FACE_MODEL.interocularDistanceMm;
  if (validatedShared.zrefScreenMm !== 600) return calibrationFailure("invalid-calibration-value", "formal Estimator B calibration requires ZrefScreenMm = 600");
  if (!finite(canonicalInterocularDistanceMm) || !(canonicalInterocularDistanceMm > 0)) return calibrationFailure("invalid-calibration-value", "canonical interocular distance must be finite and greater than zero");
  const distances: number[] = [];
  for (const observation of observations) {
    const geometry = calculateInterocularPixelGeometry(observation);
    if (geometry.ok) distances.push(geometry.geometry.dPx);
  }
  const dRefPx = median(distances);
  if (dRefPx === null || !(dRefPx > 0)) return calibrationFailure("no-valid-calibration-samples", "Estimator B requires at least one valid positive interocular calibration distance");
  const fEffPx = (dRefPx * validatedShared.zrefCameraMm) / canonicalInterocularDistanceMm;
  if (!finite(fEffPx) || !(fEffPx > 0)) return calibrationFailure("invalid-calibration-value", "Estimator B fEffPx must be finite and greater than zero");
  return {
    ok: true,
    calibration: Object.freeze({
      cameraOriginScreenMm: Object.freeze({ ...validatedShared.cameraOriginScreenMm }),
      zrefScreenMm: validatedShared.zrefScreenMm,
      zrefCameraMm: validatedShared.zrefCameraMm,
      dRefPx,
      fEffPx,
      canonicalInterocularDistanceMm,
    }),
  };
}

export function validateEstimatorBCalibration(value: unknown): EstimatorBCalibration {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new RangeError("Estimator B calibration must be an object");
  const candidate = value as Partial<EstimatorBCalibration>;
  const shared = validateSharedEstimatorCalibration(candidate);
  if (shared.zrefScreenMm !== 600) throw new RangeError("formal Estimator B calibration requires ZrefScreenMm = 600");
  if (!finite(candidate.dRefPx) || !(candidate.dRefPx > 0)) throw new RangeError("Estimator B dRefPx must be finite and greater than zero");
  if (!finite(candidate.fEffPx) || !(candidate.fEffPx > 0)) throw new RangeError("Estimator B fEffPx must be finite and greater than zero");
  if (!finite(candidate.canonicalInterocularDistanceMm) || !(candidate.canonicalInterocularDistanceMm > 0)) throw new RangeError("Estimator B canonical interocular distance must be finite and greater than zero");
  if (candidate.canonicalInterocularDistanceMm !== PINNED_CANONICAL_FACE_MODEL.interocularDistanceMm) throw new RangeError("Estimator B canonical interocular distance does not match the pinned canonical artifact");
  const expectedFocalLength = (candidate.dRefPx * shared.zrefCameraMm) / candidate.canonicalInterocularDistanceMm;
  if (!approximatelyEqual(candidate.fEffPx, expectedFocalLength)) throw new RangeError("Estimator B fEffPx does not match dRefPx * zrefCameraMm / DcanonMm");
  return Object.freeze({ ...shared, dRefPx: candidate.dRefPx, fEffPx: candidate.fEffPx, canonicalInterocularDistanceMm: candidate.canonicalInterocularDistanceMm });
}

function evaluateEstimatorB(
  observation: TrackingObservation,
  calibration: EstimatorBCalibration,
): EstimatorEvaluation {
  const pixelGeometry = calculateInterocularPixelGeometry(observation);
  if (!pixelGeometry.ok) return { pose: null, invalidReason: pixelGeometry.reason };
  const { cyclopeanCenterPx, dPx } = pixelGeometry.geometry;
  const zcamMm = (calibration.fEffPx * calibration.canonicalInterocularDistanceMm) / dPx;
  if (!finite(zcamMm) || !(zcamMm > 0)) return { pose: null, invalidReason: "invalid-depth" };
  const cx = observation.frame.widthPx / 2;
  const cy = observation.frame.heightPx / 2;
  const xcamMm = -((cyclopeanCenterPx.x - cx) * zcamMm) / calibration.fEffPx;
  const ycamMm = -((cyclopeanCenterPx.y - cy) * zcamMm) / calibration.fEffPx;
  const positionMm: Vec3Mm = {
    x: calibration.cameraOriginScreenMm.x + xcamMm,
    y: calibration.cameraOriginScreenMm.y + ycamMm,
    z: calibration.cameraOriginScreenMm.z + zcamMm,
  };
  if (![positionMm.x, positionMm.y, positionMm.z].every(finite)) return { pose: null, invalidReason: "non-finite-result" };
  if (positionMm.z <= 0) return { pose: null, invalidReason: "nonpositive-result-depth" };
  const pose = createPose(observation.timestampMs, positionMm, INTEROCULAR_SCALE_ESTIMATOR_ID);
  return pose === null ? { pose: null, invalidReason: "non-finite-result" } : { pose, invalidReason: null };
}

export const interocularScaleEstimator: ViewerPoseEstimator<EstimatorBCalibration> = Object.freeze({
  id: INTEROCULAR_SCALE_ESTIMATOR_ID,
  version: "v1",
  validateCalibration: validateEstimatorBCalibration,
  estimate: (observation: TrackingObservation, context: PoseEstimationContext<EstimatorBCalibration>) => evaluateEstimatorB(observation, context.calibration).pose,
  estimateWithDiagnostic: (observation: TrackingObservation, context: PoseEstimationContext<EstimatorBCalibration>) => evaluateEstimatorB(observation, context.calibration),
});
