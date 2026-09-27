import { describe, expect, it } from "vitest";
import {
  createM0DObservationRecord,
  deriveZrefCameraMm,
  validateCalibrationReference,
} from "../../src/m0d/evidence/m0dEvidenceContracts";
import { validateM0DEvidenceBundle } from "../../src/m0d/evidence/m0dEvidenceValidator";
import {
  faceWithMatrixObservationTrace,
  faceWithoutMatrixObservationTrace,
  invalidReplayOutput,
  malformedObservationTrace,
  noFaceObservationTrace,
  validManifest,
  validReplayOutput,
} from "../fixtures/m0d/evidenceFixtures";
import { normalizeTrackingObservation, type MediaPipeFaceLandmarkerResultInput } from "../../src/mediapipe/trackingObservationNormalizer";
import { calculateCandidateMetricSummary, type M0DCandidateMetricInput } from "../../src/m0d/metrics/m0dMetrics";

function bundle(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    manifest: validManifest,
    observationTrace: [faceWithMatrixObservationTrace],
    replayOutputs: [
      validReplayOutput,
      { ...validReplayOutput, estimatorId: "estimator-b", estimatorConfigHash: "sha256:estimator-b" },
    ],
    filesIncluded: ["manifest.json", "calibration/observation-trace.jsonl"],
    trialsIncluded: ["neutral-1"],
    ...overrides,
  };
}

