import type { MonotonicMs } from "../shared/contracts/primitives";

export interface NormalizedLandmark {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
  readonly visibility?: number;
}

export interface FaceObservation {
  readonly normalizedLandmarks: readonly NormalizedLandmark[];
  readonly facialTransformMatrix?: readonly number[];
}

export interface TrackingObservation {
  readonly timestampMs: MonotonicMs;
  readonly sourceId: string;
  readonly frame: Readonly<{
    widthPx: number;
    heightPx: number;
  }>;
  readonly confidence: number | null;
  readonly face?: FaceObservation;
}

export interface MediaPipeLandmarkInput {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
  readonly visibility?: number;
}

export interface MediaPipeMatrixInput {
  readonly rows: number;
  readonly columns: number;
  readonly data: readonly number[];
}

export interface MediaPipeFaceLandmarkerResultInput {
  readonly faceLandmarks: readonly (readonly MediaPipeLandmarkInput[])[];
  readonly facialTransformationMatrixes: readonly MediaPipeMatrixInput[];
}

export interface TrackingObservationMetadata {
  readonly timestampMs: number;
  readonly sourceId: string;
  readonly frame: Readonly<{
    widthPx: number;
    heightPx: number;
  }>;
  readonly confidence?: number | null;
  readonly previousTimestampMs?: number | null;
}

export type TrackingObservationFailureCode =
  | "invalid-metadata"
  | "invalid-timestamp"
  | "non-monotonic-timestamp"
  | "invalid-source-id"
  | "invalid-frame-dimensions"
  | "invalid-confidence"
  | "invalid-face-result"
  | "invalid-landmarks"
  | "invalid-landmark-value"
  | "invalid-matrix-count"
  | "invalid-matrix-dimensions"
  | "invalid-matrix-values";

export interface TrackingObservationValidationFailure {
  readonly code: TrackingObservationFailureCode;
  readonly path: string;
  readonly message: string;
}

export type TrackingObservationNormalizationResult =
  | { readonly ok: true; readonly observation: TrackingObservation }
  | { readonly ok: false; readonly failure: TrackingObservationValidationFailure };

type TrackingObservationFailureResult = Extract<TrackingObservationNormalizationResult, { readonly ok: false }>;

const REQUIRED_LANDMARK_INDEX = 362;

