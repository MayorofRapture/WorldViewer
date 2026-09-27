import {
  M0D_EVIDENCE_SCHEMA_VERSION,
  M0D_EXPERIMENT_PROCEDURE_VERSION,
  M0D_EXPERIMENT_SPEC_VERSION,
  M0D_VALIDATOR_VERSION,
  M0D_REQUIRED_LANDMARK_INDICES,
  type M0DJsonValue,
} from "./m0dEvidenceContracts";
import { stableM0DJsonStringify } from "./m0dSerialization";
import { calculateCandidateMetricSummary, type M0DCandidateMetricInput } from "../metrics/m0dMetrics";
import { M0D_PROCEDURAL_INVALIDATION_REASONS, getM0DScenario } from "../scenarios/m0dScenarioModel";

export interface M0DEvidenceBundleInput {
  readonly manifest: unknown;
  readonly observationTrace?: readonly unknown[];
  readonly replayOutputs?: readonly unknown[];
  readonly calibrationTrace?: readonly unknown[];
  readonly environment?: unknown;
  readonly camera?: unknown;
  readonly configuration?: unknown;
  readonly filesIncluded?: readonly string[];
  readonly trialsIncluded?: readonly string[];
  readonly requiredScenarioIds?: readonly string[];
  readonly requiredTrialIds?: readonly string[];
  readonly proceduralInvalidations?: readonly unknown[];
  readonly anomalies?: readonly unknown[];
  readonly storedMetrics?: unknown;
  readonly metricInput?: M0DCandidateMetricInput;
}

export interface M0DEvidenceValidationFailure {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface M0DEvidenceValidationWarning {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface M0DEvidenceValidationResult {
  readonly validatorVersion: typeof M0D_VALIDATOR_VERSION;
  readonly evidenceSchemaVersion: number | null;
  readonly checksPerformed: readonly string[];
  readonly passed: boolean;
  readonly failures: readonly M0DEvidenceValidationFailure[];
  readonly warnings: readonly M0DEvidenceValidationWarning[];
  readonly filesIncluded: readonly string[];
  readonly trialsIncluded: readonly string[];
}

const CHECKS_PERFORMED = [
  "manifest-schema-version",
  "manifest-experiment-version",
  "manifest-required-fields",
  "manifest-camera-origin",
  "manifest-camera-configuration",
  "finite-numeric-values",
  "observation-schema-and-envelope",
  "observation-sequence-and-timestamps",
  "observation-frame-and-face-shape",
  "replay-output-schema",
  "replay-output-validity-coherence",
  "candidate-configuration-identity",
  "shared-observation-trace-identity",
  "required-bundle-files-and-context",
  "calibration-trace",
  "configuration-consistency",
  "required-scenario-and-trial-coverage",
  "procedural-invalidation-and-anomaly-records",
  "metric-regeneration",
] as const;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function addFailure(
  failures: M0DEvidenceValidationFailure[],
  code: string,
  path: string,
  message: string,
): void {
  failures.push({ code, path, message });
}

function addWarning(
  warnings: M0DEvidenceValidationWarning[],
  code: string,
  path: string,
  message: string,
): void {
  warnings.push({ code, path, message });
}

function validateJsonValue(
  value: unknown,
  path: string,
  failures: M0DEvidenceValidationFailure[],
): value is M0DJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      addFailure(failures, "non-finite-value", path, "JSON numeric values must be finite");
      return false;
    }
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((child, index) => validateJsonValue(child, `${path}[${index}]`, failures));
  }
  if (plainRecord(value)) {
    return Object.entries(value).every(([key, child]) => validateJsonValue(child, `${path}.${key}`, failures));
  }
  addFailure(failures, "non-serializable-value", path, "value must be plain JSON data without undefined, functions, or class instances");
  return false;
}

function validateFiniteVec3(
  value: unknown,
  path: string,
  failures: M0DEvidenceValidationFailure[],
): boolean {
  if (!plainRecord(value)) {
    addFailure(failures, "invalid-vector", path, "vector must be an object");
    return false;
  }
  let valid = true;
  for (const axis of ["x", "y", "z"] as const) {
    if (!finite(value[axis])) {
      addFailure(failures, "non-finite-value", `${path}.${axis}`, "vector component must be finite");
      valid = false;
    }
  }
  return valid;
}

