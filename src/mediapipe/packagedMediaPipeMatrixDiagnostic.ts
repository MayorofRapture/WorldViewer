import { invoke } from "@tauri-apps/api/core";
import {
  acceptMatrixDiagnosticObservation,
  advanceMatrixDiagnosticCapture,
  cancelMatrixDiagnosticCapture,
  createMatrixDiagnosticCapture,
  MATRIX_DIAGNOSTIC_REQUIRED_SAMPLES,
  MATRIX_DIAGNOSTIC_SETTLE_MS,
  startMatrixDiagnosticCapture,
  type MatrixDiagnosticCaptureState,
  type MatrixDiagnosticOperatorDeclaration,
} from "./matrixDiagnosticCapture";
import { verifyMediaPipeProvenance, type MediaPipeProvenance } from "./mediapipeProvenance";
import type { TrackingObservation } from "./trackingObservationNormalizer";

declare const __WORLDVIEWER_BUILD_SHA__: string;

type SmokeStatus = "pass" | "fail";
type DiagnosticStatus = "success" | "cancelled" | "incomplete" | "failed";
type DiagnosticResult = {
  readonly schemaVersion: 1;
  readonly diagnosticVersion: "m0d3b-v1";
  readonly generatedAt: string;
  readonly status: DiagnosticStatus;
  readonly application: Readonly<{ name: string; buildSha: string }>;
  readonly mediaPipe: MediaPipeProvenance | null;
  readonly configuration: Readonly<{
    requestedCamera: Readonly<{ widthPx: number; heightPx: number; frameRate: number }>;
    packageVersion: "@mediapipe/tasks-vision@1.0.1";
    runningMode: "VIDEO";
    delegate: "CPU";
    numFaces: 1;
    outputFaceBlendshapes: false;
    outputFacialTransformationMatrixes: true;
    inputMirrored: false;
  }>;
  readonly camera: Readonly<{
    actual: Readonly<{ widthPx: number | null; heightPx: number | null; frameRate: number | null }>;
  }>;
  readonly capture: Readonly<{
    complete: boolean;
    phases: readonly unknown[];
    currentPhase: string | null;
    missingFaceCount: number;
    missingMatrixCount: number;
    invalidObservationCount: number;
    validationFailures: readonly unknown[];
  }>;
  readonly error: string | null;
};

type SmokeResult = {
  schemaVersion: 1;
  mode: "mediapipe-matrix-diagnostic";
  status: SmokeStatus;
  checks: Array<{ id: string; status: SmokeStatus; detail?: string }>;
  durationMs: number;
  errors: Array<{ code: string; message: string }>;
};

type DiagnosticWorkerResult = {
  readonly kind: "diagnostic-result";
  readonly timestampMs: number;
  readonly completedAtMs: number;
  readonly inferenceDurationMs: number;
  readonly validation: { readonly code: string; readonly path: string; readonly message: string } | null;
  readonly face: TrackingObservation["face"] | null;
  readonly matrix: { readonly rows: number; readonly columns: number; readonly data: readonly number[] } | null;
};

export const MATRIX_DIAGNOSTIC_CAMERA_CONFIG = { widthPx: 640, heightPx: 360, frameRate: 24 } as const;
const REQUESTED_CAMERA = MATRIX_DIAGNOSTIC_CAMERA_CONFIG;

function phaseLabel(phase: string | null): string {
  return phase === "neutral" ? "Neutral"
    : phase === "left-asymmetric" ? "Left asymmetric"
      : phase === "right-asymmetric" ? "Right asymmetric"
        : phase === "near" ? "Near"
          : "Complete";
}

function phaseInstruction(phase: string | null): string {
  return phase === "neutral" ? "Face the screen normally at approximately 600 mm."
    : phase === "left-asymmetric" ? "Move your head left relative to the screen and turn slightly left."
      : phase === "right-asymmetric" ? "Move your head right relative to the screen and turn slightly right."
        : phase === "near" ? "Return near the center and move toward the screen."
          : "All diagnostic states are complete.";
}

function actualCameraSettings(stream: MediaStream | undefined) {
  const settings = stream?.getVideoTracks()[0]?.getSettings();
  return {
    widthPx: settings?.width ?? null,
    heightPx: settings?.height ?? null,
    frameRate: settings?.frameRate ?? null,
  } as const;
}

