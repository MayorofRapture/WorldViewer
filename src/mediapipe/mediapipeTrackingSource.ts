import type { MonotonicMs } from "../shared/contracts/primitives";
import type { TrackingHealth } from "../shared/contracts/viewer";
import {
  freezeTrackingObservation,
  type TrackingObservation,
} from "./trackingObservationNormalizer";
import { LatestFrameBackpressure, type ClosableTrackingFrame, type TrackingFrameEnvelope } from "./latestFrameBackpressure";
import {
  isTrackingWorkerToHostMessage,
  TRACKING_WORKER_PROTOCOL_VERSION,
  type TrackingWorkerHostMessage,
  type TrackingWorkerToHostMessage,
} from "./trackingWorkerProtocol";

export const MEDIAPIPE_TRACKING_CAMERA_CONFIG = {
  widthPx: 640,
  heightPx: 360,
  frameRate: 24,
} as const;

export const MEDIAPIPE_TRACKING_MODEL_ASSET_PATH = "/mediapipe/face_landmarker.task";
export const MEDIAPIPE_TRACKING_WASM_ROOT = "/mediapipe/wasm";

export interface TrackingSource {
  readonly id: string;
  readonly kind: "live-camera";
  start(): Promise<void>;
  stop(): Promise<void>;
  getHealth(): Readonly<TrackingHealth>;
  subscribe(listener: (observation: TrackingObservation) => void): () => void;
}

export interface TrackingObservationEvent {
  readonly observation: TrackingObservation;
  readonly inferenceDurationMs: number;
  readonly completedAtMs: number;
}

export interface TrackingWorkerLike {
  onmessage: ((event: MessageEvent<TrackingWorkerToHostMessage>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: TrackingWorkerHostMessage, transfer?: Transferable[]): void;
  terminate(): void;
}

export interface TrackingStreamLike {
  getTracks(): readonly { stop(): void; getSettings?: () => Readonly<{ width?: number; height?: number; frameRate?: number }> }[];
}

export interface TrackingVideoLike {
  muted: boolean;
  playsInline: boolean;
  autoplay: boolean;
  srcObject: unknown;
  videoWidth: number;
  videoHeight: number;
  play(): Promise<void>;
  remove(): void;
  requestVideoFrameCallback(callback: (now: number, metadata: Readonly<{ mediaTime: number }>) => void): number;
  cancelVideoFrameCallback(handle: number): void;
}

export interface MediaPipeTrackingSourceOptions {
  readonly id?: string;
  readonly modelAssetPath?: string;
  readonly wasmRoot?: string;
  readonly getUserMedia?: (constraints: MediaStreamConstraints) => Promise<TrackingStreamLike>;
  readonly createWorker?: () => TrackingWorkerLike;
  readonly createVideo?: () => TrackingVideoLike;
  readonly attachVideo?: (video: TrackingVideoLike) => void;
  readonly createFrame?: (video: TrackingVideoLike) => VideoFrame;
  readonly nowMs?: () => MonotonicMs;
}

type SourceState = "stopped" | "starting" | "running" | "stopping";

function defaultGetUserMedia(constraints: MediaStreamConstraints): Promise<TrackingStreamLike> {
  if (!navigator.mediaDevices?.getUserMedia) return Promise.reject(new Error("mediaDevices.getUserMedia is unavailable"));
  return navigator.mediaDevices.getUserMedia(constraints);
}

function defaultCreateWorker(): TrackingWorkerLike {
  return new Worker(new URL("./mediapipeTrackingWorker.ts", import.meta.url), { type: "module" });
}

function defaultCreateVideo(): TrackingVideoLike {
  return document.createElement("video");
}

function defaultAttachVideo(video: TrackingVideoLike): void {
  document.body.append(video as HTMLVideoElement);
}

function defaultCreateFrame(video: TrackingVideoLike): VideoFrame {
  return new VideoFrame(video as HTMLVideoElement);
}

function initialHealth(nowMs: MonotonicMs): Readonly<TrackingHealth> {
  return Object.freeze({ status: "unavailable" as const, confidence: null, sinceMonotonicMs: nowMs, reasonCode: "not-started" });
}

export class MediaPipeTrackingSource implements TrackingSource {
  public readonly kind = "live-camera" as const;
  public readonly id: string;

  private readonly modelAssetPath: string;
  private readonly wasmRoot: string;
  private readonly getUserMedia: (constraints: MediaStreamConstraints) => Promise<TrackingStreamLike>;
  private readonly createWorker: () => TrackingWorkerLike;
  private readonly createVideo: () => TrackingVideoLike;
  private readonly attachVideo: (video: TrackingVideoLike) => void;
  private readonly createFrame: (video: TrackingVideoLike) => VideoFrame;
  private readonly nowMs: () => MonotonicMs;
  private readonly listeners = new Set<(observation: TrackingObservation) => void>();
  private readonly detailedListeners = new Set<(event: TrackingObservationEvent) => void>();

