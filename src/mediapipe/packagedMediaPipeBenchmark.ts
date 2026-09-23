import { invoke } from "@tauri-apps/api/core";

export type MediaPipeBenchmarkMode = "mediapipe-idle" | "mediapipe-24hz" | "mediapipe-20hz";

type SmokeStatus = "pass" | "fail";
type BenchmarkResult = {
  schemaVersion: 1;
  mode: MediaPipeBenchmarkMode;
  status: SmokeStatus;
  checks: Array<{ id: string; status: SmokeStatus; detail?: string }>;
  durationMs: number;
  errors: Array<{ code: string; message: string }>;
};

const WARMUP_MS = 10_000;
const FORMAL_MS = 60_000;

function percentile(values: number[], fraction: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.round((sorted.length - 1) * fraction)] ?? null;
}

function summarize(values: number[]) {
  return {
    count: values.length,
    medianMs: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    minMs: values.length ? Math.min(...values) : null,
    maxMs: values.length ? Math.max(...values) : null,
  };
}

async function event(kind: string, payload: Record<string, unknown> = {}) {
  await invoke("record_benchmark_event", { event: { kind, ...payload } });
}

function finish(startedAt: number, mode: MediaPipeBenchmarkMode, detail: Record<string, unknown>, error?: unknown): Promise<void> {
  const failed = error !== undefined;
  const result: BenchmarkResult = {
    schemaVersion: 1,
    mode,
    status: failed ? "fail" : "pass",
    checks: [{ id: "packaged-mediapipe-benchmark", status: failed ? "fail" : "pass", detail: JSON.stringify(failed ? { ...detail, error: String(error) } : detail) }],
    durationMs: performance.now() - startedAt,
    errors: failed ? [{ code: "MEDIAPIPE_BENCHMARK_FAILED", message: String(error) }] : [],
  };
  return invoke("complete_smoke", { result });
}