function validatePositiveFinite(
  value: unknown,
  path: string,
  failures: M0DEvidenceValidationFailure[],
): boolean {
  if (!finite(value) || value <= 0) {
    addFailure(failures, "invalid-positive-number", path, "value must be finite and greater than zero");
    return false;
  }
  return true;
}

function validateManifest(
  value: unknown,
  failures: M0DEvidenceValidationFailure[],
): number | null {
  if (!plainRecord(value)) {
    addFailure(failures, "missing-manifest", "manifest", "manifest must be a plain object");
    return null;
  }

  const schemaVersion = value.schemaVersion;
  if (!Number.isInteger(schemaVersion) || schemaVersion !== M0D_EVIDENCE_SCHEMA_VERSION) {
    addFailure(failures, "unsupported-evidence-schema-version", "manifest.schemaVersion", `supported evidence schemaVersion is ${M0D_EVIDENCE_SCHEMA_VERSION}`);
  }
  const reportedSchemaVersion = finite(schemaVersion) ? schemaVersion : null;

  const requiredFields = [
    "schemaVersion",
    "experimentSpecVersion",
    "experimentProcedureVersion",
    "applicationBuildCommit",
    "mediaPipePackageVersion",
    "mediaPipeModelVersion",
    "canonicalModelSource",
    "canonicalModelHash",
    "cameraConfiguration",
    "display",
    "cameraOriginScreenMm",
    "estimatorA",
    "estimatorB",
    "runStartTimestampMs",
    "runEndTimestampMs",
  ];
  for (const field of requiredFields) {
    if (!Object.prototype.hasOwnProperty.call(value, field) || value[field] === undefined) {
      addFailure(failures, "missing-required-manifest-field", `manifest.${field}`, "required manifest field is missing");
    }
  }

  if (value.experimentSpecVersion !== M0D_EXPERIMENT_SPEC_VERSION) {
    addFailure(failures, "wrong-experiment-spec-version", "manifest.experimentSpecVersion", `experimentSpecVersion must be ${M0D_EXPERIMENT_SPEC_VERSION}`);
  }
  if (value.experimentProcedureVersion !== M0D_EXPERIMENT_PROCEDURE_VERSION) {
    addFailure(failures, "wrong-experiment-procedure-version", "manifest.experimentProcedureVersion", `experimentProcedureVersion must be ${M0D_EXPERIMENT_PROCEDURE_VERSION}`);
  }

  for (const field of ["applicationBuildCommit", "mediaPipePackageVersion", "mediaPipeModelVersion", "canonicalModelSource", "canonicalModelHash"] as const) {
    if (!nonEmptyString(value[field])) addFailure(failures, "invalid-required-manifest-field", `manifest.${field}`, "required manifest value must be a non-empty string");
  }

  if (!plainRecord(value.cameraConfiguration)) {
    addFailure(failures, "invalid-camera-configuration", "manifest.cameraConfiguration", "camera configuration must be an object");
  } else {
    validatePositiveFinite(value.cameraConfiguration.widthPx, "manifest.cameraConfiguration.widthPx", failures);
    validatePositiveFinite(value.cameraConfiguration.heightPx, "manifest.cameraConfiguration.heightPx", failures);
    validatePositiveFinite(value.cameraConfiguration.fps, "manifest.cameraConfiguration.fps", failures);
  }

  if (!plainRecord(value.display)) {
    addFailure(failures, "invalid-display-reference", "manifest.display", "display profile/reference must be an object");
  } else {
    if (!nonEmptyString(value.display.profileId)) addFailure(failures, "invalid-display-reference", "manifest.display.profileId", "display profile ID must be a non-empty string");
    if (!nonEmptyString(value.display.reference)) addFailure(failures, "invalid-display-reference", "manifest.display.reference", "display reference must be a non-empty string");
  }

  validateFiniteVec3(value.cameraOriginScreenMm, "manifest.cameraOriginScreenMm", failures);

  for (const field of ["estimatorA", "estimatorB"] as const) {
    const identity = value[field];
    if (!plainRecord(identity)) {
      addFailure(failures, "invalid-estimator-identity", `manifest.${field}`, "estimator identity must be an object");
    } else {
      if (!nonEmptyString(identity.estimatorId)) addFailure(failures, "invalid-estimator-identity", `manifest.${field}.estimatorId`, "estimator ID must be a non-empty string");
      if (!nonEmptyString(identity.configHash)) addFailure(failures, "invalid-estimator-identity", `manifest.${field}.configHash`, "estimator config hash must be a non-empty string");
    }
  }

  if (!finite(value.runStartTimestampMs) || value.runStartTimestampMs < 0) addFailure(failures, "invalid-run-timestamp", "manifest.runStartTimestampMs", "run start timestamp must be finite and non-negative");
  if (!finite(value.runEndTimestampMs) || value.runEndTimestampMs < 0) addFailure(failures, "invalid-run-timestamp", "manifest.runEndTimestampMs", "run end timestamp must be finite and non-negative");
  if (finite(value.runStartTimestampMs) && finite(value.runEndTimestampMs) && value.runEndTimestampMs < value.runStartTimestampMs) addFailure(failures, "invalid-run-timestamp-order", "manifest.runEndTimestampMs", "run end timestamp must not precede run start timestamp");

  return reportedSchemaVersion;
}

