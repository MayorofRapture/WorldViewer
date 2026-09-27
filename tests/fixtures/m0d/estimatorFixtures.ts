import type { NormalizedLandmark, TrackingObservation } from "../../../src/mediapipe/trackingObservationNormalizer";
import type { CanonicalPointCm } from "../../../src/m0d/estimators/canonicalFaceModel";

export const FIXTURE_CAMERA_ORIGIN = Object.freeze({ x: 0, y: 103.188, z: 0 });
export const FIXTURE_CANONICAL_POINT_CM: CanonicalPointCm = Object.freeze({ x: 0, y: 2.6246179342269897, z: 3.4656630754470825 });

export function affineMatrix(
  translationX = 0,
  translationY = 0,
  translationZ = -63.46566307544708,
  homogeneousW = 1,
): readonly number[] {
  return Object.freeze([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    translationX, translationY, translationZ, homogeneousW,
  ]);
}

function createLandmarks(
  overrides: Readonly<Record<number, NormalizedLandmark>> = {},
  missingIndex?: number,
): readonly NormalizedLandmark[] {
  const landmarks = Array.from({ length: 363 }, (_, index) => overrides[index] ?? Object.freeze({ x: 0.5, y: 0.5, z: 0 }));
  if (missingIndex !== undefined) delete landmarks[missingIndex];
  return Object.freeze(landmarks);
}

export function estimatorAObservation(options: {
  readonly timestampMs?: number;
  readonly matrix?: readonly number[];
  readonly missingMatrix?: boolean;
  readonly face?: boolean;
  readonly translationX?: number;
  readonly translationY?: number;
  readonly translationZ?: number;
  readonly homogeneousW?: number;
} = {}): TrackingObservation {
  const face = options.face === false ? undefined : {
    normalizedLandmarks: createLandmarks(),
    ...(options.missingMatrix === true ? {} : options.matrix === undefined ? { facialTransformMatrix: affineMatrix(options.translationX, options.translationY, options.translationZ, options.homogeneousW) } : { facialTransformMatrix: options.matrix }),
  };
  return Object.freeze({
    timestampMs: options.timestampMs ?? 1000,
    sourceId: "synthetic-estimator-camera",
    frame: Object.freeze({ widthPx: 640, heightPx: 360 }),
    confidence: 0.95,
    ...(face === undefined ? {} : { face }),
  });
}

export function estimatorBObservation(options: {
  readonly timestampMs?: number;
  readonly leftCenterPx?: readonly [number, number];
  readonly rightCenterPx?: readonly [number, number];
  readonly frameWidthPx?: number;
  readonly frameHeightPx?: number;
  readonly missingLandmarkIndex?: number;
  readonly nonFiniteLandmarkIndex?: number;
} = {}): TrackingObservation {
  const widthPx = options.frameWidthPx ?? 640;
  const heightPx = options.frameHeightPx ?? 360;
  const left = options.leftCenterPx ?? [300, 180];
  const right = options.rightCenterPx ?? [340, 180];
  const overrides: Record<number, NormalizedLandmark> = {
    33: { x: left[0] / widthPx, y: left[1] / heightPx, z: 0 },
    133: { x: left[0] / widthPx, y: left[1] / heightPx, z: 0 },
    362: { x: right[0] / widthPx, y: right[1] / heightPx, z: 0 },
    263: { x: right[0] / widthPx, y: right[1] / heightPx, z: 0 },
  };
  if (options.missingLandmarkIndex !== undefined) delete overrides[options.missingLandmarkIndex];
  if (options.nonFiniteLandmarkIndex !== undefined) overrides[options.nonFiniteLandmarkIndex] = { x: Number.NaN, y: 0, z: 0 };
  return Object.freeze({
    timestampMs: options.timestampMs ?? 1000,
    sourceId: "synthetic-estimator-camera",
    frame: Object.freeze({ widthPx, heightPx }),
    confidence: 0.95,
    face: Object.freeze({ normalizedLandmarks: createLandmarks(overrides, options.missingLandmarkIndex) }),
  });
}