function numberOrNull(input: HTMLInputElement): number | null {
  if (input.value.trim() === "") return null;
  const value = Number(input.value);
  return Number.isFinite(value) ? value : null;
}

function operatorDeclaration(phase: string | null, displacementInput: HTMLInputElement, basisInput: HTMLSelectElement): MatrixDiagnosticOperatorDeclaration {
  const basis = basisInput.value as "measured" | "estimated" | "not-provided";
  const displacement = numberOrNull(displacementInput);
  if (phase === "left-asymmetric" || phase === "right-asymmetric") {
    return {
      lateralDirection: phase === "left-asymmetric" ? "left" : "right",
      lateralDisplacementMm: basis === "not-provided" ? null : displacement,
      lateralDisplacementBasis: basis,
    };
  }
  if (phase === "near") {
    return {
      depthDisplacementMm: basis === "not-provided" ? null : displacement,
      depthDisplacementBasis: basis,
    };
  }
  return {};
}

function captureSummary(state: MatrixDiagnosticCaptureState) {
  return {
    complete: state.status === "complete",
    phases: state.captures,
    currentPhase: state.phase,
    missingFaceCount: state.missingFaceCount,
    missingMatrixCount: state.missingMatrixCount,
    invalidObservationCount: state.invalidObservationCount,
    validationFailures: state.validationFailures,
  } as const;
}

function createResult(
  status: DiagnosticStatus,
  state: MatrixDiagnosticCaptureState,
  provenance: MediaPipeProvenance | null,
  actualCamera: ReturnType<typeof actualCameraSettings>,
  error: string | null,
): DiagnosticResult {
  return {
    schemaVersion: 1,
    diagnosticVersion: "m0d3b-v1",
    generatedAt: new Date().toISOString(),
    status,
    application: { name: "WorldViewer", buildSha: __WORLDVIEWER_BUILD_SHA__ },
    mediaPipe: provenance,
    configuration: {
      requestedCamera: REQUESTED_CAMERA,
      packageVersion: "@mediapipe/tasks-vision@1.0.1",
      runningMode: "VIDEO",
      delegate: "CPU",
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
      inputMirrored: false,
    },
    camera: { actual: actualCamera },
    capture: captureSummary(state),
    error: error ?? (state.error === null ? null : state.error),
  };
}

async function event(kind: string, payload: Record<string, unknown> = {}) {
  await invoke("record_benchmark_event", { event: { kind, ...payload } });
}

async function finish(startedAt: number, diagnostic: DiagnosticResult): Promise<void> {
  await event("diagnostic-result", { diagnostic });
  const passed = diagnostic.status === "success" && diagnostic.capture.complete && diagnostic.mediaPipe?.taskAsset.verified === true && diagnostic.mediaPipe.embeddedCanonicalMetadata.verified === true;
  const result: SmokeResult = {
    schemaVersion: 1,
    mode: "mediapipe-matrix-diagnostic",
    status: passed ? "pass" : "fail",
    checks: [{ id: "packaged-mediapipe-matrix-diagnostic", status: passed ? "pass" : "fail", detail: JSON.stringify(diagnostic) }],
    durationMs: performance.now() - startedAt,
    errors: passed ? [] : [{ code: diagnostic.status === "cancelled" ? "MEDIAPIPE_DIAGNOSTIC_CANCELLED" : "MEDIAPIPE_DIAGNOSTIC_INCOMPLETE", message: diagnostic.error ?? `diagnostic status was ${diagnostic.status}` }],
  };
  await invoke("complete_smoke", { result });
}

