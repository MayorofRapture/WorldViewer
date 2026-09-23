import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

type InitMessage = {
  kind: "init";
  modelAssetPath: string;
  wasmRoot: string;
};

type FrameMessage = {
  kind: "frame";
  frame: VideoFrame;
  timestampMs: number;
};

type ShutdownMessage = { kind: "shutdown" };

type WorkerMessage = InitMessage | FrameMessage | ShutdownMessage;

let landmarker: FaceLandmarker | undefined;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  try {
    if (message.kind === "init") {
      const vision = await FilesetResolver.forVisionTasks(message.wasmRoot);
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

