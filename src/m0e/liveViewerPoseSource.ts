import type { ScreenGeometry } from "../engine/geometry/screenGeometry";
import type { RawViewerPose, ViewerPoseSource } from "../engine/pose/SyntheticViewerPoseSource";
import type { CameraGeometry } from "../shared/contracts/calibration";
import type { MonotonicMs } from "../shared/contracts/primitives";
import { mediaPipeFacialTransformEstimator } from "../m0d/estimators/mediaPipeFacialTransformEstimator";
import type { PoseEstimationContext } from "../m0d/estimators/estimatorContracts";
import { createSelectedEstimatorACalibration } from "./selectedEstimatorHandoff";
import type { TrackingObservation } from "../mediapipe/trackingObservationNormalizer";
import type { TrackingSource } from "../mediapipe/mediapipeTrackingSource";

export interface LiveViewerPoseSourceOptions {
  readonly trackingSource: TrackingSource;
  readonly display: Readonly<ScreenGeometry>;
  readonly camera: Readonly<CameraGeometry>;
}

export type RawViewerPoseListener = (pose: RawViewerPose) => void;

/** Host-private M0E4 composition of live tracking and the selected M0D estimator. */
export class LiveViewerPoseSource implements ViewerPoseSource {
  private readonly trackingSource: TrackingSource;
  private readonly context: PoseEstimationContext<ReturnType<typeof createSelectedEstimatorACalibration>>;
  private readonly listeners = new Set<RawViewerPoseListener>();
  private unsubscribeTracking: (() => void) | undefined;
  private latestPose: RawViewerPose | null = null;
  private lastObservationTimestampMs: MonotonicMs | null = null;
  private started = false;
  private startPromise: Promise<void> | undefined;
  private stopPromise: Promise<void> | undefined;

  public constructor(options: LiveViewerPoseSourceOptions) {
    this.trackingSource = options.trackingSource;
    this.context = Object.freeze({
      display: options.display,
      camera: options.camera,
      calibration: createSelectedEstimatorACalibration(),
    });
  }

  public start(): Promise<void> {
    if (this.started) return Promise.resolve();
    if (this.startPromise !== undefined) return this.startPromise;
    if (this.stopPromise !== undefined) return this.stopPromise.then(() => this.start());

    this.resetPoseHistory();
    this.unsubscribeTracking = this.trackingSource.subscribe((observation) => this.acceptObservation(observation));
    this.startPromise = this.trackingSource.start().then(() => {
      this.started = true;
    }).catch(async (error: unknown) => {
      this.unsubscribeTracking?.();
      this.unsubscribeTracking = undefined;
      this.resetPoseHistory();
      await this.trackingSource.stop();
      throw error;
    }).finally(() => {
      this.startPromise = undefined;
    });
    return this.startPromise;
  }

  public stop(): Promise<void> {
    if (this.stopPromise !== undefined) return this.stopPromise;
    if (!this.started && this.startPromise === undefined) {
      this.resetPoseHistory();
      return Promise.resolve();
    }

    this.started = false;
    this.unsubscribeTracking?.();
    this.unsubscribeTracking = undefined;
    this.resetPoseHistory();
    this.stopPromise = this.trackingSource.stop().finally(() => {
      this.stopPromise = undefined;
    });
    return this.stopPromise;
  }

  public sample(_timestampMs: MonotonicMs): RawViewerPose | null {
    return this.latestPose;
  }

  public getHealth() {
    return this.trackingSource.getHealth();
  }

  public subscribe(listener: RawViewerPoseListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private acceptObservation(observation: TrackingObservation): void {
    if (!this.started && this.startPromise === undefined) return;
    if (this.lastObservationTimestampMs !== null && observation.timestampMs <= this.lastObservationTimestampMs) return;
    this.lastObservationTimestampMs = observation.timestampMs;

    const pose = mediaPipeFacialTransformEstimator.estimate(observation, this.context);
    if (pose === null) return;

    this.latestPose = pose;
    for (const listener of this.listeners) listener(pose);
  }

  private resetPoseHistory(): void {
    this.latestPose = null;
    this.lastObservationTimestampMs = null;
  }
}
