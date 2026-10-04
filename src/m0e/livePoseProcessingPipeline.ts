import {
  identityCalibrationTransform,
  type CalibrationProfile,
  type CalibrationTransformContract,
  validateCalibrationProfile,
} from "../shared/contracts/calibration";
import type { RawViewerPose } from "../engine/pose/SyntheticViewerPoseSource";
import type { MonotonicMs } from "../shared/contracts/primitives";
import type { TrackingHealth } from "../shared/contracts/viewer";
import {
  applyCalibrationAndFilter,
  OneEuroPoseFilter,
  type OneEuroFilterConfiguration,
} from "../engine/filter/poseFilter";
import type { FilteredViewerPose, ViewerStateControllerContract } from "../engine/viewer/contracts";
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
  readonly source?: LivePoseSource;
  readonly controller?: ViewerStateControllerContract;
}

export interface LivePoseSource {
  start(): Promise<void>;
  stop(): Promise<void>;
  sample(timestampMs: MonotonicMs): RawViewerPose | null;
  subscribe(listener: (pose: RawViewerPose | null) => void): () => void;
  getHealth(): Readonly<TrackingHealth>;
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

function validateSelectedEstimatorProfile(profile: Readonly<CalibrationProfile>): CalibrationProfile {
  const validated = validateCalibrationProfile(profile);
  if (validated.estimator.id !== MEDIAPIPE_FACIAL_TRANSFORM_ESTIMATOR_ID || validated.estimator.version !== SELECTED_ESTIMATOR_VERSION) {
    throw new RangeError("calibration profile estimator does not match the selected Estimator A handoff");
  }
  let profileCalibration: EstimatorACalibration;
  try {
    profileCalibration = validateEstimatorACalibration(validated.estimator.parameters);
  } catch (error) {
    throw new RangeError("calibration profile estimator parameters do not match the selected Estimator A handoff", { cause: error });
  }
  if (!sameEstimatorACalibration(profileCalibration, createSelectedEstimatorACalibration())) {
    throw new RangeError("calibration profile estimator parameters do not match the selected Estimator A handoff");
  }
  return validated;
}

function sameCalibrationProfile(left: Readonly<CalibrationProfile>, right: Readonly<CalibrationProfile>): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Host-private M0E4 RawViewerPose -> calibrated -> filtered pose boundary. */
export class LivePoseProcessingPipeline {
  private profile: Readonly<CalibrationProfile>;
  private readonly calibrationTransform: CalibrationTransformContract;
  private filter: OneEuroPoseFilter;
  private readonly controller: ViewerStateControllerContract | undefined;
  private source: LivePoseSource | undefined;
  private sourceUnsubscribe: (() => void) | undefined;
  private sourceGeneration = 0;
  private started = false;
  private disposed = false;
  private stopPromise: Promise<void> | undefined;
  private lastRawTimestampMs: number | null = null;
  private latestPose: FilteredViewerPose | null = null;
  private processingFailureReason: string | null = null;

  public constructor(options: LivePoseProcessingPipelineOptions) {
    this.profile = validateSelectedEstimatorProfile(options.calibrationProfile);
    this.calibrationTransform = options.calibrationTransform ?? identityCalibrationTransform;
    this.filter = new OneEuroPoseFilter(options.oneEuroConfiguration);
    this.controller = options.controller;
    if (this.controller !== undefined) this.controller.reset(this.profile.neutralViewerPositionMm);
    if (options.source !== undefined) {
      this.source = options.source;
      this.attachSource(options.source);
    }
  }

  /** Ingests one new raw sample. Duplicate/stale timestamps are ignored before either stage runs. */
  public ingest(sample: RawViewerPose): FilteredViewerPose | null {
    this.assertUsable();
    if (!Number.isFinite(sample.timestampMs) || sample.timestampMs < 0) {
      throw new RangeError("raw pose timestamp must be finite and non-negative");
    }
    if (this.lastRawTimestampMs !== null && sample.timestampMs <= this.lastRawTimestampMs) return null;
    this.lastRawTimestampMs = sample.timestampMs;

    const filtered = applyCalibrationAndFilter(sample, this.profile, this.calibrationTransform, this.filter);
    this.latestPose = filtered;
    this.processingFailureReason = null;
    return filtered;
  }

  public getLatestFilteredPose(): FilteredViewerPose | null {
    return this.latestPose;
  }

  public getCalibrationProfile(): Readonly<CalibrationProfile> {
    return this.profile;
  }

