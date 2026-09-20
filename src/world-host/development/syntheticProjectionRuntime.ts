import type { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { createScreenGeometry, createVec3Mm, type ScreenGeometry } from "../../engine/geometry/screenGeometry";
import { applyOffAxisProjectionToCamera } from "../../engine/projection/cameraProjection";
import { applyPerspectiveStrength } from "../../engine/projection/perspectiveStrength";
import { SyntheticViewerPoseSource, type RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";
import { SYNTHETIC_MOTION_SCRIPTS, type SyntheticMotionScript } from "../../engine/pose/syntheticMotionScripts";
import type { MonotonicMs, Seconds, Vec3Mm } from "../../shared/contracts/primitives";
import type { TrackingHealth } from "../../shared/contracts/viewer";
import { ViewerStateController, type FilteredViewerPose } from "../../engine/viewer/ViewerStateController";
import type { WorldFrame } from "../../world-sdk/index";
import { createDiagnosticWorldHost, type DiagnosticWorldHost } from "./diagnosticBootstrap";

export const M0B_SYNTHETIC_SCREEN_WIDTH_MM = 345.4;
export const M0B_SYNTHETIC_SCREEN_HEIGHT_MM = 194.3;
export const M0B_SYNTHETIC_NEAR_MM = 50;
export const M0B_SYNTHETIC_FAR_MM = 5000;
export const MAX_WORLD_DELTA_SECONDS = 0.1;

export interface SyntheticProjectionRenderHost {
  readonly renderer: Pick<WebGLRenderer, "render">;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
}

export interface AnimationFrameScheduler {
  request(callback: (timestampMs: MonotonicMs) => void): number;
  cancel(handle: number): void;
}

export interface SyntheticProjectionRuntimeObservation {
  readonly frame: Readonly<WorldFrame>;
  readonly cameraPositionMm: Readonly<Vec3Mm>;
  readonly cameraQuaternion: readonly number[];
  readonly projectionMatrix: readonly number[];
  readonly syntheticPose: RawViewerPose | null;
}

export interface SyntheticProjectionRuntimeOptions {
  readonly observer?: (observation: SyntheticProjectionRuntimeObservation) => void;
  readonly onError?: (error: unknown) => void;
}

const browserAnimationFrameScheduler: AnimationFrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

export function clampWorldFrameDeltaSeconds(deltaSeconds: Seconds): Seconds {
  if (!Number.isFinite(deltaSeconds)) {
    throw new RangeError("world frame deltaSeconds must be finite");
  }
  if (deltaSeconds < 0) {
    throw new RangeError("world frame deltaSeconds must not be negative");
  }
  return Math.min(deltaSeconds, MAX_WORLD_DELTA_SECONDS);
}

function defaultMotionScript(): SyntheticMotionScript {
  const script = SYNTHETIC_MOTION_SCRIPTS.find((candidate) => candidate.id === "asymmetric-x-y");
  if (!script) throw new Error("asymmetric synthetic motion script is unavailable");
  return script;
}

class RuntimeMonotonicClock {
  private timestampMs: MonotonicMs = 0;

  set(timestampMs: MonotonicMs): void {
    this.timestampMs = timestampMs;
  }

  nowMs(): MonotonicMs {
    return this.timestampMs;
  }
}

export class SyntheticProjectionRuntime {
  readonly screenGeometry: ScreenGeometry;

  private readonly source: SyntheticViewerPoseSource;
  private readonly worldHost: DiagnosticWorldHost;
  private readonly scheduler: AnimationFrameScheduler;
  private readonly host: SyntheticProjectionRenderHost;
  private readonly perspectiveStrength: number;
  private readonly clock = new RuntimeMonotonicClock();
  private readonly controller = new ViewerStateController(this.clock);
  private readonly observer: ((observation: SyntheticProjectionRuntimeObservation) => void) | undefined;
  private readonly onError: ((error: unknown) => void) | undefined;
  private scheduledFrame: number | null = null;
  private started = false;
  private disposed = false;
  private frameNumber = 0;
  private lastTimestampMs: MonotonicMs | null = null;
  private scriptOriginTimestampMs: MonotonicMs | null = null;
  private latestPose: RawViewerPose | null = null;

  constructor(
    host: SyntheticProjectionRenderHost,
    motionScript: SyntheticMotionScript = defaultMotionScript(),
    scheduler: AnimationFrameScheduler = browserAnimationFrameScheduler,
    perspectiveStrength = 1,
    options: SyntheticProjectionRuntimeOptions = {},
  ) {
    this.host = host;
    this.scheduler = scheduler;
    this.source = new SyntheticViewerPoseSource(motionScript.samples);
    this.worldHost = createDiagnosticWorldHost(host.scene);
    this.screenGeometry = createScreenGeometry(M0B_SYNTHETIC_SCREEN_WIDTH_MM, M0B_SYNTHETIC_SCREEN_HEIGHT_MM);
    this.perspectiveStrength = perspectiveStrength;
    this.observer = options.observer;
    this.onError = options.onError;
  }

  async start(): Promise<void> {
    if (this.started || this.disposed) return;
    await this.worldHost.initialize();
    if (this.disposed) {
      await this.worldHost.dispose();
      return;
    }
    await this.source.start();
    this.controller.reset(createVec3Mm(0, 0, 600));
    this.started = true;
    this.scheduleNextFrame();
  }

  step(timestampMs: MonotonicMs): void {
    if (!this.started || this.disposed) return;

    if (this.scriptOriginTimestampMs === null) this.scriptOriginTimestampMs = timestampMs;
    this.clock.set(timestampMs);
    const sample = this.source.sample(timestampMs - this.scriptOriginTimestampMs);
    if (sample) this.latestPose = sample;

    const previousTimestampMs = this.lastTimestampMs;
    const deltaSeconds = clampWorldFrameDeltaSeconds(
      previousTimestampMs === null ? 0 : (timestampMs - previousTimestampMs) / 1000,
    );
    const filteredPose: FilteredViewerPose | null = this.latestPose === null
      ? null
      : Object.freeze({
        timestampMs: this.scriptOriginTimestampMs + this.latestPose.timestampMs,
        positionMm: this.latestPose.positionMm,
        velocityMmPerSec: Object.freeze({ x: 0, y: 0, z: 0 }),
        confidence: this.latestPose.confidence,
      });
    const tracking: TrackingHealth = this.latestPose === null
      ? { status: "acquiring", confidence: null, sinceMonotonicMs: timestampMs }
      : { status: "tracked", confidence: this.latestPose.confidence, sinceMonotonicMs: filteredPose!.timestampMs };
    const viewer = this.controller.update({
      tracking,
      filteredPose,
      neutralPositionMm: createVec3Mm(0, 0, 600),
    });
    const frame: WorldFrame = Object.freeze({
      frameNumber: this.frameNumber + 1,
      timestampMs,
      deltaSeconds,
      viewer,
    });
    const projectionEyeMm = applyPerspectiveStrength(
      frame.viewer.neutralPositionMm,
      frame.viewer.effectivePositionMm,
      this.perspectiveStrength,
    );
    applyOffAxisProjectionToCamera(
      this.host.camera,
      this.screenGeometry,
      projectionEyeMm,
      M0B_SYNTHETIC_NEAR_MM,
      M0B_SYNTHETIC_FAR_MM,
    );
    this.worldHost.update(frame);
    this.host.renderer.render(this.host.scene, this.host.camera);
    this.frameNumber += 1;
    this.observer?.({
      frame,
      cameraPositionMm: Object.freeze({ x: this.host.camera.position.x, y: this.host.camera.position.y, z: this.host.camera.position.z }),
      cameraQuaternion: Object.freeze([
        this.host.camera.quaternion.x,
        this.host.camera.quaternion.y,
        this.host.camera.quaternion.z,
        this.host.camera.quaternion.w,
      ]),
      projectionMatrix: Object.freeze(Array.from(this.host.camera.projectionMatrix.elements)),
      syntheticPose: this.latestPose,
    });

    this.lastTimestampMs = timestampMs;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    if (this.scheduledFrame !== null) {
      this.scheduler.cancel(this.scheduledFrame);
      this.scheduledFrame = null;
    }
    await this.source.stop();
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