describe("M0D evidence contracts", () => {
  it("accepts the supported schema, frozen experiment versions, and shared trace identities", () => {
    const result = validateM0DEvidenceBundle(bundle());
    expect(result).toMatchObject({ validatorVersion: 1, evidenceSchemaVersion: 1, passed: true, failures: [], warnings: [], filesIncluded: ["manifest.json", "calibration/observation-trace.jsonl"] });
  });

  it("rejects unsupported schema and changed frozen experiment versions", () => {
    const result = validateM0DEvidenceBundle(bundle({
      manifest: { ...validManifest, schemaVersion: 2, experimentSpecVersion: "0.5", experimentProcedureVersion: 4 },
    }));
    expect(result.passed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining([
      "unsupported-evidence-schema-version",
      "wrong-experiment-spec-version",
      "wrong-experiment-procedure-version",
    ]));
  });

  it("represents no-face and face-without-matrix observations without conflating them", () => {
    expect(validateM0DEvidenceBundle({ manifest: validManifest, observationTrace: [noFaceObservationTrace] }).passed).toBe(true);
    expect(validateM0DEvidenceBundle({ manifest: validManifest, observationTrace: [faceWithoutMatrixObservationTrace] }).passed).toBe(true);
    expect(noFaceObservationTrace.observation.faceDetected).toBe(false);
    expect(noFaceObservationTrace.observation.landmarks).toBeNull();
    expect(faceWithoutMatrixObservationTrace.observation.faceDetected).toBe(true);
    expect(faceWithoutMatrixObservationTrace.observation.landmarks).not.toBeNull();
    expect(faceWithoutMatrixObservationTrace.observation.facialTransformMatrix).toBeNull();
  });

  it("rejects non-finite required observation data with deterministic errors", () => {
    const result = validateM0DEvidenceBundle({ manifest: validManifest, observationTrace: [malformedObservationTrace] });
    expect(result.passed).toBe(false);
    expect(result.failures).toContainEqual(expect.objectContaining({ code: "invalid-landmark", path: "observationTrace[0].observation.landmarks.33" }));
  });

  it("rejects malformed sequence numbers and decreasing timestamps", () => {
    const first = faceWithMatrixObservationTrace;
    const second = {
      observation: { ...first.observation, sequenceNumber: 0, timestampMs: 999 },
      envelope: { ...first.envelope, sequenceNumber: 0 },
    };
    const result = validateM0DEvidenceBundle({ manifest: validManifest, observationTrace: [first, second] });
    expect(result.passed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining(["non-monotonic-sequence-number", "non-monotonic-observation-timestamp"]));
  });

  it("enforces replay-output validity coherence and manifest identity", () => {
    const missingPosition = { ...validReplayOutput, positionMm: null };
    const missingReason = { ...invalidReplayOutput, invalidReason: null };
    const mismatchedConfig = { ...validReplayOutput, estimatorConfigHash: "sha256:wrong" };
    const result = validateM0DEvidenceBundle(bundle({ replayOutputs: [missingPosition, missingReason, mismatchedConfig] }));
    expect(result.passed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining(["invalid-valid-output", "invalid-invalid-output", "estimator-config-mismatch"]));
  });

  it("rejects unsupported replay schema and non-finite camera configuration", () => {
    const result = validateM0DEvidenceBundle(bundle({
      manifest: { ...validManifest, cameraConfiguration: { widthPx: Number.NaN, heightPx: 360, fps: 24 } },
      replayOutputs: [{ ...validReplayOutput, schemaVersion: 2 }],
    }));
    expect(result.passed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining(["invalid-positive-number", "unsupported-replay-output-schema"]));
  });

  it("derives and validates positive camera-relative calibration depth", () => {
    expect(deriveZrefCameraMm(600, { x: 0, y: 120, z: 80 })).toBe(520);
    expect(validateCalibrationReference({ zrefScreenMm: 600, cameraOriginScreenMm: { x: 0, y: 120, z: 80 } })).toEqual({ ok: true, zrefCameraMm: 520 });
    expect(validateCalibrationReference({ zrefScreenMm: 600, cameraOriginScreenMm: { x: 0, y: 120, z: 600 } })).toMatchObject({ ok: false, code: "nonpositive-camera-depth" });
    expect(() => deriveZrefCameraMm(600, { x: Number.POSITIVE_INFINITY, y: 0, z: 0 })).toThrow("cameraOriginScreenMm");
  });

  it("creates a compact serializable core record from normalized TrackingObservation", () => {
    const landmarks = Array.from({ length: 363 }, () => ({ x: 0.1, y: 0.2, z: -0.3 }));
    const input: MediaPipeFaceLandmarkerResultInput = { faceLandmarks: [landmarks], facialTransformationMatrixes: [] };
    const normalized = normalizeTrackingObservation(input, { timestampMs: 1000, sourceId: "fixture-camera", frame: { widthPx: 640, heightPx: 360 }, confidence: 0.9 });
    if (!normalized.ok) throw new Error(normalized.failure.message);
    const record = createM0DObservationRecord(normalized.observation, 4);
    expect(record).toMatchObject({ schemaVersion: 1, sequenceNumber: 4, faceDetected: true, facialTransformMatrix: null });
    expect(Object.keys(record.landmarks ?? {}).sort()).toEqual(["133", "263", "33", "362"]);
    expect(JSON.stringify(record)).not.toContain("undefined");
  });

  it("returns reproducible machine-readable validation without metrics", () => {
    const first = validateM0DEvidenceBundle(bundle());
    const second = validateM0DEvidenceBundle(bundle());
    expect(second).toEqual(first);
    expect(first.checksPerformed).toContain("shared-observation-trace-identity");
    expect(first.warnings).toHaveLength(0);
  });

  it("requires the complete M0D6 context and calibration trace in strict mode", () => {
    const missing = validateM0DEvidenceBundle({ manifest: validManifest, observationTrace: [faceWithMatrixObservationTrace], calibrationTrace: [faceWithMatrixObservationTrace] });
    expect(missing.passed).toBe(false);
    expect(missing.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining(["missing-required-context", "missing-required-evidence-file"]));
    const complete = validateM0DEvidenceBundle({
      manifest: validManifest,
      observationTrace: [faceWithMatrixObservationTrace],
      calibrationTrace: [faceWithMatrixObservationTrace],
      environment: { os: "fixture" },
      camera: { id: "fixture-camera" },
      configuration: { id: "fixture-config" },
      filesIncluded: ["manifest.json", "environment.json", "camera.json", "configuration.json", "calibration/observation-trace.jsonl"],
    });
    expect(complete.passed).toBe(true);
    const missingCandidate = validateM0DEvidenceBundle({
      manifest: validManifest,
      observationTrace: [faceWithMatrixObservationTrace],
      calibrationTrace: [faceWithMatrixObservationTrace],
      replayOutputs: [validReplayOutput],
      environment: {}, camera: {}, configuration: {},
      filesIncluded: ["manifest.json", "environment.json", "camera.json", "configuration.json", "calibration/observation-trace.jsonl"],
    });
    expect(missingCandidate.failures).toContainEqual(expect.objectContaining({ code: "missing-candidate-replay" }));
  });

  it("rejects configuration changes, missing required coverage, and rerun-triggering records", () => {
    const changed = { ...faceWithMatrixObservationTrace, observation: { ...faceWithMatrixObservationTrace.observation, sequenceNumber: 1, timestampMs: 1100 }, envelope: { ...faceWithMatrixObservationTrace.envelope, sequenceNumber: 1, configurationHashes: ["different"] } };
    const result = validateM0DEvidenceBundle({
      manifest: validManifest,
      observationTrace: [faceWithMatrixObservationTrace, changed],
      calibrationTrace: [faceWithMatrixObservationTrace],
      environment: {}, camera: {}, configuration: {},
      filesIncluded: ["manifest.json", "environment.json", "camera.json", "configuration.json", "calibration/observation-trace.jsonl"],
      requiredScenarioIds: ["neutral-stationary"],
      requiredTrialIds: ["neutral-1"],
      trialsIncluded: [],
      proceduralInvalidations: [{ schemaVersion: 1, invalidationId: "inv", experimentRunId: "run", scenarioId: "neutral-stationary", trialId: "neutral-1", attemptId: "attempt", originalAttemptId: null, replacementAttemptId: null, reason: "external-interruption", detail: "stopped", triggersRerun: true }],
    });
    expect(result.passed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining(["configuration-change-within-run", "invalid-procedural-invalidation"]));
  });

  it("detects deterministic metric regeneration mismatch", () => {
    const metricInput: M0DCandidateMetricInput = {
      sourceTimestampsMs: [0, 1000], faceTimestampsMs: [0, 1000], validTimestampsMs: [0, 1000], faceDetectedCount: 2,
      poseSamples: [{ sequenceNumber: 0, timestampMs: 0, positionMm: { x: 0, y: 0, z: 600 }, processingMs: 1 }, { sequenceNumber: 1, timestampMs: 1000, positionMm: { x: 1, y: 0, z: 600 }, processingMs: 1 }],
      calibrationBurden: { manualMeasurementCount: 1, calibrationCaptureCount: 1, calibrationDurationSeconds: 5, candidateCalibrationStepCount: 2, description: "fixture" },
    };
    const result = validateM0DEvidenceBundle({
      manifest: validManifest, calibrationTrace: [faceWithMatrixObservationTrace], observationTrace: [faceWithMatrixObservationTrace],
      replayOutputs: [validReplayOutput, { ...validReplayOutput, estimatorId: "estimator-b", estimatorConfigHash: "sha256:estimator-b" }],
      environment: {}, camera: {}, configuration: { calibrationBurden: { manualMeasurementCount: 1, calibrationCaptureCount: 1, calibrationDurationSeconds: 5, candidateCalibrationStepCount: 2, description: "fixture" } }, filesIncluded: ["manifest.json", "environment.json", "camera.json", "configuration.json", "calibration/observation-trace.jsonl"],
      metricInput, storedMetrics: { estimatorA: calculateCandidateMetricSummary(metricInput), estimatorB: calculateCandidateMetricSummary(metricInput) },
    });
    expect(result.passed).toBe(false);
    expect(result.failures).toContainEqual(expect.objectContaining({ code: "metric-regeneration-mismatch" }));
  });
});