function buildUi(host: HTMLElement) {
  const root = document.createElement("section");
  root.setAttribute("aria-labelledby", "matrix-diagnostic-title");
  root.style.cssText = "max-width: 720px; margin: 2rem auto; padding: 1.25rem; font-family: sans-serif; color: #17202a; background: #f7f9fb; border: 1px solid #c8d1da; border-radius: 8px;";
  const title = document.createElement("h1");
  title.id = "matrix-diagnostic-title";
  title.textContent = "MediaPipe matrix diagnostic";
  root.append(title);
  const instructions = document.createElement("p");
  instructions.textContent = "This local diagnostic stores only numeric landmarks and returned matrix values. It does not save frames, audio, screenshots, camera identifiers, or user identifiers.";
  root.append(instructions);
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  root.append(status);
  const phase = document.createElement("h2");
  root.append(phase);
  const instruction = document.createElement("p");
  root.append(instruction);
  const form = document.createElement("div");
  form.style.cssText = "display: grid; gap: .5rem; max-width: 24rem;";
  const displacementLabel = document.createElement("label");
  displacementLabel.textContent = "Optional displacement (mm): ";
  const displacement = document.createElement("input");
  displacement.type = "number";
  displacement.min = "0";
  displacement.step = "any";
  displacementLabel.append(displacement);
  const basisLabel = document.createElement("label");
  basisLabel.textContent = "Measurement basis: ";
  const basis = document.createElement("select");
  for (const value of ["not-provided", "measured", "estimated"] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    basis.append(option);
  }
  basisLabel.append(basis);
  form.append(displacementLabel, basisLabel);
  root.append(form);
  const controls = document.createElement("div");
  controls.style.cssText = "display: flex; gap: .75rem; margin-top: 1rem;";
  const captureButton = document.createElement("button");
  captureButton.type = "button";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  controls.append(captureButton, cancelButton);
  root.append(controls);
  host.replaceChildren(root);
  return { root, status, phase, instruction, form, displacement, basis, captureButton, cancelButton };
}

