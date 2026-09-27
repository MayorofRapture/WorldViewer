import type { TrackingObservation } from "../../mediapipe/trackingObservationNormalizer";
import { createScreenGeometry } from "../../engine/geometry/screenGeometry";
import {
  createM0DObservationRecord,
  type M0DEvidenceEnvelope,
  type M0DObservationTraceRecord,
  type M0DReplayOutputRecord,
  type M0DRunManifest,
} from "../evidence/m0dEvidenceContracts";
import { validateM0DEvidenceBundle, type M0DEvidenceValidationResult } from "../evidence/m0dEvidenceValidator";
import { stableM0DJsonStringify } from "../evidence/m0dSerialization";
import { createSharedEstimatorCalibration } from "../estimators/calibration";
import {
  calibrateEstimatorA,
  mediaPipeFacialTransformEstimator,
  validateEstimatorACalibration,
  type EstimatorACalibration,
} from "../estimators/mediaPipeFacialTransformEstimator";
import {
  calibrateEstimatorB,
  interocularScaleEstimator,
  validateEstimatorBCalibration,
  type EstimatorBCalibration,
} from "../estimators/interocularScaleEstimator";
import type { EstimatorEvaluation } from "../estimators/estimatorContracts";

export interface M0DReplayClock {
  now(): number;
}

export function createHighResolutionReplayClock(): M0DReplayClock {
  return { now: () => globalThis.performance.now() };
}

export interface M0DReplayRunInput {
  readonly manifest: M0DRunManifest;
  readonly calibrationTrace: readonly M0DObservationTraceRecord[];
  readonly observationTrace: readonly M0DObservationTraceRecord[];
  readonly environment: unknown;
  readonly camera: unknown;
  readonly configuration: unknown;
  readonly filesIncluded?: readonly string[];
  readonly trialsIncluded?: readonly string[];
}

export interface M0DSerializedCandidateConfiguration {
  readonly estimatorId: string;
  readonly estimatorVersion: string;
  readonly calibration: EstimatorACalibration | EstimatorBCalibration;
  readonly configHash: string;
}

export interface M0DReplayCalibration {
  readonly estimatorA: EstimatorACalibration;
  readonly estimatorB: EstimatorBCalibration;
  readonly candidateA: M0DSerializedCandidateConfiguration;
  readonly candidateB: M0DSerializedCandidateConfiguration;
}

export interface M0DReplayRunResult {
  readonly ok: boolean;
  readonly validation: M0DEvidenceValidationResult;
  readonly calibration: M0DReplayCalibration | null;
  readonly estimatorAOutputs: readonly M0DReplayOutputRecord[];
  readonly estimatorBOutputs: readonly M0DReplayOutputRecord[];
}

export interface M0DObservationReconstructionResult {
  readonly ok: boolean;
  readonly observation: TrackingObservation | null;
  readonly reason: string | null;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function traceFailure(reason: string): M0DObservationReconstructionResult {
  return { ok: false, observation: null, reason };
}

export function reconstructTrackingObservation(record: M0DObservationTraceRecord): M0DObservationReconstructionResult {
  const core = record.observation;
  if (core.schemaVersion !== 1 || record.envelope.schemaVersion !== 1) return traceFailure("unsupported-evidence-schema-version");
  if (!Number.isInteger(core.sequenceNumber) || core.sequenceNumber < 0 || core.sequenceNumber !== record.envelope.sequenceNumber) return traceFailure("malformed-sequence-number");
  if (!finite(core.timestampMs) || core.timestampMs < 0) return traceFailure("invalid-observation-timestamp");
  if (typeof core.sourceId !== "string" || core.sourceId.trim().length === 0) return traceFailure("invalid-source-id");
  if (!finite(core.frameWidthPx) || core.frameWidthPx <= 0 || !finite(core.frameHeightPx) || core.frameHeightPx <= 0) return traceFailure("invalid-frame-dimensions");
  if (core.trackerConfidence !== null && (!finite(core.trackerConfidence) || core.trackerConfidence < 0 || core.trackerConfidence > 1)) return traceFailure("invalid-confidence");
  if (core.faceDetected === false) {
    if (core.landmarks !== null || core.facialTransformMatrix !== null) return traceFailure("invalid-no-face-record");
    return {
      ok: true,
      observation: Object.freeze({ timestampMs: core.timestampMs, sourceId: core.sourceId, frame: Object.freeze({ widthPx: core.frameWidthPx, heightPx: core.frameHeightPx }), confidence: core.trackerConfidence }),
      reason: null,
    };
  }
  if (core.faceDetected !== true || core.landmarks === null) return traceFailure("invalid-face-record");
  const landmarks: Array<{ readonly x: number; readonly y: number; readonly z: number }> = [];
  for (const index of [33, 133, 362, 263] as const) {
    const landmark = core.landmarks[String(index) as keyof typeof core.landmarks];
    if (!landmark || !finite(landmark.x) || !finite(landmark.y) || !finite(landmark.z)) return traceFailure("invalid-required-landmark");
    landmarks[index] = Object.freeze({ x: landmark.x, y: landmark.y, z: landmark.z });
  }
  if (core.facialTransformMatrix !== null && (core.facialTransformMatrix.length !== 16 || core.facialTransformMatrix.some((value) => !finite(value)))) return traceFailure("invalid-facial-transform-matrix");
  return {
    ok: true,
    observation: Object.freeze({
      timestampMs: core.timestampMs,
      sourceId: core.sourceId,
      frame: Object.freeze({ widthPx: core.frameWidthPx, heightPx: core.frameHeightPx }),
      confidence: core.trackerConfidence,
      face: Object.freeze({ normalizedLandmarks: Object.freeze(landmarks), ...(core.facialTransformMatrix === null ? {} : { facialTransformMatrix: Object.freeze([...core.facialTransformMatrix]) }) }),
    }),
    reason: null,
  };
}

function fnv1a64(text: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const character of text) {
    hash ^= BigInt(character.codePointAt(0)!);
    hash = (hash * prime) & mask;
  }
  return `fnv1a64-${hash.toString(16).padStart(16, "0")}`;
}

