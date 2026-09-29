import { PINNED_CANONICAL_FACE_MODEL } from "../m0d/estimators/canonicalFaceModel";
import { MEDIAPIPE_FACIAL_TRANSFORM_ESTIMATOR_ID, validateEstimatorACalibration, type EstimatorACalibration } from "../m0d/estimators/mediaPipeFacialTransformEstimator";

export const SELECTED_ESTIMATOR_VERSION = "v1" as const;
export const SELECTED_ESTIMATOR_CONFIG_HASH = "fnv1a64-825a99daebb20f6c" as const;

/** Host-private M0D -> M0E handoff. M0E4 may consume this boundary; world packages may not. */
export function createSelectedEstimatorACalibration(): EstimatorACalibration {
  return validateEstimatorACalibration({
    cameraOriginScreenMm: { x: 0, y: 103.188, z: 0 },
    zrefScreenMm: 600,
    zrefCameraMm: 600,
    canonicalPointCm: PINNED_CANONICAL_FACE_MODEL.cyclopeanPointCm,
    zMedianRaw: 476.5052488113386,
    scaleA: 1.259167661839453,
  });
}

export function selectedEstimatorIdentity(): { readonly id: typeof MEDIAPIPE_FACIAL_TRANSFORM_ESTIMATOR_ID; readonly version: typeof SELECTED_ESTIMATOR_VERSION; readonly configHash: typeof SELECTED_ESTIMATOR_CONFIG_HASH } {
  return Object.freeze({ id: MEDIAPIPE_FACIAL_TRANSFORM_ESTIMATOR_ID, version: SELECTED_ESTIMATOR_VERSION, configHash: SELECTED_ESTIMATOR_CONFIG_HASH });
}
