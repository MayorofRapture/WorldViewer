import {
  identityCalibrationTransform,
  type CalibrationProfile,
  type CalibrationTransformContract,
} from "../shared/contracts/calibration";
import type { RawViewerPose } from "../engine/pose/SyntheticViewerPoseSource";
import {
  applyCalibrationAndFilter,
  OneEuroPoseFilter,
  type OneEuroFilterConfiguration,
} from "../engine/filter/poseFilter";
import type { FilteredViewerPose } from "../engine/viewer/contracts";
import {
  MEDIAPIPE_FACIAL_TRANSFORM_ESTIMATOR_ID,
  validateEstimatorACalibration,
  type EstimatorACalibration,
} from "../m0d/estimators/mediaPipeFacialTransformEstimator";
import {
  createSelectedEstimatorACalibration,
  SELECTED_ESTIMATOR_VERSION,
} from "../m0e/selectedEstimatorHandoff";

export interface LivePoseProcessingPipelineOptions {
  readonly calibrationProfile: Readonly<CalibrationProfile>;
  readonly oneEuroConfiguration: OneEuroFilterConfiguration;
  readonly calibrationTransform?: CalibrationTransformContract;
}

function sameEstimatorACalibration(left: EstimatorACalibration, right: EstimatorACalibration): boolean {
  return left.cameraOriginScreenMm.x === right.cameraOriginScreenMm.x
    && left.cameraOriginScreenMm.y === right.cameraOriginScreenMm.y
    && left.cameraOriginScreenMm.z === right.cameraOriginScreenMm.z
    && left.zrefScreenMm === right.zrefScreenMm
    && left.zrefCameraMm === right.zrefCameraMm
    && left.canonicalPointCm.x === right.canonicalPointCm.x
    && left.canonicalPointCm.y === right.canonicalPointCm.y
    && left.canonicalPointCm.z === right.canonicalPointCm.z
    && left.zMedianRaw === right.zMedianRaw
    && left.scaleA === right.scaleA;
}

function validateSelectedEstimatorProfile(profile: Readonly<CalibrationProfile>): void {
  if (profile.estimator.id !== MEDIAPIPE_FACIAL_TRANSFORM_ESTIMATOR_ID || profile.estimator.version !== SELECTED_ESTIMATOR_VERSION) {
    throw new RangeError("calibration profile estimator does not match the selected Estimator A handoff");
  }
  let profileCalibration: EstimatorACalibration;
  try {
    profileCalibration = validateEstimatorACalibration(profile.estimator.parameters);
  } catch (error) {
    throw new RangeError("calibration profile estimator parameters do not match the selected Estimator A handoff", { cause: error });
  }
  if (!sameEstimatorACalibration(profileCalibration, createSelectedEstimatorACalibration())) {
    throw new RangeError("calibration profile estimator parameters do not match the selected Estimator A handoff");
  }
}

/** Host-private M0E4 RawViewerPose -> calibrated -> filtered pose boundary. */
export class LivePoseProcessingPipeline {
  private readonly profile: Readonly<CalibrationProfile>;
  private readonly calibrationTransform: CalibrationTransformContract;
  private readonly filter: OneEuroPoseFilter;
  private lastRawTimestampMs: number | null = null;
  private latestPose: FilteredViewerPose | null = null;

  public constructor(options: LivePoseProcessingPipelineOptions) {
    validateSelectedEstimatorProfile(options.calibrationProfile);
    this.profile = options.calibrationProfile;
    this.calibrationTransform = options.calibrationTransform ?? identityCalibrationTransform;
    this.filter = new OneEuroPoseFilter(options.oneEuroConfiguration);
  }

  /** Ingests one new raw sample. Duplicate/stale timestamps are ignored before either stage runs. */
  public ingest(sample: RawViewerPose): FilteredViewerPose | null {
    if (!Number.isFinite(sample.timestampMs) || sample.timestampMs < 0) {
      throw new RangeError("raw pose timestamp must be finite and non-negative");
    }
    if (this.lastRawTimestampMs !== null && sample.timestampMs <= this.lastRawTimestampMs) return null;
    this.lastRawTimestampMs = sample.timestampMs;

    const filtered = applyCalibrationAndFilter(sample, this.profile, this.calibrationTransform, this.filter);
    this.latestPose = filtered;
    return filtered;
  }

  public getLatestFilteredPose(): FilteredViewerPose | null {
    return this.latestPose;
  }
}