export function createCandidateConfigurationIdentity(
  estimatorId: string,
  estimatorVersion: string,
  calibration: EstimatorACalibration | EstimatorBCalibration,
): M0DSerializedCandidateConfiguration {
  const configuration = { estimatorId, estimatorVersion, calibration };
  return Object.freeze({ estimatorId, estimatorVersion, calibration, configHash: fnv1a64(stableM0DJsonStringify(configuration)) });
}

function outputFromEvaluation(
  observation: TrackingObservation,
  traceId: string,
  estimatorId: string,
  configHash: string,
  evaluation: EstimatorEvaluation,
  processingMs: number,
): M0DReplayOutputRecord {
  return {
    schemaVersion: 1,
    timestampMs: observation.timestampMs,
    observationTraceId: traceId,
    estimatorId,
    estimatorConfigHash: configHash,
    valid: evaluation.pose !== null,
    positionMm: evaluation.pose?.positionMm ?? null,
    invalidReason: evaluation.invalidReason,
    estimatorProcessingMs: processingMs,
  };
}

function reconstructAll(records: readonly M0DObservationTraceRecord[]): { readonly ok: boolean; readonly observations: readonly TrackingObservation[]; readonly reason: string | null } {
  const observations: TrackingObservation[] = [];
  for (const record of records) {
    const reconstructed = reconstructTrackingObservation(record);
    if (!reconstructed.ok || reconstructed.observation === null) return { ok: false, observations: [], reason: reconstructed.reason };
    observations.push(reconstructed.observation);
  }
  return { ok: true, observations, reason: null };
}

const REPLAY_DISPLAY = createScreenGeometry(1, 1);

