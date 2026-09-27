import {
  createM0DObservationRecord,
  type M0DEvidenceEnvelope,
  type M0DObservationTraceRecord,
  type M0DReplayOutputRecord,
  type M0DRunManifest,
} from "../evidence/m0dEvidenceContracts";
import { serializeM0DJson, serializeM0DJsonLines } from "../evidence/m0dSerialization";
import { validateM0DEvidenceBundle, type M0DEvidenceValidationResult } from "../evidence/m0dEvidenceValidator";
import {
  deriveM0DMetricInputFromEvidence,
  deriveM0DScenarioMetricSummary,
  calculateStructuralFailureSummary,
  regenerateM0DMetricsFromEvidence,
  type M0DAuthoritativeMetricEvidence,
  type M0DCalibrationBurdenSummary,
  type M0DCandidateMetricSummary,
} from "../metrics/m0dMetrics";
import {
  createCandidateConfigurationIdentity,
  observationTraceFromRecords,
  replayM0DRun,
  type M0DReplayCalibration,
} from "../replay/m0dReplay";
import { M0D_SCENARIO_IDS, createAnomaly, createProceduralInvalidation, type M0DAnomalyRecord, type M0DProceduralInvalidationReason } from "../scenarios/m0dScenarioModel";
import {
  advanceM0D7Runner,
  beginM0D7Initialization,
  beginM0D7ReplacementAttempt,
  cancelM0D7Runner,
  createM0D7Runner,
  currentM0D7Step,
  failM0D7Runner,
  recordM0D7Anomaly,
  invalidateM0D7Attempt,
  markM0D7Ready,
  confirmM0D7TargetReached,
  type M0D7RunnerState,
  startM0D7Runner,
} from "./m0d7Procedure";
import { MEDIAPIPE_TRACKING_CAMERA_CONFIG, type TrackingObservationEvent } from "../../mediapipe/mediapipeTrackingSource";
import {
  MEDIAPIPE_CANONICAL_METADATA_SHA256,
  MEDIAPIPE_PACKAGE_VERSION,
  MEDIAPIPE_TASK_ASSET_SHA256,
  verifyMediaPipeProvenance,
  type MediaPipeProvenance,
} from "../../mediapipe/mediapipeProvenance";
import { createSharedEstimatorCalibration } from "../estimators/calibration";
import { calibrateEstimatorA, mediaPipeFacialTransformEstimator } from "../estimators/mediaPipeFacialTransformEstimator";
import { calibrateEstimatorB, interocularScaleEstimator } from "../estimators/interocularScaleEstimator";

declare const __WORLDVIEWER_BUILD_SHA__: string;

export interface M0D7Clock {
  now(): number;
}

export interface M0D7EvidenceFile {
  readonly relativePath: string;
  readonly contents: string;
}

export interface M0D7EvidenceWriter {
  write(files: readonly M0D7EvidenceFile[]): Promise<string>;
}

export interface M0D7LiveTrackingSource {
  start(): Promise<void>;
  stop(): Promise<void>;
  subscribeDetailed(listener: (event: TrackingObservationEvent) => void): () => void;
  getDroppedFrameCount(): number;
  getCameraConfiguration(): Readonly<{ widthPx: number | null; heightPx: number | null; frameRate: number | null }>;
}

export interface M0D7EvidenceRunnerOptions {
  readonly source: M0D7LiveTrackingSource;
  readonly runId: string;
  readonly cameraOriginScreenMm: Readonly<{ x: number; y: number; z: number }>;
  readonly clock?: M0D7Clock;
  readonly provenance?: () => Promise<MediaPipeProvenance>;
  readonly writer: M0D7EvidenceWriter;
  readonly steps?: readonly import("./m0d7Procedure").M0D7ProcedureStep[];
}

export interface M0D7EvidenceBundleResult {
  readonly files: readonly M0D7EvidenceFile[];
  readonly manifest: M0DRunManifest;
  readonly validation: M0DEvidenceValidationResult;
  readonly replayCalibration: M0DReplayCalibration | null;
  readonly estimatorAOutputs: readonly M0DReplayOutputRecord[];
  readonly estimatorBOutputs: readonly M0DReplayOutputRecord[];
  readonly outputRoot: string | null;
}