function validateObservationTrace(
  values: readonly unknown[],
  failures: M0DEvidenceValidationFailure[],
  label = "observationTrace",
): Set<string> {
  const traceIds = new Set<string>();
  let previousSequence: number | null = null;
  let previousTimestamp: number | null = null;

  values.forEach((value, index) => {
    const path = `${label}[${index}]`;
    if (!plainRecord(value) || !plainRecord(value.observation) || !plainRecord(value.envelope)) {
      addFailure(failures, "malformed-observation-record", path, "observation trace entry must contain plain observation and envelope objects");
      return;
    }
    const observation = value.observation;
    const envelope = value.envelope;
    const observationSequence = observation.sequenceNumber;
    const envelopeSequence = envelope.sequenceNumber;
    const validObservationSequence = typeof observationSequence === "number" && Number.isInteger(observationSequence) && observationSequence >= 0;
    const validEnvelopeSequence = typeof envelopeSequence === "number" && Number.isInteger(envelopeSequence) && envelopeSequence >= 0;
    if (observation.schemaVersion !== M0D_EVIDENCE_SCHEMA_VERSION || envelope.schemaVersion !== M0D_EVIDENCE_SCHEMA_VERSION) {
      addFailure(failures, "unsupported-evidence-schema-version", `${path}.schemaVersion`, `observation and envelope schemaVersion must be ${M0D_EVIDENCE_SCHEMA_VERSION}`);
    }
    if (!validObservationSequence) addFailure(failures, "malformed-sequence-number", `${path}.observation.sequenceNumber`, "sequence number must be a non-negative integer");
    if (!validEnvelopeSequence) addFailure(failures, "malformed-sequence-number", `${path}.envelope.sequenceNumber`, "sequence number must be a non-negative integer");
    if (observationSequence !== envelopeSequence) addFailure(failures, "sequence-number-mismatch", path, "observation and envelope sequence numbers must match");
    if (previousSequence !== null && validObservationSequence && observationSequence <= previousSequence) addFailure(failures, "non-monotonic-sequence-number", `${path}.observation.sequenceNumber`, "observation sequence numbers must increase");
    if (!finite(observation.timestampMs) || observation.timestampMs < 0) addFailure(failures, "non-finite-value", `${path}.observation.timestampMs`, "observation timestamp must be finite and non-negative");
    if (previousTimestamp !== null && finite(observation.timestampMs) && observation.timestampMs < previousTimestamp) addFailure(failures, "non-monotonic-observation-timestamp", `${path}.observation.timestampMs`, "observation timestamps must not decrease");
    if (validObservationSequence) previousSequence = observationSequence;
    if (finite(observation.timestampMs) && observation.timestampMs >= 0) previousTimestamp = observation.timestampMs;

    if (!nonEmptyString(observation.sourceId)) addFailure(failures, "invalid-source-id", `${path}.observation.sourceId`, "source ID must be a non-empty string");
    validatePositiveFinite(observation.frameWidthPx, `${path}.observation.frameWidthPx`, failures);
    validatePositiveFinite(observation.frameHeightPx, `${path}.observation.frameHeightPx`, failures);
    if (observation.trackerConfidence !== null && (!finite(observation.trackerConfidence) || observation.trackerConfidence < 0 || observation.trackerConfidence > 1)) addFailure(failures, "invalid-confidence", `${path}.observation.trackerConfidence`, "tracker confidence must be null or finite from zero through one");
    if (typeof observation.faceDetected !== "boolean") addFailure(failures, "invalid-face-state", `${path}.observation.faceDetected`, "faceDetected must be boolean");
    if (!nonEmptyString(envelope.traceId)) addFailure(failures, "invalid-trace-id", `${path}.envelope.traceId`, "trace ID must be a non-empty string");
    else traceIds.add(envelope.traceId);
    if (!nonEmptyString(envelope.scenarioId)) addFailure(failures, "invalid-envelope-field", `${path}.envelope.scenarioId`, "scenario ID must be a non-empty string");
    if (!nonEmptyString(envelope.segmentId)) addFailure(failures, "invalid-envelope-field", `${path}.envelope.segmentId`, "segment ID must be a non-empty string");
    if (!nonEmptyString(envelope.experimentRunId)) addFailure(failures, "invalid-envelope-field", `${path}.envelope.experimentRunId`, "experiment run ID must be a non-empty string");
    if (!Array.isArray(envelope.configurationIds) || envelope.configurationIds.some((id) => !nonEmptyString(id))) addFailure(failures, "invalid-envelope-field", `${path}.envelope.configurationIds`, "configuration IDs must be an array of non-empty strings");
    if (!Array.isArray(envelope.configurationHashes) || envelope.configurationHashes.some((hash) => !nonEmptyString(hash))) addFailure(failures, "invalid-envelope-field", `${path}.envelope.configurationHashes`, "configuration hashes must be an array of non-empty strings");
    if (!plainRecord(envelope.workerTiming)) addFailure(failures, "invalid-envelope-field", `${path}.envelope.workerTiming`, "worker timing must be an object");
    else {
      for (const field of ["inferenceDurationMs", "completedAtMs"] as const) {
        const timing = envelope.workerTiming[field];
        if (timing !== null && (!finite(timing) || timing < 0)) addFailure(failures, "invalid-timing", `${path}.envelope.workerTiming.${field}`, "timing must be null or finite and non-negative");
      }
    }
    if (!plainRecord(envelope.diagnostics) || !validateJsonValue(envelope.diagnostics, `${path}.envelope.diagnostics`, failures)) addFailure(failures, "invalid-diagnostics", `${path}.envelope.diagnostics`, "diagnostics must be plain JSON data");

    if (observation.faceDetected === false) {
      if (observation.landmarks !== null) addFailure(failures, "invalid-face-shape", `${path}.observation.landmarks`, "no-face observations must have null landmarks");
      if (observation.facialTransformMatrix !== null) addFailure(failures, "invalid-face-shape", `${path}.observation.facialTransformMatrix`, "no-face observations must have a null matrix");
    } else if (observation.faceDetected === true) {
      if (!plainRecord(observation.landmarks)) {
        addFailure(failures, "invalid-landmarks", `${path}.observation.landmarks`, "face-present observations must contain required landmarks");
      } else {
        for (const index of M0D_REQUIRED_LANDMARK_INDICES) {
          const landmark = observation.landmarks[String(index)];
          if (!plainRecord(landmark) || !finite(landmark.x) || !finite(landmark.y) || !finite(landmark.z)) addFailure(failures, "invalid-landmark", `${path}.observation.landmarks.${index}`, "required landmark x/y/z must be finite");
        }
      }
      if (observation.facialTransformMatrix !== null && (!Array.isArray(observation.facialTransformMatrix) || observation.facialTransformMatrix.length !== 16 || observation.facialTransformMatrix.some((entry) => !finite(entry)))) addFailure(failures, "invalid-matrix", `${path}.observation.facialTransformMatrix`, "facial transformation matrix must be null or exactly 16 finite values");
    }
  });
  return traceIds;
}