function failure(code: TrackingObservationFailureCode, path: string, message: string): TrackingObservationFailureResult {
  return { ok: false, failure: { code, path, message } };
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function isFailure(value: TrackingObservationFailureResult | readonly unknown[]): value is TrackingObservationFailureResult {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === false;
}

function copyLandmarks(landmarks: readonly MediaPipeLandmarkInput[]): TrackingObservationFailureResult | readonly NormalizedLandmark[] {
  if (landmarks.length <= REQUIRED_LANDMARK_INDEX) {
    return failure("invalid-landmarks", "faceLandmarks[0]", "the face landmark array does not preserve required landmark indices");
  }

  const copied: NormalizedLandmark[] = [];
  for (const [index, landmark] of landmarks.entries()) {
    if (landmark === null || typeof landmark !== "object") {
      return failure("invalid-landmark-value", `faceLandmarks[0][${index}]`, "landmark must be an object");
    }
    if (!finite(landmark.x) || !finite(landmark.y) || (landmark.z !== undefined && !finite(landmark.z)) || (landmark.visibility !== undefined && !finite(landmark.visibility))) {
      return failure("invalid-landmark-value", `faceLandmarks[0][${index}]`, "landmark coordinates and visibility must be finite");
    }
    copied.push({ x: landmark.x, y: landmark.y, ...(landmark.z === undefined ? {} : { z: landmark.z }), ...(landmark.visibility === undefined ? {} : { visibility: landmark.visibility }) });
  }
  return copied;
}

function copyMatrix(matrix: MediaPipeMatrixInput): TrackingObservationFailureResult | readonly number[] {
  if (matrix === null || typeof matrix !== "object" || matrix.rows !== 4 || matrix.columns !== 4) {
    return failure("invalid-matrix-dimensions", "facialTransformationMatrixes[0]", "facial transformation matrix must be 4 by 4");
  }
  if (!Array.isArray(matrix.data) || matrix.data.length !== 16) {
    return failure("invalid-matrix-dimensions", "facialTransformationMatrixes[0].data", "facial transformation matrix data must contain exactly 16 values");
  }
  if (matrix.data.some((value) => !finite(value))) {
    return failure("invalid-matrix-values", "facialTransformationMatrixes[0].data", "facial transformation matrix data must be finite");
  }
  return [...matrix.data];
}

export function normalizeTrackingObservation(
  result: MediaPipeFaceLandmarkerResultInput,
  metadata: TrackingObservationMetadata,
): TrackingObservationNormalizationResult {
  if (metadata === null || typeof metadata !== "object") {
    return failure("invalid-metadata", "metadata", "metadata must be an object");
  }
  if (metadata.frame === null || typeof metadata.frame !== "object") {
    return failure("invalid-frame-dimensions", "metadata.frame", "frame dimensions must be provided as an object");
  }
  if (!finite(metadata.timestampMs) || metadata.timestampMs < 0) {
    return failure("invalid-timestamp", "metadata.timestampMs", "timestamp must be finite and non-negative");
  }
  if (metadata.previousTimestampMs !== undefined && metadata.previousTimestampMs !== null && (!finite(metadata.previousTimestampMs) || metadata.previousTimestampMs < 0)) {
    return failure("invalid-timestamp", "metadata.previousTimestampMs", "previous timestamp must be finite and non-negative");
  }
  if (metadata.previousTimestampMs !== undefined && metadata.previousTimestampMs !== null && metadata.timestampMs < metadata.previousTimestampMs) {
    return failure("non-monotonic-timestamp", "metadata.timestampMs", "timestamp must not precede the previous observation timestamp");
  }
  if (typeof metadata.sourceId !== "string" || metadata.sourceId.trim().length === 0) {
    return failure("invalid-source-id", "metadata.sourceId", "source ID must be a non-empty string");
  }
  if (!finite(metadata.frame.widthPx) || metadata.frame.widthPx <= 0 || !finite(metadata.frame.heightPx) || metadata.frame.heightPx <= 0) {
    return failure("invalid-frame-dimensions", "metadata.frame", "frame dimensions must be finite and positive");
  }
  const confidence = metadata.confidence ?? null;
  if (confidence !== null && (!finite(confidence) || confidence < 0 || confidence > 1)) {
    return failure("invalid-confidence", "metadata.confidence", "confidence must be null or finite between zero and one");
  }
  if (result === null || typeof result !== "object" || !Array.isArray(result.faceLandmarks) || !Array.isArray(result.facialTransformationMatrixes)) {
    return failure("invalid-face-result", "result", "result must provide faceLandmarks and facialTransformationMatrixes arrays");
  }
  if (result.faceLandmarks.length > 1 || result.facialTransformationMatrixes.length > 1) {
    return failure("invalid-face-result", "result", "the normalized contract supports one face and one transformation matrix");
  }

  let face: FaceObservation | undefined;
  if (result.faceLandmarks.length === 1) {
    const landmarks = copyLandmarks(result.faceLandmarks[0]!);
    if (isFailure(landmarks)) return landmarks;
    const faceValue: { normalizedLandmarks: readonly NormalizedLandmark[]; facialTransformMatrix?: readonly number[] } = { normalizedLandmarks: landmarks };
    if (result.facialTransformationMatrixes.length === 1) {
      const matrix = copyMatrix(result.facialTransformationMatrixes[0]!);
      if (isFailure(matrix)) return matrix;
      faceValue.facialTransformMatrix = matrix;
    }
    face = faceValue;
  } else if (result.facialTransformationMatrixes.length === 1) {
    return failure("invalid-face-result", "facialTransformationMatrixes", "a transformation matrix cannot be present without a detected face");
  }

  return deepFreeze({
    ok: true as const,
    observation: {
      timestampMs: metadata.timestampMs,
      sourceId: metadata.sourceId,
      frame: { widthPx: metadata.frame.widthPx, heightPx: metadata.frame.heightPx },
      confidence,
      ...(face === undefined ? {} : { face }),
    },
  });
}
