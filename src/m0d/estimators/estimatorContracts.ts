import type { ScreenGeometry } from "../../engine/geometry/screenGeometry";
import type { RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";
import type { MonotonicMs, Vec3Mm } from "../../shared/contracts/primitives";
import type { CameraGeometry as SharedCameraGeometry } from "../../shared/contracts/calibration";
import type { TrackingObservation } from "../../mediapipe/trackingObservationNormalizer";

export type { RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";
export type CameraGeometry = SharedCameraGeometry;

export interface PoseEstimationContext<TCalibration> {
  readonly display: Readonly<ScreenGeometry>;
  readonly camera: Readonly<CameraGeometry>;
  readonly calibration: Readonly<TCalibration>;
}

export interface EstimatorEvaluation {
  readonly pose: RawViewerPose | null;
  readonly invalidReason: string | null;
}

export interface ViewerPoseEstimator<TCalibration = unknown> {
  readonly id: string;
  readonly version: string;
  validateCalibration(value: unknown): TCalibration;
  estimate(
    observation: TrackingObservation,
    context: PoseEstimationContext<TCalibration>,
  ): RawViewerPose | null;
  estimateWithDiagnostic(
    observation: TrackingObservation,
    context: PoseEstimationContext<TCalibration>,
  ): EstimatorEvaluation;
}

export function finitePosition(positionMm: Vec3Mm): boolean {
  return Number.isFinite(positionMm.x) && Number.isFinite(positionMm.y) && Number.isFinite(positionMm.z);
}

export function createPose(
  timestampMs: MonotonicMs,
  positionMm: Vec3Mm,
  estimatorId: string,
): RawViewerPose | null {
  if (!Number.isFinite(timestampMs) || timestampMs < 0 || !finitePosition(positionMm)) return null;
  if (positionMm.z <= 0) return null;
  return Object.freeze({
    timestampMs,
    positionMm: Object.freeze({ x: positionMm.x, y: positionMm.y, z: positionMm.z }),
    confidence: 1,
    estimatorId,
  });
}