function validateConfigurationConsistency(
  values: readonly unknown[],
  label: string,
  failures: M0DEvidenceValidationFailure[],
): void {
  let firstIds: string | null = null;
  let firstHashes: string | null = null;
  let firstFrame: string | null = null;
  values.forEach((value, index) => {
    if (!plainRecord(value) || !plainRecord(value.envelope)) return;
    const ids = value.envelope.configurationIds;
    const hashes = value.envelope.configurationHashes;
    if (!Array.isArray(ids) || !Array.isArray(hashes)) return;
    const idsKey = stableM0DJsonStringify(ids);
    const hashesKey = stableM0DJsonStringify(hashes);
    const frameKey = plainRecord(value.observation) && finite(value.observation.frameWidthPx) && finite(value.observation.frameHeightPx) ? stableM0DJsonStringify({ widthPx: value.observation.frameWidthPx, heightPx: value.observation.frameHeightPx }) : null;
    if (firstIds === null) {
      firstIds = idsKey;
      firstHashes = hashesKey;
      firstFrame = frameKey;
    } else if (firstIds !== idsKey || firstHashes !== hashesKey || firstFrame !== frameKey) {
      addFailure(failures, "configuration-change-within-run", `${label}[${index}]`, "configuration IDs, hashes, and frame dimensions must remain constant within an authoritative trace");
    }
  });
}

