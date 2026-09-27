import { describe, expect, it } from "vitest";
import type { TrackingObservation } from "../../src/mediapipe/trackingObservationNormalizer";
import {
  type M0DEvidenceEnvelope,
  type M0DRunManifest,
} from "../../src/m0d/evidence/m0dEvidenceContracts";
import {
  createCandidateConfigurationIdentity,
  evidenceRecordFromObservation,
  reconstructTrackingObservation,
  replayM0DRun,
} from "../../src/m0d/replay/m0dReplay";
import { createSharedEstimatorCalibration } from "../../src/m0d/estimators/calibration";
import { calibrateEstimatorA, mediaPipeFacialTransformEstimator } from "../../src/m0d/estimators/mediaPipeFacialTransformEstimator";
import { calibrateEstimatorB, interocularScaleEstimator } from "../../src/m0d/estimators/interocularScaleEstimator";
import { estimatorAObservation, estimatorBObservation, affineMatrix, FIXTURE_CAMERA_ORIGIN } from "../fixtures/m0d/estimatorFixtures";
import { faceWithMatrixObservationTrace, faceWithoutMatrixObservationTrace, malformedObservationTrace, noFaceObservationTrace } from "../fixtures/m0d/evidenceFixtures";

function combinedObservation(timestampMs: number): TrackingObservation {
  const a = estimatorAObservation({ timestampMs, matrix: affineMatrix() });
  const b = estimatorBObservation({ timestampMs });
  if (a.face === undefined || b.face === undefined) throw new Error("fixture face missing");
  return Object.freeze({ ...a, face: Object.freeze({ ...a.face, normalizedLandmarks: b.face.normalizedLandmarks }) });
}

function envelope(sequenceNumber: number, traceId: string, scenarioId = "calibration"): M0DEvidenceEnvelope {
  return { schemaVersion: 1, sequenceNumber, traceId, scenarioId, segmentId: "segment-1", experimentRunId: "run-1", configurationIds: ["camera-640x360-24hz"], configurationHashes: ["config-hash-1"], workerTiming: { inferenceDurationMs: 2, completedAtMs: 1002 + sequenceNumber }, diagnostics: {} };
}

function replayInput() {
  const calibrationObservations = [combinedObservation(1000), combinedObservation(1100)];
  const calibrationRecords = calibrationObservations.map((observation, index) => evidenceRecordFromObservation(observation, envelope(index, "calibration-trace")));
  const shared = createSharedEstimatorCalibration(FIXTURE_CAMERA_ORIGIN);
  if (!shared.ok) throw new Error(shared.message);
  const calibrationA = calibrateEstimatorA(calibrationObservations, shared.calibration);
  const calibrationB = calibrateEstimatorB(calibrationObservations, shared.calibration);
  if (!calibrationA.ok || !calibrationB.ok) throw new Error("fixture calibration failed");
  const candidateA = createCandidateConfigurationIdentity(mediaPipeFacialTransformEstimator.id, mediaPipeFacialTransformEstimator.version, calibrationA.calibration);
  const candidateB = createCandidateConfigurationIdentity(interocularScaleEstimator.id, interocularScaleEstimator.version, calibrationB.calibration);
  const manifest: M0DRunManifest = {
    schemaVersion: 1,
    experimentSpecVersion: "0.4",
    experimentProcedureVersion: 3,
    applicationBuildCommit: "fixture-commit",
    mediaPipePackageVersion: "1.0.1",
    mediaPipeModelVersion: "face-landmarker-fixture",
    canonicalModelSource: "evidence/m0d/estimator-experiment-v3/canonical-face-model.json",
    canonicalModelHash: "sha256:canonical",
    cameraConfiguration: { widthPx: 640, heightPx: 360, fps: 24 },
    display: { profileId: "display-e590", reference: "fixture" },
    cameraOriginScreenMm: FIXTURE_CAMERA_ORIGIN,
    estimatorA: { estimatorId: candidateA.estimatorId, configHash: candidateA.configHash },
    estimatorB: { estimatorId: candidateB.estimatorId, configHash: candidateB.configHash },
    runStartTimestampMs: 0,
    runEndTimestampMs: 5000,
  };
  const observationRecords = [
    evidenceRecordFromObservation(estimatorAObservation({ timestampMs: 1200, face: false }), { ...envelope(0, "evaluation-trace", "neutral-stationary") }),
    evidenceRecordFromObservation((() => { const observation = combinedObservation(1300); const { facialTransformMatrix: _matrix, ...faceWithoutMatrix } = observation.face!; return Object.freeze({ ...observation, face: Object.freeze(faceWithoutMatrix) }); })(), { ...envelope(1, "evaluation-trace", "neutral-stationary"), sequenceNumber: 1 }),
    evidenceRecordFromObservation(combinedObservation(1400), { ...envelope(2, "evaluation-trace", "neutral-stationary"), sequenceNumber: 2 }),
  ];
  return {
    manifest,
    calibrationTrace: calibrationRecords,
    observationTrace: observationRecords,
    environment: { os: "fixture" },
    camera: { id: "fixture-camera" },
    configuration: { id: "camera-640x360-24hz" },
    filesIncluded: ["manifest.json", "environment.json", "camera.json", "configuration.json", "calibration/observation-trace.jsonl"],
  };
}

describe("M0D deterministic replay", () => {
  it("reconstructs no-face, face-with-matrix, face-without-matrix, and rejects malformed records", () => {
    expect(reconstructTrackingObservation(noFaceObservationTrace)).toMatchObject({ ok: true });
    expect(reconstructTrackingObservation(noFaceObservationTrace).observation?.face).toBeUndefined();
    expect(reconstructTrackingObservation(faceWithMatrixObservationTrace)).toMatchObject({ ok: true, observation: { face: { facialTransformMatrix: expect.any(Array) } } });
    expect(reconstructTrackingObservation(faceWithoutMatrixObservationTrace)).toMatchObject({ ok: true, observation: { face: { normalizedLandmarks: expect.any(Array) } } });
    expect(reconstructTrackingObservation(faceWithoutMatrixObservationTrace).observation?.face?.facialTransformMatrix).toBeUndefined();
    expect(reconstructTrackingObservation(malformedObservationTrace)).toMatchObject({ ok: false, reason: "invalid-required-landmark" });
  });

  it("derives both formal candidates once and replays the same serialized observation trace", () => {
    const input = replayInput();
    let tick = 0;
    const first = replayM0DRun(input, { now: () => tick++ });
    tick = 0;
    const second = replayM0DRun(input, { now: () => tick++ });
    expect(first.ok).toBe(true);
    expect(first.validation.failures).toEqual([]);
    expect(first.calibration?.candidateA.estimatorId).toBe("mediapipe-facial-transform-v1");
    expect(first.calibration?.candidateB.estimatorId).toBe("interocular-scale-v1");
    expect(first.estimatorAOutputs[0]).toMatchObject({ valid: false, invalidReason: "missing-facial-transform-matrix" });
    expect(first.estimatorBOutputs[1]).toMatchObject({ valid: true });
    expect(first.estimatorAOutputs).toEqual(second.estimatorAOutputs);
    expect(first.estimatorBOutputs).toEqual(second.estimatorBOutputs);
  });

  it("changes configuration identity when the estimator version changes", () => {
    const input = replayInput();
    const calibration = input.manifest.estimatorA;
    expect(calibration.configHash).not.toBe(createCandidateConfigurationIdentity("different-estimator", "v1", (replayM0DRun(input, { now: () => 0 }).calibration!).estimatorA).configHash);
  });
});
