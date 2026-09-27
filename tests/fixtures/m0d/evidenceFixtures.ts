import type {
  M0DEvidenceEnvelope,
  M0DObservationRecord,
  M0DObservationTraceRecord,
  M0DReplayOutputRecord,
  M0DRunManifest,
} from "../../../src/m0d/evidence/m0dEvidenceContracts";

const requiredLandmarks = Object.freeze({
  "33": Object.freeze({ x: -0.1, y: 0.2, z: -0.3 }),
  "133": Object.freeze({ x: -0.2, y: 0.2, z: -0.3 }),
  "362": Object.freeze({ x: 0.1, y: 0.2, z: -0.3 }),
  "263": Object.freeze({ x: 0.2, y: 0.2, z: -0.3 }),
});

const matrix = Object.freeze(Array.from({ length: 16 }, (_, index) => index === 0 || index === 5 || index === 10 || index === 15 ? 1 : 0));

function observation(overrides: Partial<M0DObservationRecord> = {}): M0DObservationRecord {
  return {
    schemaVersion: 1,
    sequenceNumber: 0,
    timestampMs: 1000,
    sourceId: "fixture-camera",
    frameWidthPx: 640,
    frameHeightPx: 360,
    trackerConfidence: 0.95,
    faceDetected: true,
    landmarks: requiredLandmarks,
    facialTransformMatrix: matrix,
    ...overrides,
  };
}

const envelope: M0DEvidenceEnvelope = {
  schemaVersion: 1,
  sequenceNumber: 0,
  traceId: "trace-fixture-001",
  scenarioId: "neutral",
  segmentId: "calibration",
  experimentRunId: "run-fixture-001",
  configurationIds: ["mediapipe-640x360-24hz"],
  configurationHashes: ["sha256:fixture-config"],
  workerTiming: { inferenceDurationMs: 4.5, completedAtMs: 1004.5 },
  diagnostics: { droppedFrames: 0, source: "synthetic-fixture" },
};

function trace(core: M0DObservationRecord): M0DObservationTraceRecord {
  return { observation: core, envelope: { ...envelope, sequenceNumber: core.sequenceNumber } };
}

export const noFaceObservationTrace = trace(observation({ faceDetected: false, landmarks: null, facialTransformMatrix: null }));
export const faceWithMatrixObservationTrace = trace(observation());
export const faceWithoutMatrixObservationTrace = trace(observation({ facialTransformMatrix: null }));
export const malformedObservationTrace = trace(observation({ landmarks: { ...requiredLandmarks, "33": { x: Number.NaN, y: 0, z: 0 } } }));

export const validReplayOutput: M0DReplayOutputRecord = {
  schemaVersion: 1,
  timestampMs: 1000,
  observationTraceId: "trace-fixture-001",
  estimatorId: "estimator-a",
  estimatorConfigHash: "sha256:estimator-a",
  valid: true,
  positionMm: { x: 0, y: 0, z: 600 },
  invalidReason: null,
  estimatorProcessingMs: 0.25,
};

export const invalidReplayOutput: M0DReplayOutputRecord = {
  schemaVersion: 1,
  timestampMs: 1000,
  observationTraceId: "trace-fixture-001",
  estimatorId: "estimator-a",
  estimatorConfigHash: "sha256:estimator-a",
  valid: false,
  positionMm: null,
  invalidReason: "missing-facial-transform-matrix",
  estimatorProcessingMs: 0.1,
};

export const validManifest: M0DRunManifest = {
  schemaVersion: 1,
  experimentSpecVersion: "0.4",
  experimentProcedureVersion: 3,
  applicationBuildCommit: "fixture-commit",
  mediaPipePackageVersion: "1.0.1",
  mediaPipeModelVersion: "face-landmarker-fixture",
  canonicalModelSource: "fixture-canonical-model",
  canonicalModelHash: "sha256:fixture-canonical-model",
  cameraConfiguration: { widthPx: 640, heightPx: 360, fps: 24 },
  display: { profileId: "fixture-e590", reference: "active-display-center" },
  cameraOriginScreenMm: { x: 0, y: 120, z: 80 },
  estimatorA: { estimatorId: "estimator-a", configHash: "sha256:estimator-a" },
  estimatorB: { estimatorId: "estimator-b", configHash: "sha256:estimator-b" },
  runStartTimestampMs: 0,
  runEndTimestampMs: 5000,
};
