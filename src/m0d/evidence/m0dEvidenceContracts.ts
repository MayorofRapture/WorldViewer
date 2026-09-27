import type { Vec3Mm } from "../../shared/contracts/primitives";
import type { TrackingObservation } from "../../mediapipe/trackingObservationNormalizer";

export const M0D_EVIDENCE_SCHEMA_VERSION = 1 as const;
export const M0D_VALIDATOR_VERSION = 1 as const;
export const M0D_EXPERIMENT_SPEC_VERSION = "0.4" as const;
export const M0D_EXPERIMENT_PROCEDURE_VERSION = 3 as const;

export const M0D_REQUIRED_LANDMARK_INDICES = [33, 133, 362, 263] as const;
export type M0DRequiredLandmarkIndex = typeof M0D_REQUIRED_LANDMARK_INDICES[number];
export type M0DRequiredLandmarkKey = `${M0DRequiredLandmarkIndex}`;

export type M0DJsonPrimitive = string | number | boolean | null;
export type M0DJsonValue = M0DJsonPrimitive | readonly M0DJsonValue[] | { readonly [key: string]: M0DJsonValue };

export interface M0DSerializedLandmark {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type M0DRequiredLandmarks = Readonly<Record<M0DRequiredLandmarkKey, M0DSerializedLandmark>>;

/** Serializable normalized estimator input. It intentionally excludes envelope metadata. */
export interface M0DObservationRecord {
  readonly schemaVersion: number;
  readonly sequenceNumber: number;
  readonly timestampMs: number;
  readonly sourceId: string;
  readonly frameWidthPx: number;
  readonly frameHeightPx: number;
  readonly trackerConfidence: number | null;
  readonly faceDetected: boolean;
  readonly landmarks: M0DRequiredLandmarks | null;
  readonly facialTransformMatrix: readonly number[] | null;
}

export interface M0DWorkerTiming {
  readonly inferenceDurationMs: number | null;
  readonly completedAtMs: number | null;
}

/** Evidence-only fields kept outside the core normalized estimator input. */
export interface M0DEvidenceEnvelope {
  readonly schemaVersion: number;
  readonly sequenceNumber: number;
  readonly traceId: string;
  readonly scenarioId: string;
  readonly segmentId: string;
  readonly trialId?: string;
  readonly attemptId?: string;
  readonly experimentRunId: string;
  readonly configurationIds: readonly string[];
  readonly configurationHashes: readonly string[];
  readonly workerTiming: M0DWorkerTiming;
  readonly diagnostics: { readonly [key: string]: M0DJsonValue };
}

export interface M0DObservationTraceRecord {
  readonly observation: M0DObservationRecord;
  readonly envelope: M0DEvidenceEnvelope;
}

export interface M0DReplayOutputRecord {
  readonly schemaVersion: number;
  readonly timestampMs: number;
  readonly observationTraceId: string;
  readonly estimatorId: string;
  readonly estimatorConfigHash: string;
  readonly valid: boolean;
  readonly positionMm: Vec3Mm | null;
  readonly invalidReason: string | null;
  readonly estimatorProcessingMs: number;
}

export interface M0DCameraConfiguration {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly fps: number;
}

export interface M0DDisplayReference {
  readonly profileId: string;
  readonly reference: string;
}

export interface M0DEstimatorConfigurationIdentity {
  readonly estimatorId: string;
  readonly configHash: string;
}

export type M0DCameraOriginScreenMm = Vec3Mm;

export interface M0DRunManifest {
  readonly schemaVersion: number;
  readonly experimentSpecVersion: string;
  readonly experimentProcedureVersion: number;
  readonly applicationBuildCommit: string;
  readonly mediaPipePackageVersion: string;
  readonly mediaPipeModelVersion: string;
  readonly canonicalModelSource: string;
  readonly canonicalModelHash: string;
  readonly cameraConfiguration: M0DCameraConfiguration;
  readonly display: M0DDisplayReference;
  readonly cameraOriginScreenMm: M0DCameraOriginScreenMm;
  readonly estimatorA: M0DEstimatorConfigurationIdentity;
  readonly estimatorB: M0DEstimatorConfigurationIdentity;
  readonly runStartTimestampMs: number;
  readonly runEndTimestampMs: number;
}

export interface M0DCalibrationReference {
  readonly zrefScreenMm: number;
  readonly cameraOriginScreenMm: M0DCameraOriginScreenMm;
}

export type M0DCalibrationValidationResult =
  | { readonly ok: true; readonly zrefCameraMm: number }
  | { readonly ok: false; readonly code: "invalid-camera-origin" | "invalid-reference-depth" | "nonpositive-camera-depth"; readonly message: string };

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteCameraOriginScreenMm(value: unknown): value is M0DCameraOriginScreenMm {
  return record(value) && finite(value.x) && finite(value.y) && finite(value.z);
}

export function deriveZrefCameraMm(
  zrefScreenMm: number,
  cameraOriginScreenMm: M0DCameraOriginScreenMm,
): number {
  if (!finite(zrefScreenMm)) throw new RangeError("zrefScreenMm must be finite");
  if (!isFiniteCameraOriginScreenMm(cameraOriginScreenMm)) throw new RangeError("cameraOriginScreenMm must contain finite x, y, and z");
  const zrefCameraMm = zrefScreenMm - cameraOriginScreenMm.z;
  if (!(zrefCameraMm > 0)) throw new RangeError("ZrefCameraMm must be greater than zero");
  return zrefCameraMm;
}

export function validateCalibrationReference(reference: M0DCalibrationReference): M0DCalibrationValidationResult {
  if (!isFiniteCameraOriginScreenMm(reference.cameraOriginScreenMm)) {
    return { ok: false, code: "invalid-camera-origin", message: "cameraOriginScreenMm must contain finite x, y, and z" };
  }
  if (!finite(reference.zrefScreenMm)) {
    return { ok: false, code: "invalid-reference-depth", message: "zrefScreenMm must be finite" };
  }
  const zrefCameraMm = reference.zrefScreenMm - reference.cameraOriginScreenMm.z;
  if (!(zrefCameraMm > 0)) {
    return { ok: false, code: "nonpositive-camera-depth", message: "ZrefCameraMm must be greater than zero" };
  }
  return { ok: true, zrefCameraMm };
}

export function createM0DObservationRecord(
  observation: TrackingObservation,
  sequenceNumber: number,
): M0DObservationRecord {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 0) {
    throw new RangeError("sequenceNumber must be a non-negative integer");
  }

  const face = observation.face;
  const landmarks = face === undefined
    ? null
    : Object.fromEntries(M0D_REQUIRED_LANDMARK_INDICES.map((index) => {
        const landmark = face.normalizedLandmarks[index];
        if (landmark === undefined || landmark.z === undefined) {
          throw new RangeError(`TrackingObservation is missing required landmark ${index} with z`);
        }
        return [String(index), { x: landmark.x, y: landmark.y, z: landmark.z }];
      })) as M0DRequiredLandmarks;

  return {
    schemaVersion: M0D_EVIDENCE_SCHEMA_VERSION,
    sequenceNumber,
    timestampMs: observation.timestampMs,
    sourceId: observation.sourceId,
    frameWidthPx: observation.frame.widthPx,
    frameHeightPx: observation.frame.heightPx,
    trackerConfidence: observation.confidence,
    faceDetected: face !== undefined,
    landmarks,
    facialTransformMatrix: face?.facialTransformMatrix === undefined ? null : [...face.facialTransformMatrix],
  };
}
