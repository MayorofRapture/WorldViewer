import type { TrackingObservation } from "../../mediapipe/trackingObservationNormalizer";
import type { Vec3Mm } from "../../shared/contracts/primitives";
import { isFiniteCameraOriginScreenMm } from "../evidence/m0dEvidenceContracts";

export const M0D_ZREF_SCREEN_MM = 600;

export interface SharedEstimatorCalibration {
  readonly cameraOriginScreenMm: Vec3Mm;
  readonly zrefScreenMm: number;
  readonly zrefCameraMm: number;
}

export interface CalibrationFailure {
  readonly ok: false;
  readonly reason:
    | "invalid-camera-origin"
    | "invalid-reference-depth"
    | "nonpositive-camera-depth"
    | "no-valid-calibration-samples"
    | "invalid-calibration-value";
  readonly message: string;
}

export type CalibrationResult<T> = { readonly ok: true; readonly calibration: T } | CalibrationFailure;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0 || values.some((value) => !finite(value))) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

export function createSharedEstimatorCalibration(
  cameraOriginScreenMm: Vec3Mm,
  zrefScreenMm = M0D_ZREF_SCREEN_MM,
): CalibrationResult<SharedEstimatorCalibration> {
  if (!isFiniteCameraOriginScreenMm(cameraOriginScreenMm)) {
    return { ok: false, reason: "invalid-camera-origin", message: "cameraOriginScreenMm must contain finite x, y, and z" };
  }
  if (!finite(zrefScreenMm)) {
    return { ok: false, reason: "invalid-reference-depth", message: "zrefScreenMm must be finite" };
  }
  const zrefCameraMm = zrefScreenMm - cameraOriginScreenMm.z;
  if (!(zrefCameraMm > 0)) {
    return { ok: false, reason: "nonpositive-camera-depth", message: "ZrefCameraMm must be greater than zero" };
  }
  return {
    ok: true,
    calibration: Object.freeze({
      cameraOriginScreenMm: Object.freeze({ ...cameraOriginScreenMm }),
      zrefScreenMm,
      zrefCameraMm,
    }),
  };
}

export function calibrationFailure(reason: CalibrationFailure["reason"], message: string): CalibrationFailure {
  return { ok: false, reason, message };
}

export function validateSharedEstimatorCalibration(value: unknown): SharedEstimatorCalibration {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new RangeError("calibration must be an object");
  const candidate = value as { cameraOriginScreenMm?: unknown; zrefScreenMm?: unknown; zrefCameraMm?: unknown };
  if (!isFiniteCameraOriginScreenMm(candidate.cameraOriginScreenMm)) throw new RangeError("calibration.cameraOriginScreenMm must contain finite x, y, and z");
  if (!finite(candidate.zrefScreenMm) || !finite(candidate.zrefCameraMm) || !(candidate.zrefCameraMm > 0) || candidate.zrefCameraMm !== candidate.zrefScreenMm - candidate.cameraOriginScreenMm.z) throw new RangeError("calibration reference depths are invalid");
  return Object.freeze({
    cameraOriginScreenMm: Object.freeze({ ...candidate.cameraOriginScreenMm }),
    zrefScreenMm: candidate.zrefScreenMm,
    zrefCameraMm: candidate.zrefCameraMm,
  });
}

export function validObservationFace(observation: TrackingObservation): NonNullable<TrackingObservation["face"]> | null {
  return observation.face ?? null;
}