  private state: SourceState = "stopped";
  private health: Readonly<TrackingHealth>;
  private worker: TrackingWorkerLike | undefined;
  private stream: TrackingStreamLike | undefined;
  private video: TrackingVideoLike | undefined;
  private frameCallbackId: number | undefined;
  private frameQueue: LatestFrameBackpressure<ClosableTrackingFrame> | undefined;
  private lastAcceptedObservationTimestampMs: number | undefined;
  private readyResolve: (() => void) | undefined;
  private readyReject: ((error: Error) => void) | undefined;
  private shutdownResolve: (() => void) | undefined;
  private startPromise: Promise<void> | undefined;
  private stopPromise: Promise<void> | undefined;
  private droppedFrameCount = 0;

  public constructor(options: MediaPipeTrackingSourceOptions = {}) {
    this.id = options.id ?? "mediapipe-camera-0";
    this.modelAssetPath = options.modelAssetPath ?? MEDIAPIPE_TRACKING_MODEL_ASSET_PATH;
    this.wasmRoot = options.wasmRoot ?? MEDIAPIPE_TRACKING_WASM_ROOT;
    this.getUserMedia = options.getUserMedia ?? defaultGetUserMedia;
    this.createWorker = options.createWorker ?? defaultCreateWorker;
    this.createVideo = options.createVideo ?? defaultCreateVideo;
    this.attachVideo = options.attachVideo ?? defaultAttachVideo;
    this.createFrame = options.createFrame ?? defaultCreateFrame;
    this.nowMs = options.nowMs ?? (() => performance.now());
    this.health = initialHealth(this.nowMs());
  }

  public start(): Promise<void> {
    if (this.state === "running") return Promise.resolve();
    if (this.startPromise !== undefined) return this.startPromise;
    if (this.state === "stopping") {
      return this.stop().then(() => this.start());
    }
    this.state = "starting";
    this.setHealth("initializing", null, "starting");
    this.startPromise = this.startInternal().catch(async (error: unknown) => {
      await this.cleanupResources();
      this.state = "stopped";
      this.setHealth("unavailable", null, "start-failed");
      throw error;
    }).finally(() => {
      this.startPromise = undefined;
    });
    return this.startPromise;
  }

  public stop(): Promise<void> {
    if (this.state === "stopped") return Promise.resolve();
    if (this.stopPromise !== undefined) return this.stopPromise;
    if (this.state === "starting") {
      this.readyReject?.(new Error("MediaPipe tracking source stopped during startup"));
      this.readyResolve = undefined;
      this.readyReject = undefined;
    }
    this.state = "stopping";
    this.stopPromise = this.cleanupResources().finally(() => {
      this.state = "stopped";
      this.setHealth("unavailable", null, "stopped");
      this.stopPromise = undefined;
    });
    return this.stopPromise;
  }

  public getHealth(): Readonly<TrackingHealth> {
    return this.health;
  }

