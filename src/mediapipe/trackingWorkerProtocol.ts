import type {
  TrackingObservation,
  TrackingObservationValidationFailure,
} from "./trackingObservationNormalizer";

export const TRACKING_WORKER_PROTOCOL_VERSION = 1 as const;

export type TrackingWorkerInitMessage = {
  readonly protocolVersion: typeof TRACKING_WORKER_PROTOCOL_VERSION;
  readonly kind: "init";
  readonly modelAssetPath: string;
  readonly wasmRoot: string;
  readonly sourceId: string;
};

export type TrackingWorkerFrameMessage = {
  readonly protocolVersion: typeof TRACKING_WORKER_PROTOCOL_VERSION;
  readonly kind: "frame";
  readonly frame: VideoFrame;
  readonly timestampMs: number;
  readonly widthPx: number;
  readonly heightPx: number;
};

export type TrackingWorkerShutdownMessage = {
  readonly protocolVersion: typeof TRACKING_WORKER_PROTOCOL_VERSION;
  readonly kind: "shutdown";
};

export type TrackingWorkerHostMessage =
  | TrackingWorkerInitMessage
  | TrackingWorkerFrameMessage
  | TrackingWorkerShutdownMessage;

export type TrackingWorkerReadyMessage = {
  readonly protocolVersion: typeof TRACKING_WORKER_PROTOCOL_VERSION;
  readonly kind: "ready";
};

export type TrackingWorkerObservationMessage = {
  readonly protocolVersion: typeof TRACKING_WORKER_PROTOCOL_VERSION;
  readonly kind: "observation";
  readonly observation: TrackingObservation;
  readonly inferenceDurationMs: number;
  readonly completedAtMs: number;
};

export type TrackingWorkerStatusMessage = {
  readonly protocolVersion: typeof TRACKING_WORKER_PROTOCOL_VERSION;
  readonly kind: "status";
  readonly status: "initializing" | "running" | "stopped";
};

export type TrackingWorkerErrorCode =
  | "WORKER_NOT_READY"
  | "INFERENCE_FAILED"
  | "INVALID_OBSERVATION"
  | "PROTOCOL_ERROR";

export type TrackingWorkerErrorMessage = {
  readonly protocolVersion: typeof TRACKING_WORKER_PROTOCOL_VERSION;
  readonly kind: "error";
  readonly error: Readonly<{
    code: TrackingWorkerErrorCode;
    message: string;
    recoverable: boolean;
    validation?: TrackingObservationValidationFailure;
  }>;
};

export type TrackingWorkerToHostMessage =
  | TrackingWorkerReadyMessage
  | TrackingWorkerObservationMessage
  | TrackingWorkerStatusMessage
  | TrackingWorkerErrorMessage;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isTrackingWorkerToHostMessage(value: unknown): value is TrackingWorkerToHostMessage {
  if (!record(value) || value.protocolVersion !== TRACKING_WORKER_PROTOCOL_VERSION || typeof value.kind !== "string") return false;
  if (value.kind === "ready") return true;
  if (value.kind === "status") return value.status === "initializing" || value.status === "running" || value.status === "stopped";
  if (value.kind === "observation") return record(value.observation) && typeof value.inferenceDurationMs === "number" && typeof value.completedAtMs === "number";
  if (value.kind === "error") return record(value.error) && typeof value.error.code === "string" && typeof value.error.message === "string" && typeof value.error.recoverable === "boolean";
  return false;
}
