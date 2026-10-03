import { createM0DObservationRecord, type M0DObservationTraceRecord } from "../../m0d/evidence/m0dEvidenceContracts";
import { serializeM0DJson, serializeM0DJsonLines } from "../../m0d/evidence/m0dSerialization";
import { reconstructTrackingObservation } from "../../m0d/replay/m0dReplay";
import { mediaPipeFacialTransformEstimator } from "../../m0d/estimators/mediaPipeFacialTransformEstimator";
import { createScreenGeometry } from "../../engine/geometry/screenGeometry";
import type { M0DProceduralInvalidationRecord } from "../../m0d/scenarios/m0dScenarioModel";
import { MEDIAPIPE_PACKAGE_VERSION, MEDIAPIPE_CANONICAL_METADATA_SHA256, MEDIAPIPE_TASK_ASSET_SHA256 } from "../../mediapipe/mediapipeProvenance";
import { MEDIAPIPE_TRACKING_CAMERA_CONFIG, type TrackingObservationEvent } from "../../mediapipe/mediapipeTrackingSource";
import { createSelectedEstimatorACalibration, selectedEstimatorIdentity } from "../selectedEstimatorHandoff";
import { advanceM0E5Runner, beginM0E5Initialization, beginM0E5ReplacementAttempt, cancelM0E5Runner, confirmM0E5TargetReached, createM0E5Runner, currentM0E5Step, failM0E5Runner, invalidateM0E5Attempt, markM0E5Ready, startM0E5Runner, type M0E5RunnerState } from "./m0e5Procedure";

export interface M0E5LiveTrackingSource { start(): Promise<void>; stop(): Promise<void>; subscribeDetailed(listener: (event: TrackingObservationEvent) => void): () => void; getDroppedFrameCount(): number; getCameraConfiguration(): Readonly<{ widthPx: number | null; heightPx: number | null; frameRate: number | null }>; }
export interface M0E5EvidenceFile { readonly relativePath: string; readonly contents: string; }
export interface M0E5EvidenceWriter { write(files: readonly M0E5EvidenceFile[]): Promise<string>; }
export interface M0E5Clock { now(): number; }
export interface M0E5EvidenceRunnerOptions { readonly source: M0E5LiveTrackingSource; readonly runId: string; readonly writer: M0E5EvidenceWriter; readonly clock?: M0E5Clock; readonly steps?: readonly import("./m0e5Procedure").M0E5ProcedureStep[]; }
export interface M0E5EstimatorAReplayRecord { readonly schemaVersion: 1; readonly timestampMs: number; readonly observationTraceId: string; readonly estimatorId: string; readonly estimatorConfigHash: string; readonly valid: boolean; readonly positionMm: Readonly<{ readonly x: number; readonly y: number; readonly z: number }> | null; readonly invalidReason: string | null; }

function clock(): M0E5Clock { return { now: () => performance.now() }; }
function envelope(state: M0E5RunnerState, event: TrackingObservationEvent, sequenceNumber: number): M0DObservationTraceRecord["envelope"] {
  const step = currentM0E5Step(state); if (!step) throw new Error("cannot record without an active M0E5 step");
  return { schemaVersion: 1, sequenceNumber, traceId: state.runId, scenarioId: step.scenarioId, segmentId: step.segmentId, unitId: step.unitId, ...(step.trialId ? { trialId: step.trialId } : {}), ...(step.cycleId ? { cycleId: step.cycleId } : {}), holdId: step.unitId, stepKind: step.kind === "transition" ? "transition" : step.kind === "hold" ? "hold" : step.kind, attemptId: state.attemptId, experimentRunId: state.runId, configurationIds: ["mediapipe-640x360-24hz"], configurationHashes: [`${MEDIAPIPE_PACKAGE_VERSION}:${MEDIAPIPE_TASK_ASSET_SHA256}:${MEDIAPIPE_CANONICAL_METADATA_SHA256}`], workerTiming: { inferenceDurationMs: event.inferenceDurationMs, completedAtMs: event.completedAtMs }, diagnostics: { targetAxis: step.targetAxis, targetMm: step.targetMm, physicalInterpretation: step.physicalInterpretation, settleCaptureSegment: step.scenarioId === "neutral-stationary" ? step.kind : null } };
}