export function replayM0DRun(input: M0DReplayRunInput, clock: M0DReplayClock = createHighResolutionReplayClock()): M0DReplayRunResult {
  const validation = validateM0DEvidenceBundle({
    manifest: input.manifest,
    observationTrace: input.observationTrace,
    calibrationTrace: input.calibrationTrace,
    replayOutputs: [],
    environment: input.environment,
    camera: input.camera,
    configuration: input.configuration,
    filesIncluded: input.filesIncluded,
    trialsIncluded: input.trialsIncluded,
  });
  if (!validation.passed) return { ok: false, validation, calibration: null, estimatorAOutputs: [], estimatorBOutputs: [] };
  const calibrationObservations = reconstructAll(input.calibrationTrace);
  const evaluationObservations = reconstructAll(input.observationTrace);
  if (!calibrationObservations.ok || !evaluationObservations.ok) return { ok: false, validation, calibration: null, estimatorAOutputs: [], estimatorBOutputs: [] };
  const sharedResult = createSharedEstimatorCalibration(input.manifest.cameraOriginScreenMm);
  if (!sharedResult.ok) return { ok: false, validation, calibration: null, estimatorAOutputs: [], estimatorBOutputs: [] };
  const calibrationA = calibrateEstimatorA(calibrationObservations.observations, sharedResult.calibration);
  const calibrationB = calibrateEstimatorB(calibrationObservations.observations, sharedResult.calibration);
  if (!calibrationA.ok || !calibrationB.ok) return { ok: false, validation, calibration: null, estimatorAOutputs: [], estimatorBOutputs: [] };
  const candidateA = createCandidateConfigurationIdentity(mediaPipeFacialTransformEstimator.id, mediaPipeFacialTransformEstimator.version, calibrationA.calibration);
  const candidateB = createCandidateConfigurationIdentity(interocularScaleEstimator.id, interocularScaleEstimator.version, calibrationB.calibration);
  if (input.manifest.estimatorA.estimatorId !== candidateA.estimatorId || input.manifest.estimatorA.configHash !== candidateA.configHash || input.manifest.estimatorB.estimatorId !== candidateB.estimatorId || input.manifest.estimatorB.configHash !== candidateB.configHash) {
    const failure = { code: "derived-candidate-config-mismatch", path: "manifest.estimatorA/estimatorB", message: "manifest candidate identities must match deterministic replay calibration and configuration hashes" };
    return { ok: false, validation: { ...validation, passed: false, failures: [...validation.failures, failure] }, calibration: { estimatorA: calibrationA.calibration, estimatorB: calibrationB.calibration, candidateA, candidateB }, estimatorAOutputs: [], estimatorBOutputs: [] };
  }
  const traceId = input.observationTrace[0]?.envelope.traceId ?? "";
  const estimatorAOutputs: M0DReplayOutputRecord[] = [];
  const estimatorBOutputs: M0DReplayOutputRecord[] = [];
  for (const observation of evaluationObservations.observations) {
    const startA = clock.now();
    const evaluationA = mediaPipeFacialTransformEstimator.estimateWithDiagnostic(observation, { display: REPLAY_DISPLAY, camera: { cameraId: "replay", positionScreenMm: input.manifest.cameraOriginScreenMm }, calibration: calibrationA.calibration });
    const endA = clock.now();
    const startB = clock.now();
    const evaluationB = interocularScaleEstimator.estimateWithDiagnostic(observation, { display: REPLAY_DISPLAY, camera: { cameraId: "replay", positionScreenMm: input.manifest.cameraOriginScreenMm }, calibration: calibrationB.calibration });
    const endB = clock.now();
    estimatorAOutputs.push(outputFromEvaluation(observation, traceId, candidateA.estimatorId, candidateA.configHash, evaluationA, Math.max(0, endA - startA)));
    estimatorBOutputs.push(outputFromEvaluation(observation, traceId, candidateB.estimatorId, candidateB.configHash, evaluationB, Math.max(0, endB - startB)));
  }
  const finalValidation = validateM0DEvidenceBundle({
    manifest: input.manifest,
    observationTrace: input.observationTrace,
    calibrationTrace: input.calibrationTrace,
    replayOutputs: [...estimatorAOutputs, ...estimatorBOutputs],
    environment: input.environment,
    camera: input.camera,
    configuration: input.configuration,
    filesIncluded: input.filesIncluded,
    trialsIncluded: input.trialsIncluded,
  });
  return { ok: finalValidation.passed, validation: finalValidation, calibration: { estimatorA: calibrationA.calibration, estimatorB: calibrationB.calibration, candidateA, candidateB }, estimatorAOutputs, estimatorBOutputs };
}

export function observationTraceFromRecords(records: readonly M0DObservationTraceRecord[]): TrackingObservation[] {
  const reconstructed = reconstructAll(records);
  if (!reconstructed.ok) throw new RangeError(reconstructed.reason ?? "observation trace is invalid");
  return [...reconstructed.observations];
}

export function evidenceRecordFromObservation(observation: TrackingObservation, envelope: M0DEvidenceEnvelope): M0DObservationTraceRecord {
  return { observation: createM0DObservationRecord(observation, envelope.sequenceNumber), envelope };
}

export function validatePersistedReplayCalibration(value: M0DReplayCalibration): boolean {
  try {
    validateEstimatorACalibration(value.estimatorA);
    validateEstimatorBCalibration(value.estimatorB);
    return value.candidateA.configHash === createCandidateConfigurationIdentity(value.candidateA.estimatorId, value.candidateA.estimatorVersion, value.estimatorA).configHash && value.candidateB.configHash === createCandidateConfigurationIdentity(value.candidateB.estimatorId, value.candidateB.estimatorVersion, value.estimatorB).configHash;
  } catch {
    return false;
  }
}