function validateContext(value: unknown, path: string, failures: M0DEvidenceValidationFailure[]): void {
  if (!plainRecord(value)) addFailure(failures, "missing-required-context", path, "M0D6 evidence requires a plain environment, camera, and configuration object");
  else validateJsonValue(value, path, failures);
}

function validateProceduralRecords(
  values: readonly unknown[] | undefined,
  anomalies: readonly unknown[] | undefined,
  failures: M0DEvidenceValidationFailure[],
): void {
  const invalidationIds = new Set<string>();
  values?.forEach((value, index) => {
    const path = `proceduralInvalidations[${index}]`;
    if (!plainRecord(value) || value.schemaVersion !== 1 || !nonEmptyString(value.invalidationId) || !nonEmptyString(value.experimentRunId) || !nonEmptyString(value.scenarioId) || !nonEmptyString(value.attemptId) || !nonEmptyString(value.reason) || !M0D_PROCEDURAL_INVALIDATION_REASONS.includes(value.reason as typeof M0D_PROCEDURAL_INVALIDATION_REASONS[number]) || !nonEmptyString(value.detail) || getM0DScenario(value.scenarioId as string) === null) {
      addFailure(failures, "invalid-procedural-invalidation", path, "procedural invalidation must use the frozen Section 19 reason set and required identifiers");
    }
    if (plainRecord(value) && nonEmptyString(value.invalidationId)) {
      if (invalidationIds.has(value.invalidationId)) addFailure(failures, "invalid-procedural-invalidation", `${path}.invalidationId`, "invalidation IDs must be unique");
      invalidationIds.add(value.invalidationId);
    }
    if (plainRecord(value) && value.originalAttemptId !== null && value.originalAttemptId !== undefined && (!nonEmptyString(value.originalAttemptId) || value.originalAttemptId === value.attemptId)) addFailure(failures, "invalid-procedural-invalidation", `${path}.originalAttemptId`, "original attempt reference must be null or a distinct non-empty attempt ID");
    if (plainRecord(value) && value.replacementAttemptId !== null && value.replacementAttemptId !== undefined && value.replacementAttemptId === value.attemptId) addFailure(failures, "invalid-procedural-invalidation", `${path}.replacementAttemptId`, "replacement attempt must differ from invalidated attempt");
    if (plainRecord(value) && value.triggersRerun !== undefined) addFailure(failures, "invalid-procedural-invalidation", `${path}.triggersRerun`, "procedural invalidations are records of discard, not automatic rerun commands");
  });
  const anomalyIds = new Set<string>();
  anomalies?.forEach((value, index) => {
    const path = `anomalies[${index}]`;
    if (!plainRecord(value) || value.schemaVersion !== 1 || !nonEmptyString(value.anomalyId) || !nonEmptyString(value.experimentRunId) || !nonEmptyString(value.scenarioId) || !nonEmptyString(value.attemptId) || !nonEmptyString(value.kind) || !nonEmptyString(value.detail) || value.triggersRerun !== false || getM0DScenario(value.scenarioId as string) === null || (value.sequenceNumber !== null && value.sequenceNumber !== undefined && (typeof value.sequenceNumber !== "number" || !Number.isInteger(value.sequenceNumber) || value.sequenceNumber < 0)) || (value.estimatorId !== null && value.estimatorId !== undefined && !nonEmptyString(value.estimatorId))) addFailure(failures, "invalid-anomaly-record", path, "anomalies must be explicit non-rerun records with internally consistent references");
    if (plainRecord(value) && nonEmptyString(value.anomalyId)) {
      if (anomalyIds.has(value.anomalyId)) addFailure(failures, "invalid-anomaly-record", `${path}.anomalyId`, "anomaly IDs must be unique");
      anomalyIds.add(value.anomalyId);
    }
  });
}