const REPLAY_DISPLAY = createScreenGeometry(1, 1);

export function replaySelectedEstimatorA(records: readonly M0DObservationTraceRecord[]): readonly M0E5EstimatorAReplayRecord[] {
  const identity = selectedEstimatorIdentity();
  const calibration = createSelectedEstimatorACalibration();
  return Object.freeze(records.map((record) => {
    const reconstructed = reconstructTrackingObservation(record);
    if (!reconstructed.ok || reconstructed.observation === null) {
      return { schemaVersion: 1 as const, timestampMs: record.observation.timestampMs, observationTraceId: record.envelope.traceId, estimatorId: identity.id, estimatorConfigHash: identity.configHash, valid: false, positionMm: null, invalidReason: reconstructed.reason ?? "observation-reconstruction-failed" };
    }
    const evaluation = mediaPipeFacialTransformEstimator.estimateWithDiagnostic(reconstructed.observation, { display: REPLAY_DISPLAY, camera: { cameraId: "m0e5-replay", positionScreenMm: calibration.cameraOriginScreenMm }, calibration });
    return { schemaVersion: 1 as const, timestampMs: record.observation.timestampMs, observationTraceId: record.envelope.traceId, estimatorId: identity.id, estimatorConfigHash: identity.configHash, valid: evaluation.pose !== null, positionMm: evaluation.pose?.positionMm ?? null, invalidReason: evaluation.invalidReason };
  }));
}

function finitePositive(value: number | null): value is number { return value !== null && Number.isFinite(value) && value > 0; }

function cameraConfigurationMatches(actual: M0E5LiveTrackingSource["getCameraConfiguration"] extends () => infer T ? T : never): boolean {
  return finitePositive(actual.widthPx) && finitePositive(actual.heightPx) && finitePositive(actual.frameRate)
    && actual.widthPx === MEDIAPIPE_TRACKING_CAMERA_CONFIG.widthPx
    && actual.heightPx === MEDIAPIPE_TRACKING_CAMERA_CONFIG.heightPx
    && Math.abs(actual.frameRate - MEDIAPIPE_TRACKING_CAMERA_CONFIG.frameRate) <= 0.01;
}

