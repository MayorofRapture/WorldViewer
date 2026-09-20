import type { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { createScreenGeometry, createVec3Mm, type ScreenGeometry } from "../../engine/geometry/screenGeometry";
import { applyOffAxisProjectionToCamera } from "../../engine/projection/cameraProjection";
import { SyntheticViewerPoseSource, type RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";
import { SYNTHETIC_MOTION_SCRIPTS, type SyntheticMotionScript } from "../../engine/pose/syntheticMotionScripts";
import type { MonotonicMs, Seconds, Vec3Mm, Vec3MmPerSec } from "../../shared/contracts/primitives";
import type { ViewerState, WorldFrame } from "../../world-sdk/index";
import { createDiagnosticWorldHost, type DiagnosticWorldHost } from "./diagnosticBootstrap";

export const M0B_SYNTHETIC_SCREEN_WIDTH_MM = 345.4;
export const M0B_SYNTHETIC_SCREEN_HEIGHT_MM = 194.3;
export const M0B_SYNTHETIC_NEAR_MM = 50;
export const M0B_SYNTHETIC_FAR_MM = 5000;

export interface SyntheticProjectionRenderHost {
  readonly renderer: Pick<WebGLRenderer, "render">;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
}

export interface AnimationFrameScheduler {
  request(callback: (timestampMs: MonotonicMs) => void): number;
  cancel(handle: number): void;
}

const browserAnimationFrameScheduler: AnimationFrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

function defaultMotionScript(): SyntheticMotionScript {
  const script = SYNTHETIC_MOTION_SCRIPTS.find((candidate) => candidate.id === "asymmetric-x-y");
  if (!script) throw new Error("asymmetric synthetic motion script is unavailable");
  return script;
}

function createViewerState(timestampMs: MonotonicMs, positionMm: Vec3Mm): ViewerState {
  const neutralPositionMm = createVec3Mm(0, 0, 600);
  const velocityMmPerSec: Vec3MmPerSec = Object.freeze({ x: 0, y: 0, z: 0 });

  return Object.freeze({
    timestampMs,
    tracking: Object.freeze({ status: "tracked", confidence: 1, sinceMonotonicMs: 0 }),
    trackedPositionMm: positionMm,
    effectivePositionMm: positionMm,
    neutralPositionMm,
    velocityMmPerSec,
    confidence: 1,
  });
}

function frameFor(
  frameNumber: number,
  timestampMs: MonotonicMs,
  deltaSeconds: Seconds,
  pose: RawViewerPose,
): WorldFrame {
  return Object.freeze({
    frameNumber,
    timestampMs,
    deltaSeconds,
    viewer: createViewerState(timestampMs, pose.positionMm),
  });
}

export class SyntheticProjectionRuntime {
  readonly screenGeometry: ScreenGeometry;

  private readonly source: SyntheticViewerPoseSource;
  private readonly worldHost: DiagnosticWorldHost;
  private readonly scheduler: AnimationFrameScheduler;
  private readonly host: SyntheticProjectionRenderHost;
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
  ) {
    this.host = host;
    this.scheduler = scheduler;
    this.source = new SyntheticViewerPoseSource(motionScript.samples);
    this.worldHost = createDiagnosticWorldHost(host.scene);
    this.screenGeometry = createScreenGeometry(M0B_SYNTHETIC_SCREEN_WIDTH_MM, M0B_SYNTHETIC_SCREEN_HEIGHT_MM);
  }

  async start(): Promise<void> {
    if (this.started || this.disposed) return;
    await this.worldHost.initialize();
    if (this.disposed) {
      await this.worldHost.dispose();
      return;
    }
    await this.source.start();
    this.started = true;
    this.scheduleNextFrame();
  }

  step(timestampMs: MonotonicMs): void {
    if (!this.started || this.disposed) return;

    if (this.scriptOriginTimestampMs === null) this.scriptOriginTimestampMs = timestampMs;
    const sample = this.source.sample(timestampMs - this.scriptOriginTimestampMs);
    if (sample) this.latestPose = sample;

    if (this.latestPose) {
      const previousTimestampMs = this.lastTimestampMs;
      const deltaSeconds = previousTimestampMs === null ? 0 : (timestampMs - previousTimestampMs) / 1000;
      applyOffAxisProjectionToCamera(
        this.host.camera,
        this.screenGeometry,
        this.latestPose.positionMm,
        M0B_SYNTHETIC_NEAR_MM,
        M0B_SYNTHETIC_FAR_MM,
      );
      this.frameNumber += 1;
      this.worldHost.update(frameFor(this.frameNumber, timestampMs, deltaSeconds, this.latestPose));
    }

    this.lastTimestampMs = timestampMs;
    this.host.renderer.render(this.host.scene, this.host.camera);
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
      this.step(timestampMs);
      if (!this.disposed) this.scheduleNextFrame();
    });
  }
}
