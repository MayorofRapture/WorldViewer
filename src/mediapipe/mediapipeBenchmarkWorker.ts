import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { normalizeTrackingObservation, type MediaPipeFaceLandmarkerResultInput } from "./trackingObservationNormalizer";

type WorkerPurpose = "benchmark" | "matrix-diagnostic";

type InitMessage = {
  kind: "init";
  modelAssetPath: string;
  wasmRoot: string;
  purpose?: WorkerPurpose;
};

type FrameMessage = {
  kind: "frame";
  frame: VideoFrame;
  timestampMs: number;
  widthPx?: number;
  heightPx?: number;
};

type ShutdownMessage = { kind: "shutdown" };

type WorkerMessage = InitMessage | FrameMessage | ShutdownMessage;

let landmarker: FaceLandmarker | undefined;
let purpose: WorkerPurpose = "benchmark";

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  try {
    if (message.kind === "init") {
      purpose = message.purpose ?? "benchmark";
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
      self.postMessage({ kind: "ready" });
      return;
    }

    if (message.kind === "shutdown") {
      landmarker?.close();
      landmarker = undefined;
      self.postMessage({ kind: "closed" });
      return;
    }

    if (!landmarker) throw new Error("MediaPipe worker received a frame before initialization");
    const startedAt = performance.now();
    const result = landmarker.detectForVideo(message.frame, message.timestampMs);
    const inferenceDurationMs = performance.now() - startedAt;
    message.frame.close();
    if (purpose === "matrix-diagnostic") {
      const normalized = normalizeTrackingObservation(result as MediaPipeFaceLandmarkerResultInput, {
        timestampMs: message.timestampMs,
        sourceId: "mediapipe-camera-diagnostic",
        frame: { widthPx: message.widthPx ?? 0, heightPx: message.heightPx ?? 0 },
        confidence: null,
      });
      if (!normalized.ok) {
        self.postMessage({
          kind: "diagnostic-result",
          timestampMs: message.timestampMs,
          completedAtMs: performance.now(),
          inferenceDurationMs,
          validation: normalized.failure,
          face: null,
          matrix: null,
        });
        return;
      }
      const face = normalized.observation.face;
      const matrix = result.facialTransformationMatrixes[0];
      self.postMessage({
        kind: "diagnostic-result",
        timestampMs: message.timestampMs,
        completedAtMs: performance.now(),
        inferenceDurationMs,
        validation: null,
        face: face ? normalized.observation.face : null,
        matrix: matrix ? { rows: matrix.rows, columns: matrix.columns, data: [...matrix.data] } : null,
      });
      return;
    }
    self.postMessage({
      kind: "result",
      timestampMs: message.timestampMs,
      completedAtMs: performance.now(),
      inferenceDurationMs,
      usefulFaceResult: result.faceLandmarks.length > 0,
      transformationMatrixCount: result.facialTransformationMatrixes.length,
    });
  } catch (error) {
    if (message.kind === "frame") message.frame.close();
    self.postMessage({ kind: "error", message: String(error) });
  }
};
