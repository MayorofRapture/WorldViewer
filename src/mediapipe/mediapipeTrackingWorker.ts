import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { normalizeWorkerResult } from "./trackingWorkerNormalizer";
import {
  TRACKING_WORKER_PROTOCOL_VERSION,
  type TrackingWorkerHostMessage,
  type TrackingWorkerToHostMessage,
} from "./trackingWorkerProtocol";
import type { MediaPipeFaceLandmarkerResultInput } from "./trackingObservationNormalizer";

let landmarker: FaceLandmarker | undefined;
let sourceId = "mediapipe-camera-0";
let lastObservationTimestampMs: number | undefined;

function post(message: TrackingWorkerToHostMessage): void {
  self.postMessage(message);
}

function postError(
  code: "WORKER_NOT_READY" | "INFERENCE_FAILED" | "PROTOCOL_ERROR",
  message: string,
  recoverable: boolean,
): void {
  post({
    protocolVersion: TRACKING_WORKER_PROTOCOL_VERSION,
    kind: "error",
    error: { code, message, recoverable },
  });
}

self.onmessage = async (event: MessageEvent<TrackingWorkerHostMessage>) => {
  const message = event.data;
  let frameClosed = false;
  const closeFrame = () => {
    if (message.kind === "frame" && !frameClosed) {
      message.frame.close();
      frameClosed = true;
    }
  };
  try {
    if (message.protocolVersion !== TRACKING_WORKER_PROTOCOL_VERSION) {
      closeFrame();
      postError("PROTOCOL_ERROR", "unsupported tracking worker protocol version", false);
      return;
    }

    if (message.kind === "init") {
      landmarker?.close();
      landmarker = undefined;
      sourceId = message.sourceId;
      lastObservationTimestampMs = undefined;
      post({ protocolVersion: TRACKING_WORKER_PROTOCOL_VERSION, kind: "status", status: "initializing" });
      const vision = await FilesetResolver.forVisionTasks(message.wasmRoot, true);
      landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          delegate: "CPU",
          modelAssetPath: message.modelAssetPath,
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      });
      post({ protocolVersion: TRACKING_WORKER_PROTOCOL_VERSION, kind: "ready" });
      post({ protocolVersion: TRACKING_WORKER_PROTOCOL_VERSION, kind: "status", status: "running" });
      return;
    }

    if (message.kind === "shutdown") {
      landmarker?.close();
      landmarker = undefined;
      lastObservationTimestampMs = undefined;
      post({ protocolVersion: TRACKING_WORKER_PROTOCOL_VERSION, kind: "status", status: "stopped" });
      return;
    }

    if (landmarker === undefined) {
      closeFrame();
      postError("WORKER_NOT_READY", "tracking worker received a frame before initialization", true);
      return;
    }

    const startedAtMs = performance.now();
    let result: ReturnType<FaceLandmarker["detectForVideo"]>;
    try {
      result = landmarker.detectForVideo(message.frame, message.timestampMs);
    } finally {
      closeFrame();
    }
    const completedAtMs = performance.now();
    const normalized = normalizeWorkerResult({
      result: result as MediaPipeFaceLandmarkerResultInput,
      metadata: {
        timestampMs: message.timestampMs,
        sourceId,
        frame: { widthPx: message.widthPx, heightPx: message.heightPx },
        confidence: null,
        ...(lastObservationTimestampMs === undefined ? {} : { previousTimestampMs: lastObservationTimestampMs }),
      },
      inferenceDurationMs: completedAtMs - startedAtMs,
      completedAtMs,
    });
    if (normalized.kind === "error") {
      post(normalized);
      return;
    }
    lastObservationTimestampMs = normalized.observation.timestampMs;
    post(normalized);
  } catch (error) {
    closeFrame();
    postError("INFERENCE_FAILED", String(error), false);
  }
};