function validateReplayOutputs(
  values: readonly unknown[],
  manifest: unknown,
  traceIds: ReadonlySet<string>,
  failures: M0DEvidenceValidationFailure[],
): Set<string> {
  const outputTraceIds = new Set<string>();
  const knownIdentities = new Map<string, string>();
  const outputTimestamps = new Map<string, Set<number>>();
  if (plainRecord(manifest)) {
    for (const field of ["estimatorA", "estimatorB"] as const) {
      const identity = manifest[field];
      if (plainRecord(identity) && nonEmptyString(identity.estimatorId) && nonEmptyString(identity.configHash)) knownIdentities.set(identity.estimatorId, identity.configHash);
    }
  }
  values.forEach((value, index) => {
    const path = `replayOutputs[${index}]`;
    if (!plainRecord(value)) {
      addFailure(failures, "malformed-replay-output", path, "replay output must be a plain object");
      return;
    }
    if (value.schemaVersion !== M0D_EVIDENCE_SCHEMA_VERSION) addFailure(failures, "unsupported-replay-output-schema", `${path}.schemaVersion`, `replay output schemaVersion must be ${M0D_EVIDENCE_SCHEMA_VERSION}`);
    if (!finite(value.timestampMs) || value.timestampMs < 0) addFailure(failures, "non-finite-value", `${path}.timestampMs`, "replay timestamp must be finite and non-negative");
    if (!nonEmptyString(value.observationTraceId)) addFailure(failures, "invalid-trace-id", `${path}.observationTraceId`, "replay output must identify its authoritative observation trace");
    else {
      outputTraceIds.add(value.observationTraceId);
      if (traceIds.size > 0 && !traceIds.has(value.observationTraceId)) addFailure(failures, "unknown-observation-trace", `${path}.observationTraceId`, "replay output references an observation trace not present in the bundle");
    }
    if (!nonEmptyString(value.estimatorId)) addFailure(failures, "invalid-estimator-identity", `${path}.estimatorId`, "estimator ID must be a non-empty string");
    else {
      const timestamps = outputTimestamps.get(value.estimatorId) ?? new Set<number>();
      if (finite(value.timestampMs)) timestamps.add(value.timestampMs);
      outputTimestamps.set(value.estimatorId, timestamps);
    }
    if (!nonEmptyString(value.estimatorConfigHash)) addFailure(failures, "invalid-estimator-identity", `${path}.estimatorConfigHash`, "estimator config hash must be a non-empty string");
    if (!finite(value.estimatorProcessingMs) || value.estimatorProcessingMs < 0) addFailure(failures, "invalid-timing", `${path}.estimatorProcessingMs`, "estimator processing time must be finite and non-negative");
    if (typeof value.valid !== "boolean") addFailure(failures, "invalid-replay-output", `${path}.valid`, "valid must be boolean");
    if (value.valid === true) {
      if (!validateFiniteVec3(value.positionMm, `${path}.positionMm`, failures)) addFailure(failures, "invalid-valid-output", `${path}.positionMm`, "valid output requires finite positionMm");
      if (value.invalidReason !== null) addFailure(failures, "invalid-valid-output", `${path}.invalidReason`, "valid output must have null invalidReason");
    } else if (value.valid === false) {
      if (value.positionMm !== null) addFailure(failures, "invalid-invalid-output", `${path}.positionMm`, "invalid output must not claim a position");
      if (!nonEmptyString(value.invalidReason)) addFailure(failures, "invalid-invalid-output", `${path}.invalidReason`, "invalid output requires a non-empty invalidReason");
    }
    if (nonEmptyString(value.estimatorId) && nonEmptyString(value.estimatorConfigHash)) {
      const expectedHash = knownIdentities.get(value.estimatorId);
      if (expectedHash === undefined) addFailure(failures, "unknown-estimator-identity", `${path}.estimatorId`, "replay output estimator ID is not present in the manifest");
      else if (expectedHash !== value.estimatorConfigHash) addFailure(failures, "estimator-config-mismatch", `${path}.estimatorConfigHash`, "replay output config hash does not match the manifest identity");
    }
  });
  const timestampSets = [...outputTimestamps.values()].map((timestamps) => stableM0DJsonStringify([...timestamps].sort((left, right) => left - right)));
  if (timestampSets.length >= 2 && timestampSets.some((value) => value !== timestampSets[0])) addFailure(failures, "candidate-observation-set-mismatch", "replayOutputs", "candidate outputs must cover the same replay observation timestamps");
  return outputTraceIds;
}

