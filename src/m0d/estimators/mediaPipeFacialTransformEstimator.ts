import type { TrackingObservation } from "../../mediapipe/trackingObservationNormalizer";
import type { Vec3Mm } from "../../shared/contracts/primitives";
import { PINNED_CANONICAL_FACE_MODEL, type CanonicalPointCm } from "./canonicalFaceModel";
import {
  calibrationFailure,
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

export const MEDIAPIPE_FACIAL_TRANSFORM_ESTIMATOR_ID = "mediapipe-facial-transform-v1" as const;
export const HOMOGENEOUS_W_TOLERANCE = 1e-5;

export interface EstimatorACalibration extends SharedEstimatorCalibration {
  readonly canonicalPointCm: CanonicalPointCm;
  readonly scaleA: number;
}

type TransformResult =
  | { readonly ok: true; readonly runtimePoint: readonly [number, number, number] }
  | { readonly ok: false; readonly reason: "missing-facial-transform-matrix" | "invalid-facial-transform-matrix" | "non-finite-transformed-point" | "non-unit-homogeneous-w" };

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validCanonicalPoint(point: CanonicalPointCm): boolean {
  return finite(point.x) && finite(point.y) && finite(point.z);
}

export function transformCanonicalPoint(
  observation: TrackingObservation,
  canonicalPointCm: CanonicalPointCm = PINNED_CANONICAL_FACE_MODEL.cyclopeanPointCm,
): TransformResult {
  const matrix = observation.face?.facialTransformMatrix;
  if (matrix === undefined) return { ok: false, reason: "missing-facial-transform-matrix" };
  if (matrix.length !== 16 || matrix.some((value) => !finite(value)) || !validCanonicalPoint(canonicalPointCm)) return { ok: false, reason: "invalid-facial-transform-matrix" };
  const [x, y, z] = [canonicalPointCm.x, canonicalPointCm.y, canonicalPointCm.z];
  const runtimeX = matrix[0]! * x + matrix[4]! * y + matrix[8]! * z + matrix[12]!;
  const runtimeY = matrix[1]! * x + matrix[5]! * y + matrix[9]! * z + matrix[13]!;
  const runtimeZ = matrix[2]! * x + matrix[6]! * y + matrix[10]! * z + matrix[14]!;
  const homogeneousW = matrix[3]! * x + matrix[7]! * y + matrix[11]! * z + matrix[15]!;
  if (![runtimeX, runtimeY, runtimeZ, homogeneousW].every(finite)) return { ok: false, reason: "non-finite-transformed-point" };
  if (Math.abs(homogeneousW - 1) > HOMOGENEOUS_W_TOLERANCE) return { ok: false, reason: "non-unit-homogeneous-w" };
  return { ok: true, runtimePoint: [runtimeX, runtimeY, runtimeZ] };
}

function rawRelativeMillimeters(runtimePoint: readonly [number, number, number]): Vec3Mm {
  return { x: -10 * runtimePoint[0], y: 10 * runtimePoint[1], z: -10 * runtimePoint[2] };
}

export function calibrateEstimatorA(
  observations: readonly TrackingObservation[],
  shared: SharedEstimatorCalibration,
  canonicalPointCm: CanonicalPointCm = PINNED_CANONICAL_FACE_MODEL.cyclopeanPointCm,
): CalibrationResult<EstimatorACalibration> {
  let validatedShared: SharedEstimatorCalibration;
  try {
    validatedShared = validateSharedEstimatorCalibration(shared);
  } catch (error) {
    return calibrationFailure("invalid-calibration-value", error instanceof Error ? error.message : "shared calibration is invalid");
  }
  if (!validCanonicalPoint(canonicalPointCm)) return calibrationFailure("invalid-calibration-value", "canonical cyclopean point must be finite");
  const rawDepths: number[] = [];
  for (const observation of observations) {
    const transformed = transformCanonicalPoint(observation, canonicalPointCm);
    if (!transformed.ok) continue;
    const raw = rawRelativeMillimeters(transformed.runtimePoint);
    if (finite(raw.z) && raw.z > 0) rawDepths.push(raw.z);
  }
  const zMedianRaw = median(rawDepths);
  if (zMedianRaw === null || !(zMedianRaw > 0)) return calibrationFailure("no-valid-calibration-samples", "Estimator A requires at least one valid positive raw calibration depth");
  const scaleA = validatedShared.zrefCameraMm / zMedianRaw;
  if (!finite(scaleA) || !(scaleA > 0)) return calibrationFailure("invalid-calibration-value", "Estimator A scaleA must be finite and greater than zero");
  return {
    ok: true,
    calibration: Object.freeze({
      cameraOriginScreenMm: Object.freeze({ ...validatedShared.cameraOriginScreenMm }),
      zrefScreenMm: validatedShared.zrefScreenMm,
      zrefCameraMm: validatedShared.zrefCameraMm,
      canonicalPointCm: Object.freeze({ ...canonicalPointCm }),
      scaleA,
    }),
  };
}

export function validateEstimatorACalibration(value: unknown): EstimatorACalibration {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new RangeError("Estimator A calibration must be an object");
  const candidate = value as Partial<EstimatorACalibration>;
  const shared = validateSharedEstimatorCalibration(candidate);
  if (candidate.canonicalPointCm === undefined || !validCanonicalPoint(candidate.canonicalPointCm)) throw new RangeError("Estimator A canonicalPointCm must be finite");
  if (!finite(candidate.scaleA) || !(candidate.scaleA > 0)) throw new RangeError("Estimator A scaleA must be finite and greater than zero");
  return Object.freeze({ ...shared, canonicalPointCm: Object.freeze({ ...candidate.canonicalPointCm }), scaleA: candidate.scaleA });
}

function evaluateEstimatorA(
  observation: TrackingObservation,
  calibration: EstimatorACalibration,
): EstimatorEvaluation {
  const transformed = transformCanonicalPoint(observation, calibration.canonicalPointCm);
  if (!transformed.ok) return { pose: null, invalidReason: transformed.reason };
  const raw = rawRelativeMillimeters(transformed.runtimePoint);
  const positionMm = {
    x: calibration.cameraOriginScreenMm.x + raw.x * calibration.scaleA,
    y: calibration.cameraOriginScreenMm.y + raw.y * calibration.scaleA,
    z: calibration.cameraOriginScreenMm.z + raw.z * calibration.scaleA,
  };
  if (![positionMm.x, positionMm.y, positionMm.z].every(finite)) return { pose: null, invalidReason: "non-finite-result" };
  if (positionMm.z <= 0) return { pose: null, invalidReason: "nonpositive-result-depth" };
  const pose = createPose(observation.timestampMs, positionMm, MEDIAPIPE_FACIAL_TRANSFORM_ESTIMATOR_ID);
  return pose === null ? { pose: null, invalidReason: "non-finite-result" } : { pose, invalidReason: null };
}

export const mediaPipeFacialTransformEstimator: ViewerPoseEstimator<EstimatorACalibration> = Object.freeze({
  id: MEDIAPIPE_FACIAL_TRANSFORM_ESTIMATOR_ID,
  version: "v1",
  validateCalibration: validateEstimatorACalibration,
  estimate: (observation: TrackingObservation, context: PoseEstimationContext<EstimatorACalibration>) => evaluateEstimatorA(observation, context.calibration).pose,
  estimateWithDiagnostic: (observation: TrackingObservation, context: PoseEstimationContext<EstimatorACalibration>) => evaluateEstimatorA(observation, context.calibration),
});
