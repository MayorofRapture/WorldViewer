import {
  normalizeTrackingObservation,
  type MediaPipeFaceLandmarkerResultInput,
  type TrackingObservationMetadata,
} from "./trackingObservationNormalizer";
import type {
  TrackingWorkerErrorMessage,
  TrackingWorkerObservationMessage,
} from "./trackingWorkerProtocol";
import { TRACKING_WORKER_PROTOCOL_VERSION } from "./trackingWorkerProtocol";

export type TrackingWorkerNormalizationInput = Readonly<{
  result: MediaPipeFaceLandmarkerResultInput;
  metadata: TrackingObservationMetadata;
  inferenceDurationMs: number;
  completedAtMs: number;
}>;

export type TrackingWorkerNormalizationMessage = TrackingWorkerObservationMessage | TrackingWorkerErrorMessage;

export function normalizeWorkerResult(input: TrackingWorkerNormalizationInput): TrackingWorkerNormalizationMessage {
  const normalized = normalizeTrackingObservation(input.result, input.metadata);
  if (!normalized.ok) {
    return {
      protocolVersion: TRACKING_WORKER_PROTOCOL_VERSION,
      kind: "error",
      error: {
        code: "INVALID_OBSERVATION",
        message: normalized.failure.message,
        recoverable: true,
        validation: normalized.failure,
      },
    };
  }

  return {
    protocolVersion: TRACKING_WORKER_PROTOCOL_VERSION,
    kind: "observation",
    observation: normalized.observation,
    inferenceDurationMs: input.inferenceDurationMs,
    completedAtMs: input.completedAtMs,
  };
}
