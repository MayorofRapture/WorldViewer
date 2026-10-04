import type { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { createDiagnosticWorldHost, type DiagnosticWorldHost } from "../../world-host/development/diagnosticBootstrap";
import { clampWorldFrameDeltaSeconds, type AnimationFrameScheduler } from "../../world-host/development/syntheticProjectionRuntime";
import { applyOffAxisProjectionToCamera } from "../../engine/projection/cameraProjection";
import { applyPerspectiveStrength } from "../../engine/projection/perspectiveStrength";
import type { ScreenGeometry } from "../../engine/geometry/screenGeometry";
import { ViewerStateController } from "../../engine/viewer/ViewerStateController";
import type { MonotonicMs } from "../../shared/contracts/primitives";
import type { CalibrationProfile } from "../../shared/contracts/calibration";
import type { WorldFrame } from "../../world-sdk/index";
import { LivePoseProcessingPipeline, type LivePoseSource } from "../livePoseProcessingPipeline";
import type { OneEuroFilterConfiguration } from "../../engine/filter/poseFilter";
import type { M0E7DevelopmentSession } from "./m0e7PerceptualComparison";

export const M0E7_COMPARISON_PERSPECTIVE_STRENGTH = 1.0;
export const M0E7_COMPARISON_NEAR_MM = 50;
export const M0E7_COMPARISON_FAR_MM = 5000;
const ONE_EURO_INITIAL_FREQUENCY_HZ = 60;

export interface M0E7ComparisonRenderHost {
  readonly renderer: Pick<WebGLRenderer, "render">;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
}

export interface M0E7DiagnosticComparisonRuntimeOptions {
  readonly renderHost: M0E7ComparisonRenderHost;
  readonly session: M0E7DevelopmentSession;
  readonly calibrationProfile: Readonly<CalibrationProfile>;
  readonly source: LivePoseSource;
  readonly screenGeometry: Readonly<ScreenGeometry>;
  readonly scheduler: AnimationFrameScheduler;
  readonly worldHost?: DiagnosticWorldHost;
  readonly onFrame?: (frame: Readonly<WorldFrame>) => void;
  readonly onError?: (error: unknown) => void;
}

class RuntimeClock {
  private timestampMs: MonotonicMs = 0;

  set(timestampMs: MonotonicMs): void {
    this.timestampMs = timestampMs;
  }

  nowMs(): MonotonicMs {
    return this.timestampMs;
  }
}

function configurationForCandidate(session: M0E7DevelopmentSession, alias: string): OneEuroFilterConfiguration {
  const provenance = session.candidateProvenance.find((candidate) => candidate.alias === alias);
  if (provenance === undefined) throw new RangeError(`unknown M0E7 candidate alias: ${alias}`);
  return Object.freeze({
    minCutoffHz: provenance.configuration.minCutoffHz,
    beta: provenance.configuration.beta,
    dCutoffHz: provenance.configuration.dCutoffHz,
    initialFrequencyHz: ONE_EURO_INITIAL_FREQUENCY_HZ,
  });
}

const browserAnimationFrameScheduler: AnimationFrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/** Host-private M0E7A live diagnostic runtime. It has no candidate default. */
export class M0E7DiagnosticComparisonRuntime {
  private readonly host: M0E7ComparisonRenderHost;
  private readonly session: M0E7DevelopmentSession;
  private readonly calibrationProfile: Readonly<CalibrationProfile>;
  private readonly source: LivePoseSource;
  private readonly screenGeometry: Readonly<ScreenGeometry>;
  private readonly scheduler: AnimationFrameScheduler;
  private readonly worldHost: DiagnosticWorldHost;
  private readonly onFrame: ((frame: Readonly<WorldFrame>) => void) | undefined;
  private readonly onError: ((error: unknown) => void) | undefined;
  private readonly clock = new RuntimeClock();
  private readonly controller = new ViewerStateController(this.clock);
  private pipeline: LivePoseProcessingPipeline | undefined;
  private scheduledFrame: number | null = null;
  private startPromise: Promise<void> | undefined;
  private started = false;
  private disposed = false;
  private activeAlias: string | null = null;
  private frameNumber = 0;
  private lastTimestampMs: MonotonicMs | null = null;

  constructor(options: M0E7DiagnosticComparisonRuntimeOptions) {
    this.host = options.renderHost;
    this.session = options.session;
    this.calibrationProfile = options.calibrationProfile;
    this.source = options.source;
    this.screenGeometry = options.screenGeometry;
    this.scheduler = options.scheduler ?? browserAnimationFrameScheduler;
    this.worldHost = options.worldHost ?? createDiagnosticWorldHost(options.renderHost.scene);
    this.onFrame = options.onFrame;
    this.onError = options.onError;
  }

  getActiveCandidateAlias(): string | null {
    return this.activeAlias;
  }

  activateCandidate(alias: string): void {
    if (this.disposed) throw new Error("M0E7 diagnostic comparison runtime is disposed");
    const configuration = configurationForCandidate(this.session, alias);
    if (this.pipeline === undefined) {
      this.pipeline = new LivePoseProcessingPipeline({
        calibrationProfile: this.calibrationProfile,
        oneEuroConfiguration: configuration,
        source: this.source,
        controller: this.controller,
      });
    } else {
      this.pipeline.replaceOneEuroConfiguration(configuration);
    }
    this.activeAlias = alias;
  }

  async start(): Promise<void> {
    if (this.disposed) return;
    if (this.started) return;
    if (this.startPromise !== undefined) return this.startPromise;
    if (this.pipeline === undefined) throw new Error("activate an M0E7 candidate before starting the runtime");

    this.startPromise = (async () => {
      try {
        await this.worldHost.initialize();
        if (this.disposed) return;
        await this.pipeline!.start();
        if (this.disposed) {
          await this.pipeline!.dispose();
          return;
        }
        this.started = true;
        this.scheduleNextFrame();
      } catch (error) {
        const cleanupErrors: unknown[] = [];
        try {
          await this.pipeline?.dispose();
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
        try {
          await this.worldHost.dispose();
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
        if (cleanupErrors.length > 0) {
          throw new AggregateError([error, ...cleanupErrors], "M0E7 diagnostic runtime startup and cleanup failed");
        }
        throw error;
      }
    })().finally(() => {
      this.startPromise = undefined;
    });
    return this.startPromise;
  }

  step(timestampMs: MonotonicMs): void {
    if (!this.started || this.disposed) return;
    this.clock.set(timestampMs);
    const deltaSeconds = clampWorldFrameDeltaSeconds(
      this.lastTimestampMs === null ? 0 : (timestampMs - this.lastTimestampMs) / 1000,
    );
    const viewer = this.pipeline!.updateViewerState();
    if (viewer === null) throw new Error("M0E7 diagnostic runtime pipeline has no viewer-state controller");
    const frame: WorldFrame = Object.freeze({ frameNumber: this.frameNumber + 1, timestampMs, deltaSeconds, viewer });
    const projectionEyeMm = applyPerspectiveStrength(frame.viewer.neutralPositionMm, frame.viewer.effectivePositionMm, M0E7_COMPARISON_PERSPECTIVE_STRENGTH);
    applyOffAxisProjectionToCamera(this.host.camera, this.screenGeometry, projectionEyeMm, M0E7_COMPARISON_NEAR_MM, M0E7_COMPARISON_FAR_MM);
    this.worldHost.update(frame);
    this.host.renderer.render(this.host.scene, this.host.camera);
    this.frameNumber += 1;
    this.lastTimestampMs = timestampMs;
    this.onFrame?.(frame);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    const pendingStart = this.startPromise;
    if (this.scheduledFrame !== null) {
      this.scheduler.cancel(this.scheduledFrame);
      this.scheduledFrame = null;
    }
    if (pendingStart !== undefined) {
      try {
        await pendingStart;
      } catch {
        // Startup cleanup is followed by definitive disposal below.
      }
    }
    await this.pipeline?.dispose();
    await this.worldHost.dispose();
  }

  private scheduleNextFrame(): void {
    this.scheduledFrame = this.scheduler.request((timestampMs) => {
      this.scheduledFrame = null;
      try {
        this.step(timestampMs);
        if (!this.disposed) this.scheduleNextFrame();
      } catch (error) {
        this.onError?.(error);
      }
    });
  }
}

export { browserAnimationFrameScheduler };