function nowClock(): M0D7Clock {
  return { now: () => performance.now() };
}

function finitePositive(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

function calibrationBurden(): M0DCalibrationBurdenSummary {
  return { manualMeasurementCount: 1, calibrationCaptureCount: 1, calibrationDurationSeconds: 5, candidateCalibrationStepCount: 2, description: "One operator-supplied camera-origin measurement and one shared 600 mm calibration capture; both candidates derive calibration from that trace." };
}

function allEvidencePaths(): string[] {
  return [
    "manifest.json", "environment.json", "camera.json", "configuration.json",
    "calibration/observation-trace.jsonl", "calibration/candidate-a.json", "calibration/candidate-b.json",
    "calibration/retained-invalid.jsonl",
    "observations/trace.jsonl", "estimator-a/outputs/replay.jsonl", "estimator-a/summary.json",
    "observations/retained-invalid.jsonl",
    "estimator-b/outputs/replay.jsonl", "estimator-b/summary.json", "metrics/comparison-inputs.json",
    "metrics/scenario-summary.json", "anomalies.json", "procedural-invalidations.json", "validation.json", "m0d8-review.json",
  ];
}

function manifestIdentities(
  calibrationRecords: readonly M0DObservationTraceRecord[],
  origin: Readonly<{ x: number; y: number; z: number }>,
): { readonly manifestA: M0DRunManifest["estimatorA"]; readonly manifestB: M0DRunManifest["estimatorB"]; readonly replayCalibration: M0DReplayCalibration | null } {
  try {
    const observations = observationTraceFromRecords(calibrationRecords);
    const shared = createSharedEstimatorCalibration(origin);
    if (!shared.ok) throw new Error(shared.message);
    const calibrationA = calibrateEstimatorA(observations, shared.calibration);
    const calibrationB = calibrateEstimatorB(observations, shared.calibration);
    if (!calibrationA.ok || !calibrationB.ok) throw new Error("shared calibration could not derive both candidates");
    const candidateA = createCandidateConfigurationIdentity(mediaPipeFacialTransformEstimator.id, mediaPipeFacialTransformEstimator.version, calibrationA.calibration);
    const candidateB = createCandidateConfigurationIdentity(interocularScaleEstimator.id, interocularScaleEstimator.version, calibrationB.calibration);
    return { manifestA: { estimatorId: candidateA.estimatorId, configHash: candidateA.configHash }, manifestB: { estimatorId: candidateB.estimatorId, configHash: candidateB.configHash }, replayCalibration: { estimatorA: calibrationA.calibration, estimatorB: calibrationB.calibration, candidateA, candidateB } };
  } catch {
    return { manifestA: { estimatorId: mediaPipeFacialTransformEstimator.id, configHash: "unavailable-calibration" }, manifestB: { estimatorId: interocularScaleEstimator.id, configHash: "unavailable-calibration" }, replayCalibration: null };
  }
}

function envelopeFor(state: M0D7RunnerState, event: TrackingObservationEvent, sequenceNumber: number, droppedFrames: number): M0DEvidenceEnvelope {
  const current = currentM0D7Step(state);
  if (current === null) throw new Error("cannot record an observation without an active procedure step");
  return {
    schemaVersion: 1,
    sequenceNumber,
    traceId: state.runId,
    scenarioId: current.scenarioId,
    segmentId: current.stepId,
    unitId: current.unitId,
    ...(current.trialNumber === null ? {} : { trialId: `${current.scenarioId}-trial-${current.trialNumber}` }),
    ...(current.cycleId === null ? {} : { cycleId: current.cycleId }),
    ...(current.holdId === null ? {} : { holdId: current.holdId }),
    stepKind: current.kind,
    attemptId: state.attemptId,
    experimentRunId: state.runId,
    configurationIds: ["mediapipe-640x360-24hz"],
    configurationHashes: [`${MEDIAPIPE_PACKAGE_VERSION}:${MEDIAPIPE_TASK_ASSET_SHA256}:${MEDIAPIPE_CANONICAL_METADATA_SHA256}`],
    workerTiming: { inferenceDurationMs: event.inferenceDurationMs, completedAtMs: event.completedAtMs },
    diagnostics: { droppedFrames, stepKind: current.kind, targetMm: current.targetMm, targetAxis: current.targetAxis },
  };
}

function recordForEvent(state: M0D7RunnerState, event: TrackingObservationEvent, sequenceNumber: number, droppedFrames: number): M0DObservationTraceRecord {
  return { observation: createM0DObservationRecord(event.observation, sequenceNumber), envelope: envelopeFor(state, event, sequenceNumber, droppedFrames) };
}

function metricEvidence(
  observationTrace: readonly M0DObservationTraceRecord[],
  estimatorAOutputs: readonly M0DReplayOutputRecord[],
  estimatorBOutputs: readonly M0DReplayOutputRecord[],
): { readonly evidence: M0DAuthoritativeMetricEvidence; readonly inputA: ReturnType<typeof deriveM0DMetricInputFromEvidence>; readonly inputB: ReturnType<typeof deriveM0DMetricInputFromEvidence>; readonly summaryA: M0DCandidateMetricSummary; readonly summaryB: M0DCandidateMetricSummary } {
  const burden = calibrationBurden();
  const evidenceA = { observationTrace, replayOutputs: estimatorAOutputs, calibrationBurden: burden };
  const evidenceB = { observationTrace, replayOutputs: estimatorBOutputs, calibrationBurden: burden };
  return { evidence: evidenceA, inputA: deriveM0DMetricInputFromEvidence(evidenceA, mediaPipeFacialTransformEstimator.id), inputB: deriveM0DMetricInputFromEvidence(evidenceB, interocularScaleEstimator.id), summaryA: regenerateM0DMetricsFromEvidence(evidenceA, mediaPipeFacialTransformEstimator.id), summaryB: regenerateM0DMetricsFromEvidence(evidenceB, interocularScaleEstimator.id) };
}

export class M0D7EvidenceRunner {
  private readonly source: M0D7LiveTrackingSource;
  private readonly runId: string;
  private readonly origin: Readonly<{ x: number; y: number; z: number }>;
  private readonly clock: M0D7Clock;
  private readonly provenanceProvider: () => Promise<MediaPipeProvenance>;
  private readonly writer: M0D7EvidenceWriter;
  private readonly calibrationTrace: M0DObservationTraceRecord[] = [];
  private readonly observationTrace: M0DObservationTraceRecord[] = [];
  private authoritativeCalibrationTrace: readonly M0DObservationTraceRecord[] = [];
  private authoritativeObservationTrace: readonly M0DObservationTraceRecord[] = [];
  private unsubscribe: (() => void) | undefined;
  private state: M0D7RunnerState;
  private sequenceNumber = 0;
  private finalizing: Promise<M0D7EvidenceBundleResult> | undefined;

  public constructor(options: M0D7EvidenceRunnerOptions) {
    this.source = options.source;
    this.runId = options.runId;
    this.origin = options.cameraOriginScreenMm;
    this.clock = options.clock ?? nowClock();
    this.provenanceProvider = options.provenance ?? verifyMediaPipeProvenance;
    this.writer = options.writer;
    this.state = createM0D7Runner(options.runId, options.steps);
  }

  public getState(): M0D7RunnerState { return this.state; }

  public async start(): Promise<void> {
    this.state = beginM0D7Initialization(this.state);
    await this.provenanceProvider();
    try {
      await this.source.start();
      const actual = this.source.getCameraConfiguration();
      this.state = markM0D7Ready(this.state, actual);
      const wrongCameraConfiguration = !finitePositive(actual.widthPx) || !finitePositive(actual.heightPx) || !finitePositive(actual.frameRate)
        || actual.widthPx !== MEDIAPIPE_TRACKING_CAMERA_CONFIG.widthPx
        || actual.heightPx !== MEDIAPIPE_TRACKING_CAMERA_CONFIG.heightPx
        || Math.abs(actual.frameRate - MEDIAPIPE_TRACKING_CAMERA_CONFIG.frameRate) > 0.01;
      if (wrongCameraConfiguration) {
        this.invalidateCurrentAttempt("wrong-camera-capture-mode", `Actual camera configuration was ${actual.widthPx}×${actual.heightPx} @ ${actual.frameRate} FPS; requested 640×360 @ 24 FPS.`);
        this.state = failM0D7Runner(this.state, "actual camera configuration is unavailable or does not match the requested capture mode");
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        await this.source.stop();
      } else {
        this.unsubscribe = this.source.subscribeDetailed((event) => this.acceptObservation(event));
      }
    } catch (error) {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      this.state = failM0D7Runner(this.state, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  public beginProcedure(nowMs = this.clock.now()): M0D7RunnerState {
    this.state = startM0D7Runner(this.state, nowMs);
    return this.state;
  }

  public confirmTargetReached(nowMs = this.clock.now()): M0D7RunnerState {
    this.state = confirmM0D7TargetReached(this.state, nowMs);
    return this.state;
  }

  public tick(nowMs = this.clock.now()): M0D7RunnerState {
    this.state = advanceM0D7Runner(this.state, nowMs);
    if (this.state.status === "complete") void this.finalize();
    return this.state;
  }

  public async cancel(reason = "operator cancelled run"): Promise<M0D7EvidenceBundleResult> {
    this.state = cancelM0D7Runner(this.state, reason);
    return this.finalize();
  }

  public invalidateCurrentAttempt(reason: M0DProceduralInvalidationReason, detail: string, stationaryPhase?: "settling" | "capture"): M0D7RunnerState {
    const current = currentM0D7Step(this.state);
    if (current === null) throw new Error("no active M0D7 procedure step");
    const trialId = current.trialNumber === null ? null : `${current.scenarioId}-trial-${current.trialNumber}`;
    this.state = invalidateM0D7Attempt(this.state, createProceduralInvalidation({ invalidationId: `${this.runId}-invalidation-${this.state.proceduralInvalidations.length + 1}`, experimentRunId: this.runId, scenarioId: current.scenarioId, trialId, attemptId: this.state.attemptId, originalAttemptId: null, replacementAttemptId: null, reason, ...(stationaryPhase === undefined ? {} : { stationaryPhase }), detail }));
    return this.state;
  }

  public beginReplacementAttempt(nowMs = this.clock.now()): M0D7RunnerState {
    this.state = beginM0D7ReplacementAttempt(this.state, nowMs);
    return this.state;
  }

  public recordAnomaly(anomaly: { readonly anomalyId: string; readonly scenarioId: M0D7RunnerState["steps"][number]["scenarioId"]; readonly detail: string }): M0D7RunnerState {
    this.state = recordM0D7Anomaly(this.state, { ...anomaly, attemptId: this.state.attemptId });
    return this.state;
  }

  public async finalize(): Promise<M0D7EvidenceBundleResult> {
    if (this.finalizing !== undefined) return this.finalizing;
    this.finalizing = this.finalizeInternal();
    return this.finalizing;
  }

  private acceptObservation(event: TrackingObservationEvent): void {
    if (this.state.status !== "running") return;
    const record = recordForEvent(this.state, event, this.sequenceNumber, this.source.getDroppedFrameCount());
    this.sequenceNumber += 1;
    if (record.envelope.scenarioId === "calibration") this.calibrationTrace.push(record);
    else this.observationTrace.push(record);
  }

  private async finalizeInternal(): Promise<M0D7EvidenceBundleResult> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    await this.source.stop();
    const actualCamera = this.source.getCameraConfiguration();
    const invalidAttemptIds = new Set(this.state.proceduralInvalidations.map((record) => record.attemptId));
    this.authoritativeCalibrationTrace = this.calibrationTrace.filter((record) => !invalidAttemptIds.has(record.envelope.attemptId ?? ""));
    this.authoritativeObservationTrace = this.observationTrace.filter((record) => !invalidAttemptIds.has(record.envelope.attemptId ?? ""));
    const cameraConfiguration = { widthPx: actualCamera.widthPx, heightPx: actualCamera.heightPx, fps: actualCamera.frameRate };
    const identities = manifestIdentities(this.authoritativeCalibrationTrace, this.origin);
    const manifest: M0DRunManifest = {
      schemaVersion: 1, experimentSpecVersion: "0.4", experimentProcedureVersion: 3, applicationBuildCommit: __WORLDVIEWER_BUILD_SHA__, mediaPipePackageVersion: MEDIAPIPE_PACKAGE_VERSION, mediaPipeModelVersion: "face_landmarker.task", canonicalModelSource: "evidence/m0d/estimator-experiment-v3/canonical-face-model.json", canonicalModelHash: `${MEDIAPIPE_TASK_ASSET_SHA256}:${MEDIAPIPE_CANONICAL_METADATA_SHA256}`, cameraConfiguration, display: { profileId: "operator-supplied-display", reference: "screen-relative-millimeter-frame" }, cameraOriginScreenMm: this.origin, estimatorA: identities.manifestA, estimatorB: identities.manifestB, runStartTimestampMs: this.calibrationTrace.concat(this.observationTrace).map((record) => record.observation.timestampMs).sort((a, b) => a - b)[0] ?? 0, runEndTimestampMs: this.calibrationTrace.concat(this.observationTrace).map((record) => record.observation.timestampMs).sort((a, b) => a - b).at(-1) ?? 0,
    };
    const filesIncluded = allEvidencePaths();
    const environment = { application: "WorldViewer", runnerVersion: "m0d7-v1", buildSha: __WORLDVIEWER_BUILD_SHA__, mediaPipePackageVersion: MEDIAPIPE_PACKAGE_VERSION };
    const camera = { requested: MEDIAPIPE_TRACKING_CAMERA_CONFIG, actual: actualCamera, droppedFrameCount: this.source.getDroppedFrameCount(), cameraOriginScreenMm: this.origin };
    const configuration = { delegate: "CPU", runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: true, calibrationBurden: calibrationBurden() };
    const acceptedTrialIds = [...new Set(this.authoritativeObservationTrace.map((record) => record.envelope.trialId).filter((value): value is string => typeof value === "string"))];
    const replay = replayM0DRun({ manifest, calibrationTrace: this.authoritativeCalibrationTrace, observationTrace: this.authoritativeObservationTrace, environment, camera, configuration, filesIncluded, trialsIncluded: acceptedTrialIds }, { now: () => performance.now() });
    const outputsA = replay.estimatorAOutputs;
    const outputsB = replay.estimatorBOutputs;
    const metrics = metricEvidence(this.authoritativeObservationTrace, outputsA, outputsB);
    const anomalies: M0DAnomalyRecord[] = this.state.anomalies.map((anomaly, index) => createAnomaly({ anomalyId: anomaly.anomalyId || `${this.runId}-anomaly-${index + 1}`, experimentRunId: this.runId, scenarioId: anomaly.scenarioId, trialId: null, attemptId: anomaly.attemptId, sequenceNumber: null, estimatorId: null, kind: "runner-anomaly", detail: anomaly.detail }));
    const validation = validateM0DEvidenceBundle({ manifest, environment, camera, configuration, calibrationTrace: this.authoritativeCalibrationTrace, observationTrace: this.authoritativeObservationTrace, replayOutputs: [...outputsA, ...outputsB], filesIncluded, trialsIncluded: acceptedTrialIds, requiredScenarioIds: [...M0D_SCENARIO_IDS], requiredTrialIds: [...new Set(this.state.steps.map((step) => step.trialId).filter((value): value is string => value !== null))], storedMetrics: { [mediaPipeFacialTransformEstimator.id]: metrics.summaryA, [interocularScaleEstimator.id]: metrics.summaryB }, proceduralInvalidations: this.state.proceduralInvalidations, anomalies, procedureMarkers: this.state.markers, requiredCycleIds: [...new Set(this.state.steps.map((step) => step.cycleId).filter((value): value is string => value !== null))], requiredHoldIds: [...new Set(this.state.steps.map((step) => step.holdId).filter((value): value is string => value !== null))] });
    const scenarioA = deriveM0DScenarioMetricSummary({ observationTrace: this.authoritativeObservationTrace, replayOutputs: outputsA, calibrationBurden: calibrationBurden() }, mediaPipeFacialTransformEstimator.id);
    const scenarioB = deriveM0DScenarioMetricSummary({ observationTrace: this.authoritativeObservationTrace, replayOutputs: outputsB, calibrationBurden: calibrationBurden() }, interocularScaleEstimator.id);
    const cycles = (scenario: typeof scenarioA, scenarioId: string) => scenario.movement.filter((value) => value.scenarioId === scenarioId).map((value) => value.orderingCycle);
    const structuralA = calculateStructuralFailureSummary({ replayOutputs: outputsA, calibrationValid: replay.calibration !== null, replayable: replay.ok, xCycles: cycles(scenarioA, "lateral-movement"), yCycles: cycles(scenarioA, "vertical-movement"), zCycles: cycles(scenarioA, "approach-retreat") });
    const structuralB = calculateStructuralFailureSummary({ replayOutputs: outputsB, calibrationValid: replay.calibration !== null, replayable: replay.ok, xCycles: cycles(scenarioB, "lateral-movement"), yCycles: cycles(scenarioB, "vertical-movement"), zCycles: cycles(scenarioB, "approach-retreat") });
    const files = this.buildFiles(manifest, environment, camera, configuration, replay.calibration, outputsA, outputsB, metrics.summaryA, metrics.summaryB, { ...scenarioA, structural: structuralA }, { ...scenarioB, structural: structuralB }, validation, anomalies);
    const outputRoot = await this.writer.write(files);
    return { files, manifest, validation, replayCalibration: replay.calibration, estimatorAOutputs: outputsA, estimatorBOutputs: outputsB, outputRoot };
  }

  private buildFiles(manifest: M0DRunManifest, environment: unknown, camera: unknown, configuration: unknown, calibration: M0DReplayCalibration | null, outputsA: readonly M0DReplayOutputRecord[], outputsB: readonly M0DReplayOutputRecord[], summaryA: M0DCandidateMetricSummary, summaryB: M0DCandidateMetricSummary, structuralA: unknown, structuralB: unknown, validation: M0DEvidenceValidationResult, anomalies: readonly M0DAnomalyRecord[]): readonly M0D7EvidenceFile[] {
    const json = (relativePath: string, value: unknown): M0D7EvidenceFile => ({ relativePath, contents: serializeM0DJson(value) });
    return Object.freeze([
      json("manifest.json", manifest), json("environment.json", environment), json("camera.json", camera), json("configuration.json", configuration),
      { relativePath: "calibration/observation-trace.jsonl", contents: serializeM0DJsonLines(this.authoritativeCalibrationTrace) },
      { relativePath: "calibration/retained-invalid.jsonl", contents: serializeM0DJsonLines(this.calibrationTrace.filter((record) => !this.authoritativeCalibrationTrace.includes(record))) },
      json("calibration/candidate-a.json", calibration?.candidateA ?? { status: "calibration-unavailable" }), json("calibration/candidate-b.json", calibration?.candidateB ?? { status: "calibration-unavailable" }),
      { relativePath: "observations/trace.jsonl", contents: serializeM0DJsonLines(this.authoritativeObservationTrace) },
      { relativePath: "observations/retained-invalid.jsonl", contents: serializeM0DJsonLines(this.observationTrace.filter((record) => !this.authoritativeObservationTrace.includes(record))) },
      { relativePath: "estimator-a/outputs/replay.jsonl", contents: serializeM0DJsonLines(outputsA) }, json("estimator-a/summary.json", summaryA),
      { relativePath: "estimator-b/outputs/replay.jsonl", contents: serializeM0DJsonLines(outputsB) }, json("estimator-b/summary.json", summaryB),
      json("metrics/comparison-inputs.json", { estimatorA: deriveM0DMetricInputFromEvidence({ observationTrace: this.authoritativeObservationTrace, replayOutputs: outputsA, calibrationBurden: calibrationBurden() }, mediaPipeFacialTransformEstimator.id), estimatorB: deriveM0DMetricInputFromEvidence({ observationTrace: this.authoritativeObservationTrace, replayOutputs: outputsB, calibrationBurden: calibrationBurden() }, interocularScaleEstimator.id) }),
      json("metrics/scenario-summary.json", { scenarios: M0D_SCENARIO_IDS, markers: this.state.markers, estimatorA: structuralA, estimatorB: structuralB, status: validation.passed ? "validated" : "validation-failed" }), json("anomalies.json", anomalies), json("procedural-invalidations.json", this.state.proceduralInvalidations), json("validation.json", validation), json("m0d8-review.json", { status: "not-started", message: "M0D8 interpretation and candidate selection have not occurred." }),
    ]);
  }
}