export async function runPackagedMediaPipeMatrixDiagnostic(host: HTMLElement): Promise<void> {
  const startedAt = performance.now();
  const ui = buildUi(host);
  let state = createMatrixDiagnosticCapture();
  let provenance: MediaPipeProvenance | null = null;
  let stream: MediaStream | undefined;
  let worker: Worker | undefined;
  let video: HTMLVideoElement | undefined;
  let frameCallbackId: number | undefined;
  let pending: { frame: VideoFrame; timestampMs: number; widthPx: number; heightPx: number } | undefined;
  let inFlight = false;
  let stopped = false;
  let actualCamera = actualCameraSettings(undefined);
  let settleTimer: number | undefined;
  let cameraReady = false;

  const updateUi = () => {
    ui.phase.textContent = phaseLabel(state.phase);
    ui.instruction.textContent = phaseInstruction(state.phase);
    ui.status.textContent = state.status === "settling"
      ? `Hold this pose; settling for ${MATRIX_DIAGNOSTIC_SETTLE_MS} ms.`
      : state.status === "capturing"
        ? `Capturing ${state.currentSamples.length}/${MATRIX_DIAGNOSTIC_REQUIRED_SAMPLES} qualifying observations.`
        : state.status === "complete"
          ? "Complete. The diagnostic result is being finalized."
          : state.status === "cancelled" || state.status === "incomplete"
            ? `${state.status}: ${state.error ?? "no additional detail"}`
            : "Assume the requested pose, then press Start capture.";
    ui.captureButton.textContent = state.status === "settling" || state.status === "capturing" ? "Capturing…" : "Start capture";
    ui.captureButton.disabled = !cameraReady || state.status !== "ready";
    ui.cancelButton.disabled = state.status === "complete" || state.status === "cancelled" || state.status === "incomplete";
    const needsDisplacement = state.phase === "left-asymmetric" || state.phase === "right-asymmetric" || state.phase === "near";
    ui.form.style.display = needsDisplacement ? "grid" : "none";
  };

  const cleanup = () => {
    stopped = true;
    if (settleTimer !== undefined) window.clearInterval(settleTimer);
    if (frameCallbackId !== undefined && video !== undefined) video.cancelVideoFrameCallback(frameCallbackId);
    pending?.frame.close();
    pending = undefined;
    stream?.getTracks().forEach((track) => track.stop());
    if (video !== undefined) {
      video.srcObject = null;
      video.remove();
    }
    worker?.postMessage({ kind: "shutdown" });
    worker?.terminate();
  };

  const finalize = async (status: DiagnosticStatus, error: string | null = null) => {
    if (stopped) return;
    cleanup();
    state = status === "cancelled" ? cancelMatrixDiagnosticCapture(state, error ?? "operator cancelled capture") : status === "incomplete" ? { ...state, status: "incomplete", error } : state;
    updateUi();
    await finish(startedAt, createResult(status, state, provenance, actualCamera, error));
  };

  const tick = () => {
    if (stopped) return;
    const next = advanceMatrixDiagnosticCapture(state, performance.now());
    if (next !== state) {
      state = next;
      updateUi();
      if (state.status === "incomplete") void finalize("incomplete", state.error);
    }
  };

  ui.captureButton.addEventListener("click", () => {
    const declaration = operatorDeclaration(state.phase, ui.displacement, ui.basis);
    state = startMatrixDiagnosticCapture(state, performance.now(), declaration);
    updateUi();
  });
  ui.cancelButton.addEventListener("click", () => void finalize("cancelled"));
  updateUi();

  try {
    provenance = await verifyMediaPipeProvenance();
    await event("diagnostic-start", { diagnosticVersion: "m0d3b-v1", requestedCamera: REQUESTED_CAMERA });
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("packaged WebView2 does not expose navigator.mediaDevices.getUserMedia");
    stream = await Promise.race([
      navigator.mediaDevices.getUserMedia({ video: { width: { ideal: REQUESTED_CAMERA.widthPx }, height: { ideal: REQUESTED_CAMERA.heightPx }, frameRate: { ideal: REQUESTED_CAMERA.frameRate } }, audio: false }),
      new Promise<MediaStream>((_, reject) => window.setTimeout(() => reject(new Error("camera acquisition timed out after 20 seconds")), 20_000)),
    ]);
    actualCamera = actualCameraSettings(stream);
    video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.style.display = "none";
    video.srcObject = stream;
    document.body.append(video);
    await video.play();
    worker = new Worker(new URL("./mediapipeBenchmarkWorker.ts", import.meta.url), { type: "module" });
    await new Promise<void>((resolve, reject) => {
      worker!.onmessage = (message: MessageEvent<{ kind: string; message?: string }>) => {
        if (message.data.kind === "ready") resolve();
        if (message.data.kind === "error") reject(new Error(message.data.message ?? "MediaPipe worker initialization failed"));
      };
      worker!.onerror = () => reject(new Error("MediaPipe worker failed during initialization"));
      worker!.postMessage({ kind: "init", purpose: "matrix-diagnostic", modelAssetPath: "/mediapipe/face_landmarker.task", wasmRoot: "/mediapipe/wasm" });
    });
    cameraReady = true;
    updateUi();
    settleTimer = window.setInterval(tick, 50);

    const sendFrame = (frame: VideoFrame, timestampMs: number, widthPx: number, heightPx: number) => {
      if (inFlight) {
        pending?.frame.close();
        pending = { frame, timestampMs, widthPx, heightPx };
        return;
      }
      inFlight = true;
      worker!.postMessage({ kind: "frame", frame, timestampMs, widthPx, heightPx }, [frame]);
    };
    worker.onmessage = (message: MessageEvent<DiagnosticWorkerResult | { kind: "error" | "ready"; message?: string }>) => {
      if (message.data.kind === "error") {
        void finalize("failed", message.data.message ?? "MediaPipe worker failed during capture");
        return;
      }
      if (message.data.kind !== "diagnostic-result") return;
      inFlight = false;
      const result = message.data;
      if (state.status === "capturing") {
        const accepted = acceptMatrixDiagnosticObservation(state, {
          timestampMs: result.timestampMs,
          frame: { widthPx: actualCamera.widthPx ?? 0, heightPx: actualCamera.heightPx ?? 0 },
          face: result.face ?? undefined,
          matrixRows: result.matrix?.rows ?? null,
          matrixColumns: result.matrix?.columns ?? null,
          ...(result.validation === null ? {} : { validationFailure: result.validation }),
        });
        state = accepted.state;
        updateUi();
        if (state.status === "complete") void finalize("success");
      }
      if (pending && !stopped) {
        const next = pending;
        pending = undefined;
        sendFrame(next.frame, next.timestampMs, next.widthPx, next.heightPx);
      }
    };
    worker.onerror = () => void finalize("failed", "MediaPipe worker failed during capture");
    const onVideoFrame = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      if (stopped || video === undefined) return;
      const timestampMs = metadata.mediaTime * 1000;
      const widthPx = actualCamera.widthPx ?? video.videoWidth;
      const heightPx = actualCamera.heightPx ?? video.videoHeight;
      sendFrame(new VideoFrame(video), timestampMs, widthPx, heightPx);
      frameCallbackId = video.requestVideoFrameCallback(onVideoFrame);
    };
    frameCallbackId = video.requestVideoFrameCallback(onVideoFrame);
  } catch (error) {
    await finalize("failed", String(error));
  }
}