  public async start(): Promise<void> {
    this.assertUsable();
    if (this.source === undefined || this.started) return;
    if (this.sourceUnsubscribe === undefined) this.attachSource(this.source);
    this.started = true;
    try {
      await this.source.start();
    } catch (error) {
      this.started = false;
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (this.stopPromise !== undefined) return this.stopPromise;
    this.started = false;
    const source = this.source;
    this.clearSourceSubscription();
    this.clearPoseHistory();
    this.stopPromise = (source === undefined ? Promise.resolve() : source.stop()).finally(() => {
      this.stopPromise = undefined;
    });
    return this.stopPromise;
  }

  public async replaceSource(source: LivePoseSource): Promise<void> {
    this.assertUsable();
    if (source === this.source) return;
    const wasStarted = this.started;
    const oldSource = this.source;

    // Stop the current source before installing the replacement.  While the
    // stop is pending, callbacks from the old generation are blocked without
    // destroying the current pose/filter state prematurely.
    this.started = false;
    this.sourceGeneration += 1;
    this.clearSourceSubscription();
    try {
      if (oldSource !== undefined && wasStarted) await oldSource.stop();
    } catch (error) {
      this.clearPoseHistory();
      throw error;
    }

    this.clearPoseHistory();
    this.source = source;
    this.attachSource(source);
    if (!wasStarted) return;

    this.started = true;
    try {
      await source.start();
    } catch (replacementError) {
      this.started = false;
      this.sourceGeneration += 1;
      this.clearSourceSubscription();
      let cleanupError: unknown;
      try {
        await source.stop();
      } catch (error) {
        cleanupError = error;
      }
      this.clearPoseHistory();

      if (cleanupError !== undefined) {
        throw new AggregateError(
          [replacementError, cleanupError],
          "source replacement failed and replacement cleanup also failed; previous source was not restored",
        );
      }

      if (oldSource === undefined) {
        throw this.replacementFailure(replacementError, cleanupError);
      }

      this.source = oldSource;
      this.attachSource(oldSource);
      this.started = true;
      try {
        await oldSource.start();
      } catch (restoreError) {
        this.started = false;
        this.sourceGeneration += 1;
        this.clearSourceSubscription();
        this.clearPoseHistory();
        throw new AggregateError(
          [replacementError, ...(cleanupError === undefined ? [] : [cleanupError]), restoreError],
          "source replacement failed and restoring the previous source also failed",
        );
      }

      throw this.replacementFailure(replacementError, cleanupError);
    }
  }

  public replaceCalibrationProfile(profile: Readonly<CalibrationProfile>): void {
    this.assertUsable();
    const validated = validateSelectedEstimatorProfile(profile);
    if (sameCalibrationProfile(this.profile, validated)) return;
    this.profile = validated;
    this.clearPoseHistory();
  }

  /** Replaces filter configuration without restarting the active source. */
  public replaceOneEuroConfiguration(configuration: OneEuroFilterConfiguration): void {
    this.assertUsable();
    this.filter = new OneEuroPoseFilter(configuration);
    this.clearPoseHistory();
  }

  public updateViewerState(): ReturnType<ViewerStateControllerContract["update"]> | null {
    if (this.controller === undefined || this.source === undefined) return null;
    const sourceHealth = this.source.getHealth();
    const tracking = this.processingFailureReason === null || sourceHealth.status !== "tracked"
      ? sourceHealth
      : Object.freeze({
        status: "degraded" as const,
        confidence: sourceHealth.confidence,
        sinceMonotonicMs: sourceHealth.sinceMonotonicMs,
        reasonCode: this.processingFailureReason,
      });
    return this.controller.update({
      tracking,
      filteredPose: this.latestPose,
      neutralPositionMm: this.profile.neutralViewerPositionMm,
    });
  }

  public async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    await this.stop();
    this.source = undefined;
  }

  private attachSource(source: LivePoseSource): void {
    const generation = this.sourceGeneration;
    this.sourceUnsubscribe = source.subscribe((pose) => {
      if (this.disposed || generation !== this.sourceGeneration || source !== this.source || !this.started) return;
      if (pose === null) {
        this.latestPose = null;
        this.processingFailureReason = "pose-processing-failed";
        return;
      }
      try {
        this.ingest(pose);
      } catch {
        this.latestPose = null;
        this.processingFailureReason = "pose-processing-failed";
      }
    });
  }

  private clearSourceSubscription(): void {
    this.sourceUnsubscribe?.();
    this.sourceUnsubscribe = undefined;
  }

  private clearPoseHistory(): void {
    this.lastRawTimestampMs = null;
    this.latestPose = null;
    this.processingFailureReason = null;
    this.filter.reset();
    this.controller?.reset(this.profile.neutralViewerPositionMm);
  }

  private replacementFailure(replacementError: unknown, cleanupError: unknown): Error {
    if (cleanupError === undefined) {
      return new Error("source replacement failed; previous source was restored", { cause: replacementError });
    }
    return new AggregateError(
      [replacementError, cleanupError],
      "source replacement failed and stopping the replacement source also failed; previous source was restored",
    );
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error("live pose processing pipeline is disposed");
  }
}