export class M0E5EvidenceRunner {
  private readonly source: M0E5LiveTrackingSource; private readonly writer: M0E5EvidenceWriter; private readonly runId: string; private readonly clock: M0E5Clock; private state: M0E5RunnerState; private unsubscribe: (() => void) | undefined; private sequence = 0; private readonly records: M0DObservationTraceRecord[] = []; private finalizing: Promise<M0E5EvidenceBundleResult> | undefined;
  public constructor(options: M0E5EvidenceRunnerOptions) { this.source = options.source; this.writer = options.writer; this.runId = options.runId; this.clock = options.clock ?? clock(); this.state = createM0E5Runner(options.runId, options.steps); }
  public getState(): M0E5RunnerState { return this.state; }
  public async start(): Promise<void> { this.state = beginM0E5Initialization(this.state); let started = false; try { await this.source.start(); started = true; const actual = this.source.getCameraConfiguration(); this.state = { ...this.state, actualCameraConfiguration: actual }; if (!cameraConfigurationMatches(actual)) { this.state = failM0E5Runner(this.state, `Actual camera configuration was ${actual.widthPx}×${actual.heightPx} @ ${actual.frameRate} FPS; requested 640×360 @ 24 FPS.`); await this.source.stop(); return; } this.state = markM0E5Ready(this.state, actual); this.unsubscribe = this.source.subscribeDetailed((event) => this.accept(event)); } catch (error) { this.unsubscribe?.(); this.unsubscribe = undefined; if (started) await this.source.stop(); this.state = failM0E5Runner(this.state, error instanceof Error ? error.message : String(error)); throw error; } }
  public beginProcedure(now = this.clock.now()): M0E5RunnerState { this.state = startM0E5Runner(this.state, now); return this.state; }
  public confirmTargetReached(now = this.clock.now()): M0E5RunnerState { this.state = confirmM0E5TargetReached(this.state, now); return this.state; }
  public tick(now = this.clock.now()): M0E5RunnerState { this.state = advanceM0E5Runner(this.state, now); return this.state; }
  public async cancel(reason = "operator cancelled run"): Promise<M0E5EvidenceBundleResult> { this.state = cancelM0E5Runner(this.state, reason); return this.finalize(); }
  public invalidateCurrentAttempt(reason: "external-interruption" | "operator-moved-after-settling-during-stationary-capture", detail: string): M0E5RunnerState { this.state = invalidateM0E5Attempt(this.state, reason, detail); return this.state; }
  public beginReplacementAttempt(now = this.clock.now()): M0E5RunnerState { this.state = beginM0E5ReplacementAttempt(this.state, now); return this.state; }
  public async finalize(): Promise<M0E5EvidenceBundleResult> { this.finalizing ??= this.finalizeInternal(); return this.finalizing; }
  private accept(event: TrackingObservationEvent): void { if (this.state.status !== "running") return; const observation = createM0DObservationRecord(event.observation, this.sequence); this.records.push({ observation, envelope: envelope(this.state, event, this.sequence) }); this.sequence += 1; }
  private async finalizeInternal(): Promise<M0E5EvidenceBundleResult> { this.unsubscribe?.(); this.unsubscribe = undefined; await this.source.stop(); const invalidated = new Set(this.state.proceduralInvalidations.map((item) => `${item.attemptId}|${item.unitId}`)); const retained = this.records.filter((record) => !invalidated.has(`${record.envelope.attemptId}|${record.envelope.unitId}`)); const replay = replaySelectedEstimatorA(retained); const manifest = { schemaVersion: 1, evidenceSchemaVersion: 1, experimentProcedureVersion: 1, runnerVersion: "m0e5-recollection-v1", runId: this.runId, estimator: selectedEstimatorIdentity(), mediaPipePackageVersion: MEDIAPIPE_PACKAGE_VERSION, camera: { requested: { widthPx: 640, heightPx: 360, frameRate: 24 }, actual: this.state.actualCameraConfiguration, verified: this.state.cameraConfigurationVerified, droppedFrameCount: this.source.getDroppedFrameCount() }, collection: { xCycles: 3, xTargetsMm: [-150, 0, 150, 0], yCycles: 3, yTargetsMm: [-100, 0, 100, 0], neutralTrialIds: ["neutral-stationary-trial-1", "neutral-stationary-trial-2", "neutral-stationary-trial-3", "neutral-stationary-trial-4", "neutral-stationary-trial-5"], settleMs: 2000, captureMs: 5000 }, status: this.state.status === "complete" ? "complete" : this.state.status === "failed" ? "failed" : "cancelled", finalCalibrationSelection: "not-performed", filterSweep: "not-performed" };
    const json = (relativePath: string, value: unknown): M0E5EvidenceFile => ({ relativePath, contents: serializeM0DJson(value) });
    const files = Object.freeze([json("manifest.json", manifest), json("camera.json", manifest.camera), json("estimator.json", { ...selectedEstimatorIdentity(), source: "selected-estimator-handoff" }), { relativePath: "source/trace.jsonl", contents: serializeM0DJsonLines(retained) }, { relativePath: "source/retained-invalid.jsonl", contents: serializeM0DJsonLines(this.records.filter((record) => !retained.includes(record))) }, { relativePath: "estimator-a/outputs/replay.jsonl", contents: serializeM0DJsonLines(replay) }, json("procedure-markers.json", this.state.markers), json("procedural-invalidations.json", this.state.proceduralInvalidations), json("collection-summary.json", { retainedRecordCount: retained.length, invalidatedRecordCount: this.records.length - retained.length, authoritativeReplayRecordCount: replay.length, sourceM0DRunId: "reusable-m0d-source", reusableInputs: ["M0D Z calibration", "M0D X/Y/Z motion-transition evidence"] }), json("analysis-status.json", { calibrationFit: "not-performed", filterSweep: "not-performed", m0e7: "not-started", m0e8: "not-started" })]);
    const outputRoot = await this.writer.write(files); return { files, manifest, outputRoot, retainedRecords: retained, proceduralInvalidations: this.state.proceduralInvalidations };
  }
}

export interface M0E5EvidenceBundleResult { readonly files: readonly M0E5EvidenceFile[]; readonly manifest: unknown; readonly outputRoot: string; readonly retainedRecords: readonly M0DObservationTraceRecord[]; readonly proceduralInvalidations: readonly M0DProceduralInvalidationRecord[]; }
