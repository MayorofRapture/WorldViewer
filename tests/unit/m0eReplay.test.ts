import { describe, expect, it } from "vitest";
import { parseSelectedEstimatorReplayJsonl, parseSelectedEstimatorReplayRecords, replayRawViewerPoses, selectedEstimatorIdentity } from "../../src/m0e/replay/recordedReplay";
import { createDefaultCalibrationProfile } from "../../src/shared/contracts/calibration";
import { readFileSync } from "node:fs";
import { reconstructM0ESourceContext } from "../../src/m0e/replay/m0eSourceContext";
import type { M0DObservationTraceRecord } from "../../src/m0d/evidence/m0dEvidenceContracts";

describe("M0E selected-estimator replay", () => {
  it("preserves valid and invalid source rows", () => {
    const identity = selectedEstimatorIdentity();
    const common = { schemaVersion: 1, estimatorId: identity.id, estimatorConfigHash: identity.configHash };
    const records = parseSelectedEstimatorReplayRecords([JSON.stringify({ ...common, timestampMs: 1, observationTraceId: "a", valid: true, positionMm: { x: 0, y: 0, z: 600 } }), JSON.stringify({ ...common, timestampMs: 2, observationTraceId: "b", valid: false, positionMm: null, invalidReason: "missing-facial-transform-matrix" }), JSON.stringify({ ...common, timestampMs: 3, observationTraceId: "c", valid: true, positionMm: { x: 1, y: 0, z: 600 } })].join("\n"));
    expect(records).toHaveLength(3);
    expect(records.filter((record) => record.valid)).toHaveLength(2);
    expect(records[1]).toMatchObject({ valid: false, invalidReason: "missing-facial-transform-matrix" });
  });
  it("accepts only the frozen Estimator A output identity and replays deterministically", () => {
    const identity = selectedEstimatorIdentity();
    const line = JSON.stringify({ schemaVersion: 1, timestampMs: 100, observationTraceId: "trace", estimatorId: identity.id, estimatorConfigHash: identity.configHash, valid: true, positionMm: { x: 1, y: 2, z: 600 } });
    const poses = parseSelectedEstimatorReplayJsonl(`${line}\n${JSON.stringify({ ...JSON.parse(line), timestampMs: 200, positionMm: { x: 2, y: 3, z: 601 } })}`);
    const first = replayRawViewerPoses(poses, createDefaultCalibrationProfile(), { minCutoffHz: 1, beta: 0, dCutoffHz: 1, initialFrequencyHz: 60 });
    const second = replayRawViewerPoses(poses, createDefaultCalibrationProfile(), { minCutoffHz: 1, beta: 0, dCutoffHz: 1, initialFrequencyHz: 60 });
    expect(first.frames).toEqual(second.frames);
  });

  it("rejects another estimator or malformed timestamp order", () => {
    expect(() => parseSelectedEstimatorReplayJsonl(JSON.stringify({ schemaVersion: 1, timestampMs: 100, observationTraceId: "trace", estimatorId: "interocular-scale-v1", estimatorConfigHash: "other", valid: true, positionMm: { x: 1, y: 2, z: 600 } }))).toThrow(/frozen M0D output contract/);
  });

  it("readiness-parses the prescribed M0D replay and reconstructs source windows without executing evidence", () => {
    const root = "evidence/m0d/estimator-experiment-v3/run-1790638307359";
    const replay = parseSelectedEstimatorReplayRecords(readFileSync(`${root}/estimator-a/outputs/replay.jsonl`, "utf8"));
    const trace = readFileSync(`${root}/observations/trace.jsonl`, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as M0DObservationTraceRecord);
    const context = reconstructM0ESourceContext(trace, replay);
    expect(replay).toHaveLength(6101);
    expect(context.validReplayRecords).toHaveLength(6093);
    expect(context.invalidReplayRecords).toHaveLength(8);
    expect(context.stationaryTrials).toHaveLength(5);
    expect(context.transitions.filter((transition) => transition.axis === "x").length).toBeGreaterThan(0);
    expect(context.transitions.filter((transition) => transition.axis === "y").length).toBeGreaterThan(0);
    expect(context.transitions.filter((transition) => transition.axis === "z").length).toBeGreaterThan(0);
  });

  it("derives claim-bearing readiness from the prescribed source and rejects M0D X/Y reuse", () => {
    const root = "evidence/m0d/estimator-experiment-v3/run-1790638307359";
    const replay = parseSelectedEstimatorReplayRecords(readFileSync(`${root}/estimator-a/outputs/replay.jsonl`, "utf8"));
    const trace = readFileSync(`${root}/observations/trace.jsonl`, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as M0DObservationTraceRecord);
    const source = {
      sourceM0DRunId: "run-1790638307359",
      sourceM0DPath: root,
      manifest: { schemaVersion: 1, experimentSpecVersion: "0.4", experimentProcedureVersion: 3, estimatorA: { estimatorId: "mediapipe-facial-transform-v1", configHash: "fnv1a64-825a99daebb20f6c" } },
      validation: { passed: true, validatorVersion: 1 },
    } as const;
    const readiness = reconstructM0ESourceContext(trace, replay, source).readiness!;
    expect(readiness.replayAlignment.status).toBe("verified");
    expect(readiness.calibration.x.status).toBe("not-proven-reusable");
    expect(readiness.calibration.y.status).toBe("not-proven-reusable");
    expect(readiness.calibration.x.issues.map((entry) => entry.code)).toContain("invalid-calibration-target-order");
    expect(readiness.calibration.y.issues.map((entry) => entry.code)).toContain("invalid-calibration-target-order");
    expect(readiness.calibration.z.status).toBe("verified");
    expect(readiness.neutralStationary.status).toBe("not-proven-reusable");
    expect(readiness.motionTransitions.status).toBe("verified");
    expect(readiness.m0dValidation.passed).toBe(true);
  });

  it("rejects a replay row that is no longer aligned to the source observation", () => {
    const identity = selectedEstimatorIdentity();
    const common = { schemaVersion: 1, estimatorId: identity.id, estimatorConfigHash: identity.configHash };
    const trace = [{ observation: { timestampMs: 1 }, envelope: { traceId: "source" } }] as unknown as M0DObservationTraceRecord[];
    const replay = parseSelectedEstimatorReplayRecords(JSON.stringify({ ...common, timestampMs: 2, observationTraceId: "source", valid: true, positionMm: { x: 0, y: 0, z: 600 } }));
    const readiness = reconstructM0ESourceContext(trace, replay, { sourceM0DRunId: "run-1790638307359", sourceM0DPath: "evidence/m0d/estimator-experiment-v3/run-1790638307359", manifest: { schemaVersion: 1, experimentSpecVersion: "0.4", experimentProcedureVersion: 3, estimatorA: { estimatorId: identity.id, configHash: identity.configHash } }, validation: { passed: true, validatorVersion: 1 } }).readiness!;
    expect(readiness.replayAlignment.status).toBe("blocked");
    expect(readiness.replayAlignment.issues.map((entry) => entry.code)).toContain("replay-source-misalignment");
  });
});