export function validateM0DEvidenceBundle(input: unknown): M0DEvidenceValidationResult {
  const failures: M0DEvidenceValidationFailure[] = [];
  const warnings: M0DEvidenceValidationWarning[] = [];
  const bundle = plainRecord(input) ? input : {};
  const evidenceSchemaVersion = validateManifest(bundle.manifest, failures);
  const observationTrace = bundle.observationTrace;
  const replayOutputs = bundle.replayOutputs;
  const traceIds = observationTrace === undefined
    ? new Set<string>()
    : Array.isArray(observationTrace) ? validateObservationTrace(observationTrace, failures) : (addFailure(failures, "malformed-observation-trace", "observationTrace", "observationTrace must be an array when present"), new Set<string>());
  const outputTraceIds = replayOutputs === undefined
    ? new Set<string>()
    : Array.isArray(replayOutputs) ? validateReplayOutputs(replayOutputs, bundle.manifest, traceIds, failures) : (addFailure(failures, "malformed-replay-outputs", "replayOutputs", "replayOutputs must be an array when present"), new Set<string>());

  const strictM0D6 = bundle.calibrationTrace !== undefined || bundle.requiredScenarioIds !== undefined || bundle.requiredTrialIds !== undefined || bundle.storedMetrics !== undefined || bundle.metricInput !== undefined;
  const filesIncluded = Array.isArray(bundle.filesIncluded) && bundle.filesIncluded.every((file): file is string => typeof file === "string") ? [...bundle.filesIncluded] : [];
  const trialsIncluded = Array.isArray(bundle.trialsIncluded) && bundle.trialsIncluded.every((trial): trial is string => typeof trial === "string") ? [...bundle.trialsIncluded] : [];
  const invalidations = Array.isArray(bundle.proceduralInvalidations) ? bundle.proceduralInvalidations : [];
  const requiredScenarioIds = Array.isArray(bundle.requiredScenarioIds) && bundle.requiredScenarioIds.every((id): id is string => typeof id === "string") ? [...bundle.requiredScenarioIds] : [];
  const requiredTrialIds = Array.isArray(bundle.requiredTrialIds) && bundle.requiredTrialIds.every((id): id is string => typeof id === "string") ? [...bundle.requiredTrialIds] : [];

  if (strictM0D6) {
    validateContext(bundle.environment, "environment", failures);
    validateContext(bundle.camera, "camera", failures);
    validateContext(bundle.configuration, "configuration", failures);
    const requiredFiles = ["manifest.json", "environment.json", "camera.json", "configuration.json", "calibration/observation-trace.jsonl"];
    for (const file of requiredFiles) if (!filesIncluded.includes(file)) addFailure(failures, "missing-required-evidence-file", "filesIncluded", `required M0D6 evidence file is missing: ${file}`);
    if (!Array.isArray(bundle.calibrationTrace)) addFailure(failures, "missing-calibration-trace", "calibrationTrace", "M0D6 requires a calibration observation trace");
    else {
      validateObservationTrace(bundle.calibrationTrace, failures, "calibrationTrace");
      validateConfigurationConsistency(bundle.calibrationTrace, "calibrationTrace", failures);
    }
    if (Array.isArray(observationTrace)) validateConfigurationConsistency(observationTrace, "observationTrace", failures);
    if (Array.isArray(replayOutputs) && replayOutputs.length > 0) {
      const outputEstimatorIds = new Set(replayOutputs.filter(plainRecord).map((output) => output.estimatorId).filter(nonEmptyString));
      for (const field of ["estimatorA", "estimatorB"] as const) {
        if (plainRecord(bundle.manifest) && plainRecord(bundle.manifest[field]) && nonEmptyString(bundle.manifest[field].estimatorId) && !outputEstimatorIds.has(bundle.manifest[field].estimatorId)) addFailure(failures, "missing-candidate-replay", `replayOutputs.${field}`, "strict M0D6 evidence must contain replay outputs for both manifest candidates");
      }
    }
  }

  validateProceduralRecords(
    Array.isArray(bundle.proceduralInvalidations) ? bundle.proceduralInvalidations : undefined,
    Array.isArray(bundle.anomalies) ? bundle.anomalies : undefined,
    failures,
  );

  if (requiredScenarioIds.length > 0) {
    const presentScenarios = new Set((Array.isArray(observationTrace) ? observationTrace : []).filter(plainRecord).map((entry) => plainRecord(entry.envelope) ? entry.envelope.scenarioId : null).filter(nonEmptyString));
    const invalidatedScenarios = new Set(invalidations.filter(plainRecord).map((entry) => entry.scenarioId).filter(nonEmptyString));
    for (const scenarioId of requiredScenarioIds) {
      if (getM0DScenario(scenarioId) === null) addFailure(failures, "unsupported-scenario", "requiredScenarioIds", `unknown scenario ${scenarioId}`);
      else if (!presentScenarios.has(scenarioId) && !invalidatedScenarios.has(scenarioId)) addFailure(failures, "missing-required-scenario", "observationTrace", `required scenario is absent and not explicitly invalidated: ${scenarioId}`);
    }
  }
  if (requiredTrialIds.length > 0) {
    for (const trialId of requiredTrialIds) if (!trialsIncluded.includes(trialId) && !invalidations.some((value) => plainRecord(value) && value.trialId === trialId)) addFailure(failures, "missing-required-trial", "trialsIncluded", `required trial is absent and not explicitly invalidated: ${trialId}`);
  }

  if (bundle.storedMetrics !== undefined || bundle.metricInput !== undefined) {
    if (bundle.storedMetrics === undefined || bundle.metricInput === undefined) addFailure(failures, "metric-regeneration-unavailable", "storedMetrics", "stored metrics and metric input are both required for deterministic regeneration");
    else {
      try {
        const regenerated = calculateCandidateMetricSummary(bundle.metricInput as M0DCandidateMetricInput);
        if (stableM0DJsonStringify(regenerated) !== stableM0DJsonStringify(bundle.storedMetrics)) addFailure(failures, "metric-regeneration-mismatch", "storedMetrics", "stored metrics do not match deterministic regeneration from the authoritative trace");
      } catch (error) {
        addFailure(failures, "metric-regeneration-failed", "storedMetrics", error instanceof Error ? error.message : "metric regeneration failed");
      }
    }
  }

  if (observationTrace === undefined) addWarning(warnings, "m0d6-completeness-deferred", "observationTrace", "trace completeness and required scenario/trial coverage are deferred to M0D6");
  if (replayOutputs === undefined) addWarning(warnings, "m0d6-completeness-deferred", "replayOutputs", "replay completeness and metric regeneration are deferred to M0D6");
  if (outputTraceIds.size > 1 && replayOutputs !== undefined) {
    const estimatorIds = Array.isArray(replayOutputs)
      ? new Set(replayOutputs.filter(plainRecord).map((output) => output.estimatorId).filter(nonEmptyString))
      : new Set<string>();
    if (estimatorIds.size >= 1) addFailure(failures, "different-authoritative-traces", "replayOutputs", "candidate outputs must reference the same authoritative observation trace");
  }
  if (traceIds.size > 1) addWarning(warnings, "multiple-trace-segments", "observationTrace", "multiple trace IDs are present; M0D6 must validate segment/trial grouping");

  return {
    validatorVersion: M0D_VALIDATOR_VERSION,
    evidenceSchemaVersion,
    checksPerformed: CHECKS_PERFORMED,
    passed: failures.length === 0,
    failures,
    warnings,
    filesIncluded,
    trialsIncluded,
  };
}
