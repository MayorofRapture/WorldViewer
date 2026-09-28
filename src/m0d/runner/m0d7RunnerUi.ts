import { invoke } from "@tauri-apps/api/core";
import { MEDIAPIPE_PACKAGE_VERSION } from "../../mediapipe/mediapipeProvenance";
import { MediaPipeTrackingSource } from "../../mediapipe/mediapipeTrackingSource";
import { M0D7EvidenceRunner } from "./m0d7EvidenceRunner";

interface M0D7RunnerUiOptions {
  readonly smoke: boolean;
}

function text(value: unknown): string {
  return value === null || value === undefined ? "—" : String(value);
}

function countdown(stepStartedAtMs: number | null, durationMs: number): string {
  if (stepStartedAtMs === null) return "—";
  return `${(Math.max(0, stepStartedAtMs + durationMs - performance.now()) / 1000).toFixed(1)} s`;
}

export function runM0D7Runner(host: HTMLElement, options: M0D7RunnerUiOptions): () => void {
  const root = document.createElement("section");
  root.setAttribute("aria-label", "M0D7 physical evidence runner");
  const title = document.createElement("h1");
  title.textContent = "M0D7 pose-estimator evidence runner";
  const status = document.createElement("p");
  const details = document.createElement("pre");
  details.style.whiteSpace = "pre-wrap";
  const controls = document.createElement("div");
  const startButton = document.createElement("button");
  startButton.textContent = "Start physical evidence collection";
  const readyButton = document.createElement("button");
  readyButton.textContent = "Press Ready when positioned";
  readyButton.disabled = true;
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel and retain evidence";
  cancelButton.disabled = true;
  const reason = document.createElement("select");
  for (const [value, label] of [["external-interruption", "External interruption"], ["operator-moved-after-settling-during-stationary-capture", "Operator moved after settling during stationary capture"]] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    reason.append(option);
  }
  const phase = document.createElement("select");
  for (const value of ["settling", "capture"] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = `Stationary ${value}`;
    phase.append(option);
  }
  const invalidateButton = document.createElement("button");
  invalidateButton.textContent = "Invalidate current attempt";
  invalidateButton.disabled = true;
  const replacementButton = document.createElement("button");
  replacementButton.textContent = "Begin replacement attempt";
  replacementButton.disabled = true;
  controls.append(startButton, readyButton, cancelButton, reason, phase, invalidateButton, replacementButton);
  root.append(title, status, controls, details);
  host.replaceChildren(root);

  const source = new MediaPipeTrackingSource();
  const writer = { write: (files: readonly { relativePath: string; contents: string }[]) => invoke<string>("write_m0d_evidence_bundle", { files }) };
  const runner = new M0D7EvidenceRunner({ source, runId: `m0d7-${new Date().toISOString().replace(/[-:.TZ]/g, "")}`, cameraOriginScreenMm: { x: 0, y: 103.188, z: 0 }, writer });
  let disposed = false;
  let finalResultShown = false;
  let finalValidationText: string | null = null;

  const render = (): void => {
    const state = runner.getState();
    const current = state.steps[state.stepIndex];
    status.textContent = `Status: ${state.status}${state.proceduralError === null ? "" : ` — ${state.proceduralError}`}`;
    startButton.disabled = !(state.status === "idle" || state.status === "ready");
    startButton.textContent = state.status === "ready" ? "Begin calibration" : "Initialize camera";
    readyButton.disabled = !(state.status === "running" && current?.kind === "transition");
    cancelButton.disabled = !(state.status === "initializing" || state.status === "ready" || state.status === "running" || state.status === "invalidated");
    invalidateButton.disabled = state.status !== "running";
    replacementButton.disabled = state.status !== "invalidated";
    phase.disabled = current?.kind !== "capture" || (current?.scenarioId !== "neutral-stationary" && current?.scenarioId !== "near-stationary-450" && current?.scenarioId !== "far-stationary-750");
    details.textContent = [
      `Scenario: ${text(current?.scenarioId)}`,
      `Instruction: ${text(current?.instruction)}`,
      `Phase: ${state.status === "ready" ? "Ready" : current?.kind === "transition" ? "Move next target / press Ready only after reaching it" : current?.kind === "hold" ? "Holding" : current?.kind === "settle" ? "Settling" : current?.kind === "capture" ? "Capturing" : "Complete"}`,
      `Trial: ${text(current?.trialNumber)}    Cycle: ${text(current?.cycleNumber)}    Hold/phase: ${text(current?.kind)}`,
      `Target: ${text(current?.targetMm)} mm ${text(current?.targetAxis)}`,
      `Countdown: ${current && current.durationMs !== null ? countdown(state.stepStartedAtMs, current.durationMs) : "—"}`,
      "Camera request: 640×360 @ 24 FPS; CPU; VIDEO; faces=1; blendshapes=false; facial matrix=true",
      `Camera actual: ${text(source.getCameraConfiguration().widthPx)}×${text(source.getCameraConfiguration().heightPx)} @ ${text(source.getCameraConfiguration().frameRate)} FPS`,
      `MediaPipe package: ${MEDIAPIPE_PACKAGE_VERSION}`,
      "Experiment: Draft v0.4 / procedure 3 / evidence schema 1 / validator 1",
      `Attempt: ${state.attemptId}    Automatic markers: ${state.markers.length}`,
      `Procedural invalidations: ${state.proceduralInvalidations.length}    Anomalies: ${state.anomalies.length}`,
      "Evidence: normalized observations and timing only; no images are retained.",
      ...(finalValidationText === null ? [] : [`Validation detail: ${finalValidationText}`]),
    ].join("\n");
  };

  const interval = window.setInterval(() => {
    if (disposed) return;
    const state = runner.tick();
    if (state.status === "complete" && !finalResultShown) {
      void runner.finalize().then((result) => {
        finalResultShown = true;
        finalValidationText = JSON.stringify(result.validation.failures);
        status.textContent = `Status: ${result.validation.passed ? "complete" : "retained with validation failures"}; output: ${result.outputRoot ?? "writer did not return a path"}`;
        render();
      }).catch((error: unknown) => { status.textContent = `Status: failed while finalizing evidence — ${String(error)}`; });
    }
    render();
  }, 100);

  startButton.addEventListener("click", () => {
    const operation = runner.getState().status === "ready" ? Promise.resolve(runner.beginProcedure()) : runner.start();
    void operation.then(render).catch((error: unknown) => {
      status.textContent = `Status: failed — ${String(error)}`;
      render();
    });
  });
  readyButton.addEventListener("click", () => { runner.confirmTargetReached(); render(); });
  cancelButton.addEventListener("click", () => {
    void runner.cancel().then((result) => {
      finalResultShown = true;
      finalValidationText = JSON.stringify(result.validation.failures);
      status.textContent = `Status: ${result.validation.passed ? "complete" : "retained with validation failures"}; output: ${result.outputRoot ?? "writer did not return a path"}`;
      render();
    }).catch((error: unknown) => { status.textContent = `Status: failed while retaining evidence — ${String(error)}`; });
  });
  invalidateButton.addEventListener("click", () => {
    try {
      const selected = reason.value;
      runner.invalidateCurrentAttempt(selected as "external-interruption" | "operator-moved-after-settling-during-stationary-capture", "Operator declared the current attempt procedurally invalid.", phase.value as "settling" | "capture");
      render();
    } catch (error) {
      status.textContent = `Procedural invalidation rejected — ${String(error)}`;
    }
  });
  replacementButton.addEventListener("click", () => { runner.beginReplacementAttempt(); render(); });

  render();
  if (options.smoke) {
    void invoke<string>("get_m0d_evidence_root").then((path) => invoke("complete_smoke", { result: { schemaVersion: 1, mode: "m0d7-runner-smoke", status: "pass", checks: [{ id: "m0d7-runner-opened", status: "pass" }, { id: "m0d7-evidence-path-ready", status: "pass", detail: path }, { id: "m0d7-procedure-idle", status: "pass" }], durationMs: 0, errors: [] } })).catch((error: unknown) => invoke("complete_smoke", { result: { schemaVersion: 1, mode: "m0d7-runner-smoke", status: "fail", checks: [{ id: "m0d7-runner-opened", status: "fail", detail: String(error) }], durationMs: 0, errors: [{ code: "M0D7_SMOKE_FAILED", message: String(error) }] } }));
  }

  return () => {
    disposed = true;
    window.clearInterval(interval);
    if (!finalResultShown) void source.stop();
    root.remove();
  };
}