export async function runPackagedMediaPipeBenchmark(mode: MediaPipeBenchmarkMode): Promise<void> {
  const startedAt = performance.now();
  if (mode === "mediapipe-idle") {
    await event("benchmark-ready", { mode });
    await event("formal-start", { mode });
    await new Promise((resolve) => window.setTimeout(resolve, FORMAL_MS));
    await event("formal-end", { mode });
    await finish(startedAt, mode, {
      condition: "idle-packaged-host-baseline",
      initializationDurationMs: 0,
      formalMeasurementDurationMs: FORMAL_MS,
      localAssetsOnly: true,
    });
    return;
  }

  const worker = new Worker(new URL("./mediapipeBenchmarkWorker.ts", import.meta.url), { type: "module" });
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.style.display = "none";
  document.body.appendChild(video);
  let stream: MediaStream | undefined;
  let frameCallbackId: number | undefined;
  let stopped = false;
  let inFlight = false;
  let pending: { frame: VideoFrame; timestampMs: number } | undefined;
  let lastOpportunityMs = -Infinity;
  let formalStartMs: number | undefined;
  let formalEndTimer: number | undefined;
  let firstValidResultMs: number | undefined;
  let cameraAcquisitionDurationMs = 0;
  let workerReadyMs: number | undefined;
  let measurementActive = false;
  let framesPresented = 0;
  let framesSkippedByCap = 0;
  let inferenceRunsStarted = 0;
  let inferenceRunsCompleted = 0;
  let usefulFaceResults = 0;
  let noFaceResults = 0;
  let framesReplaced = 0;
  let maxPendingDepth = 0;
  let monotonicTimestampCorrect = true;
  let lastInputTimestamp = -Infinity;
  const resultTimes: number[] = [];
  const inferenceDurations: number[] = [];

  const detail = () => ({
    condition: mode === "mediapipe-24hz" ? "24hz-opportunity" : "20hz-cap",
    package: "@mediapipe/tasks-vision@1.0.1",
    runningMode: "VIDEO",
    delegate: "CPU",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true,
    confidenceThresholds: "official defaults: 0.5",
    modelAsset: "/mediapipe/face_landmarker.task",
    wasmRoot: "/mediapipe/wasm",
    cameraSettings: stream ? (() => { const settings = stream!.getVideoTracks()[0]?.getSettings(); return { deviceIdPresent: Boolean(settings?.deviceId), width: settings?.width, height: settings?.height, frameRate: settings?.frameRate }; })() : null,
    cameraAcquisitionDurationMs,
    initializationDurationMs: workerReadyMs === undefined ? null : workerReadyMs - startedAt,
    firstValidResultMs: firstValidResultMs === undefined ? null : firstValidResultMs - startedAt,
    warmupDurationMs: WARMUP_MS,
    formalMeasurementDurationMs: formalStartMs === undefined ? null : performance.now() - formalStartMs,
    framesPresented,
    framesSkippedByCap,
    inferenceRunsStarted,
    inferenceRunsCompleted,
    usefulFaceResults,
    noFaceResults,
    usefulResultRate: inferenceRunsCompleted ? usefulFaceResults / inferenceRunsCompleted : 0,
    usefulResultCadenceHz: resultTimes.length > 1 ? (resultTimes.length - 1) / ((resultTimes[resultTimes.length - 1]! - resultTimes[0]!) / 1000) : null,
    interResultIntervalMs: summarize(resultTimes.slice(1).map((time, index) => time - resultTimes[index]!)),
    inferenceDurationMs: summarize(inferenceDurations),
    framesReplaced,
    maxPendingDepth,
    monotonicTimestampCorrect,
    backpressure: { activeInferenceLimit: 1, pendingFrameLimit: 1, unboundedQueue: false },
    localAssetsOnly: true,
  });

  const cleanup = () => {
    stopped = true;
    if (frameCallbackId !== undefined) video.cancelVideoFrameCallback(frameCallbackId);
    if (formalEndTimer !== undefined) window.clearTimeout(formalEndTimer);
    pending?.frame.close();
    pending = undefined;
    stream?.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
    worker.postMessage({ kind: "shutdown" });
    worker.terminate();
    video.remove();
  };

  try {
    let cameraPermissionState: string | null = null;
    try {
      cameraPermissionState = (await navigator.permissions.query({ name: "camera" as PermissionName })).state;
    } catch {
      cameraPermissionState = null;
    }
    await event("benchmark-start", {
      mode,
      pageUrl: location.href,
      origin: location.origin,
      isSecureContext: window.isSecureContext,
      mediaDevicesAvailable: Boolean(navigator.mediaDevices),
      cameraPermissionState,
    });
    const cameraStartedAt = performance.now();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("packaged WebView2 does not expose navigator.mediaDevices.getUserMedia");
    const cameraRequest = navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } }, audio: false });
    stream = await Promise.race([
      cameraRequest,
      new Promise<MediaStream>((_, reject) => window.setTimeout(() => reject(new Error("camera acquisition timed out after 20 seconds")), 20_000)),
    ]);
    cameraAcquisitionDurationMs = performance.now() - cameraStartedAt;
    await event("camera-ready", { mode, cameraSettings: stream.getVideoTracks()[0]?.getSettings() });
    video.srcObject = stream;
    await video.play();
    await new Promise<void>((resolve, reject) => {
      worker.onmessage = (message: MessageEvent) => {
        if (message.data.kind === "ready") { workerReadyMs = performance.now(); resolve(); }
        if (message.data.kind === "error") reject(new Error(message.data.message));
      };
      worker.onerror = () => reject(new Error("MediaPipe worker failed during initialization"));
      worker.postMessage({ kind: "init", modelAssetPath: "/mediapipe/face_landmarker.task", wasmRoot: "/mediapipe/wasm" });
    });
    await event("benchmark-ready", { mode, cameraSettings: stream.getVideoTracks()[0]?.getSettings(), initializationDurationMs: workerReadyMs! - startedAt });

    const beginFormal = () => {
      if (formalStartMs !== undefined) return;
      formalStartMs = performance.now();
      measurementActive = true;
      framesPresented = 0; framesSkippedByCap = 0; inferenceRunsStarted = 0; inferenceRunsCompleted = 0; usefulFaceResults = 0; noFaceResults = 0; framesReplaced = 0; maxPendingDepth = 0; resultTimes.length = 0; inferenceDurations.length = 0;
      void event("formal-start", { mode, cameraSettings: stream?.getVideoTracks()[0]?.getSettings() });
      formalEndTimer = window.setTimeout(() => { measurementActive = false; void event("formal-end", { mode }); }, FORMAL_MS);
    };

    const sendFrame = (frame: VideoFrame, timestampMs: number) => {
      if (inFlight) {
        if (pending) { pending.frame.close(); framesReplaced += measurementActive ? 1 : 0; }
        pending = { frame, timestampMs };
        maxPendingDepth = Math.max(maxPendingDepth, 1);
        return;
      }
      inFlight = true;
      inferenceRunsStarted += measurementActive ? 1 : 0;
      worker.postMessage({ kind: "frame", frame, timestampMs }, [frame]);
    };

    worker.onmessage = (message: MessageEvent) => {
      if (message.data.kind === "error") { cleanup(); void finish(startedAt, mode, detail(), new Error(message.data.message)); return; }
      if (message.data.kind !== "result") return;
      inFlight = false;
      inferenceRunsCompleted += measurementActive ? 1 : 0;
      if (message.data.usefulFaceResult) {
        if (firstValidResultMs === undefined) { firstValidResultMs = message.data.completedAtMs; window.setTimeout(beginFormal, WARMUP_MS); }
        if (measurementActive) { usefulFaceResults += 1; resultTimes.push(message.data.completedAtMs); inferenceDurations.push(message.data.inferenceDurationMs); }
      } else if (measurementActive) { noFaceResults += 1; }
      if (pending) { const next = pending; pending = undefined; sendFrame(next.frame, next.timestampMs); }
      if (!stopped && formalStartMs !== undefined && !measurementActive && !inFlight && !pending) { cleanup(); void finish(startedAt, mode, detail()); }
    };

    const onVideoFrame = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      if (stopped) return;
      const timestampMs = metadata.mediaTime * 1000;
      if (timestampMs < lastInputTimestamp) monotonicTimestampCorrect = false;
      lastInputTimestamp = timestampMs;
      const frame = new VideoFrame(video);
      framesPresented += measurementActive ? 1 : 0;
      if (mode === "mediapipe-20hz" && timestampMs - lastOpportunityMs < 50) { framesSkippedByCap += measurementActive ? 1 : 0; frame.close(); }
      else { lastOpportunityMs = timestampMs; sendFrame(frame, timestampMs); }
      frameCallbackId = video.requestVideoFrameCallback(onVideoFrame);
    };
    frameCallbackId = video.requestVideoFrameCallback(onVideoFrame);
    await new Promise<void>((resolve) => { const check = () => { if (stopped) resolve(); else window.setTimeout(check, 250); }; check(); });
  } catch (error) {
    cleanup();
    await finish(startedAt, mode, detail(), error);
  }
}