  public subscribe(listener: (observation: TrackingObservation) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeDetailed(listener: (event: TrackingObservationEvent) => void): () => void {
    this.detailedListeners.add(listener);
    return () => this.detailedListeners.delete(listener);
  }

  public getDroppedFrameCount(): number {
    return this.droppedFrameCount;
  }

  public getCameraConfiguration(): Readonly<{ widthPx: number | null; heightPx: number | null; frameRate: number | null }> {
    const settings = this.stream?.getTracks()[0]?.getSettings?.();
    return Object.freeze({ widthPx: settings?.width ?? this.video?.videoWidth ?? null, heightPx: settings?.height ?? this.video?.videoHeight ?? null, frameRate: settings?.frameRate ?? null });
  }

  private async startInternal(): Promise<void> {
    this.droppedFrameCount = 0;
    const worker = this.createWorker();
    this.worker = worker;
    worker.onmessage = (event) => this.handleWorkerMessage(event.data);
    worker.onerror = () => this.handleFatalError(new Error("MediaPipe tracking worker failed"));
    this.frameQueue = new LatestFrameBackpressure<ClosableTrackingFrame>((envelope) => this.dispatchFrame(envelope));

    this.stream = await this.getUserMedia({
      video: {
        width: { ideal: MEDIAPIPE_TRACKING_CAMERA_CONFIG.widthPx },
        height: { ideal: MEDIAPIPE_TRACKING_CAMERA_CONFIG.heightPx },
        frameRate: { ideal: MEDIAPIPE_TRACKING_CAMERA_CONFIG.frameRate },
      },
      audio: false,
    });
    this.video = this.createVideo();
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.srcObject = this.stream;
    this.attachVideo(this.video);
    await this.video.play();

    const ready = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    worker.postMessage({
      protocolVersion: TRACKING_WORKER_PROTOCOL_VERSION,
      kind: "init",
      modelAssetPath: this.modelAssetPath,
      wasmRoot: this.wasmRoot,
      sourceId: this.id,
    });
    await ready;
    this.state = "running";
    this.setHealth("acquiring", null, "awaiting-face");
    this.requestNextFrame();
  }

  private dispatchFrame(envelope: TrackingFrameEnvelope<ClosableTrackingFrame>): void {
    const worker = this.worker;
    if (worker === undefined) {
      envelope.frame.close();
      throw new Error("MediaPipe tracking worker is unavailable");
    }
    worker.postMessage({
      protocolVersion: TRACKING_WORKER_PROTOCOL_VERSION,
      kind: "frame",
      frame: envelope.frame as VideoFrame,
      timestampMs: envelope.timestampMs,
      widthPx: envelope.widthPx,
      heightPx: envelope.heightPx,
    }, [envelope.frame as VideoFrame]);
  }

  private requestNextFrame(): void {
    const video = this.video;
    if (video === undefined || this.state !== "running") return;
    this.frameCallbackId = video.requestVideoFrameCallback((_now, metadata) => {
      if (this.state !== "running" || this.video === undefined || this.frameQueue === undefined) return;
      const timestampMs = metadata.mediaTime * 1000;
      const widthPx = this.video.videoWidth;
      const heightPx = this.video.videoHeight;
      if (!Number.isFinite(timestampMs) || timestampMs < 0 || !Number.isFinite(widthPx) || widthPx <= 0 || !Number.isFinite(heightPx) || heightPx <= 0) {
        this.setHealth("degraded", null, "invalid-frame-metadata");
        this.requestNextFrame();
        return;
      }
      try {
        if (this.frameQueue.pendingFrameCount === 1) this.droppedFrameCount += 1;
        const frame = this.createFrame(this.video);
        this.frameQueue.submit({ frame, timestampMs, widthPx, heightPx });
      } catch (error) {
        this.handleFatalError(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      this.requestNextFrame();
    });
  }

  private handleWorkerMessage(message: TrackingWorkerToHostMessage): void {
    if (!isTrackingWorkerToHostMessage(message)) {
      this.handleFatalError(new Error("invalid MediaPipe tracking worker message"));
      return;
    }
    if (message.kind === "ready") {
      this.readyResolve?.();
      this.readyResolve = undefined;
      this.readyReject = undefined;
      return;
    }
    if (message.kind === "status") {
      if (message.status === "stopped") this.shutdownResolve?.();
      return;
    }
    if (message.kind === "observation") {
      this.frameQueue?.complete();
      this.acceptObservation(freezeTrackingObservation(message.observation), { inferenceDurationMs: message.inferenceDurationMs, completedAtMs: message.completedAtMs });
      return;
    }
    this.frameQueue?.complete();
    if (message.error.recoverable) {
      this.setHealth("degraded", null, message.error.code);
      return;
    }
    this.handleFatalError(new Error(message.error.message));
  }

  private acceptObservation(observation: TrackingObservation, timing: Readonly<{ inferenceDurationMs: number; completedAtMs: number }>): void {
    if (this.lastAcceptedObservationTimestampMs !== undefined && observation.timestampMs < this.lastAcceptedObservationTimestampMs) {
      this.setHealth("degraded", observation.confidence, "stale-observation");
      return;
    }
    this.lastAcceptedObservationTimestampMs = observation.timestampMs;
    const hasFace = observation.face !== undefined;
    const status = hasFace ? "tracked" : this.health.status === "tracked" || this.health.status === "degraded" ? "lost" : "acquiring";
    this.setHealth(status, observation.confidence, hasFace ? undefined : "no-face");
    for (const listener of this.listeners) listener(observation);
    const event = Object.freeze({ observation, inferenceDurationMs: timing.inferenceDurationMs, completedAtMs: timing.completedAtMs });
    for (const listener of this.detailedListeners) listener(event);
  }

  private handleFatalError(error: Error): void {
    this.readyReject?.(error);
    this.readyResolve = undefined;
    this.readyReject = undefined;
    this.setHealth("unavailable", null, "worker-failed");
    if (this.state === "running" || this.state === "starting") void this.stop();
  }

  private async cleanupResources(): Promise<void> {
    const worker = this.worker;
    this.worker = undefined;
    if (this.frameCallbackId !== undefined && this.video !== undefined) this.video.cancelVideoFrameCallback(this.frameCallbackId);
    this.frameCallbackId = undefined;
    this.frameQueue?.shutdown();
    this.frameQueue = undefined;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    if (this.video !== undefined) {
      this.video.srcObject = null;
      this.video.remove();
      this.video = undefined;
    }
    if (worker !== undefined) {
      await new Promise<void>((resolve) => {
        this.shutdownResolve = resolve;
        try {
          worker.postMessage({ protocolVersion: TRACKING_WORKER_PROTOCOL_VERSION, kind: "shutdown" });
        } catch {
          resolve();
        }
        globalThis.setTimeout(resolve, 1000);
      });
      this.shutdownResolve = undefined;
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    }
    this.lastAcceptedObservationTimestampMs = undefined;
  }

  private setHealth(status: TrackingHealth["status"], confidence: number | null, reasonCode?: string): void {
    this.health = Object.freeze({
      status,
      confidence,
      sinceMonotonicMs: this.nowMs(),
      ...(reasonCode === undefined ? {} : { reasonCode }),
    });
  }
}
