import { describe, expect, it } from "vitest";
import { parseSelectedEstimatorReplayJsonl, parseSelectedEstimatorReplayRecords, replayRawViewerPoses, selectedEstimatorIdentity } from "../../src/m0e/replay/recordedReplay";
import { createDefaultCalibrationProfile } from "../../src/shared/contracts/calibration";
import { readFileSync } from "node:fs";
import { reconstructM0ESourceContext } from "../../src/m0e/replay/m0eSourceContext";
import type { M0DObservationTraceRecord } from "../../src/m0d/evidence/m0dEvidenceContracts";

const readinessSource = {
  sourceM0DRunId: "run-1790638307359",
  sourceM0DPath: "evidence/m0d/estimator-experiment-v3/run-1790638307359",
  manifest: { schemaVersion: 1, experimentSpecVersion: "0.4", experimentProcedureVersion: 3, estimatorA: { estimatorId: "mediapipe-facial-transform-v1", configHash: "fnv1a64-825a99daebb20f6c" } },
  validation: { passed: true, validatorVersion: 1 },
} as const;

function syntheticTrace(rows: Array<{ scenarioId: string; stepKind: "settle" | "capture" | "transition" | "hold"; trialId?: string; cycleId?: string; unitId?: string; segmentId: string; targetMm?: number; targetAxis?: string }>): M0DObservationTraceRecord[] {
  return rows.map((row, index) => ({ observation: { timestampMs: index + 1 }, envelope: { schemaVersion: 1, sequenceNumber: index, traceId: "synthetic", scenarioId: row.scenarioId, segmentId: row.segmentId, unitId: row.unitId, trialId: row.trialId, cycleId: row.cycleId, stepKind: row.stepKind, experimentRunId: "synthetic", configurationIds: [], configurationHashes: [], workerTiming: {}, diagnostics: { targetMm: row.targetMm, targetAxis: row.targetAxis } } } as unknown as M0DObservationTraceRecord));
}

function readinessFor(trace: readonly M0DObservationTraceRecord[]) {
  const replay = parseSelectedEstimatorReplayRecords(trace.map((row) => JSON.stringify({ schemaVersion: 1, timestampMs: row.observation.timestampMs, observationTraceId: row.envelope.traceId, estimatorId: "mediapipe-facial-transform-v1", estimatorConfigHash: "fnv1a64-825a99daebb20f6c", valid: true, positionMm: { x: 0, y: 0, z: 600 } })).join("\n"));
  return reconstructM0ESourceContext(trace, replay, readinessSource).readiness!;
}

function syntheticMovementRows(): Array<{ scenarioId: string; stepKind: "transition" | "hold"; cycleId: string; unitId: string; segmentId: string; targetMm: number; targetAxis: string }> {
  return ([
    ["lateral-movement", "x", -150], ["vertical-movement", "y", -100], ["approach-retreat", "z", 450],
  ] as const).flatMap(([scenarioId, axis, targetMm]) => {
    const unitId = `${scenarioId}-cycle-1-hold-1`;
    return [{ scenarioId, stepKind: "transition" as const, cycleId: `${scenarioId}-cycle-1`, unitId, segmentId: `${unitId}-transition`, targetMm, targetAxis: axis }, { scenarioId, stepKind: "hold" as const, cycleId: `${scenarioId}-cycle-1`, unitId, segmentId: `${unitId}-hold`, targetMm, targetAxis: axis }];
  });
}

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

  it("requires the exact frozen neutral trial identity set", () => {
    const neutral = Array.from({ length: 5 }, (_, index) => ({ scenarioId: "neutral-stationary", stepKind: "capture" as const, trialId: `neutral-stationary-trial-${index + 1}`, segmentId: `neutral-${index}` }));
    expect(readinessFor(syntheticTrace(neutral)).neutralStationary.issues.map((issue) => issue.code)).not.toContain("invalid-neutral-trial-identity");
    for (const replacement of ["wrong-neutral-trial", "near-stationary-trial-1", "far-stationary-trial-1"]) {
      const replaced = neutral.map((row, index) => index === 3 ? { ...row, trialId: replacement } : row);
      expect(readinessFor(syntheticTrace(replaced)).neutralStationary.issues.map((issue) => issue.code)).toContain("invalid-neutral-trial-identity");
    }
    const duplicate = neutral.map((row, index) => index === 4 ? { ...row, trialId: "neutral-stationary-trial-1" } : row);
    expect(readinessFor(syntheticTrace(duplicate)).neutralStationary.issues.map((issue) => issue.code)).toContain("invalid-neutral-trial-identity");
  });

  it("accepts repeated samples for one transition but rejects raw identity conflicts", () => {
    const rows = syntheticMovementRows();
    const repeated = [...rows, { ...rows[0]!, stepKind: "transition" as const, segmentId: rows[0]!.segmentId }];
    expect(readinessFor(syntheticTrace(repeated)).motionTransitions.issues.map((issue) => issue.code)).not.toContain("duplicate-transition-definition");
    const conflictingScenario = [...rows, { ...rows[0]!, stepKind: "transition" as const, scenarioId: "vertical-movement", targetAxis: "y" }];
    expect(readinessFor(syntheticTrace(conflictingScenario)).motionTransitions.issues.map((issue) => issue.code)).toContain("conflicting-transition-identity");
    const conflictingCycle = [...rows, { ...rows[0]!, stepKind: "transition" as const, cycleId: "lateral-movement-cycle-2" }];
    expect(readinessFor(syntheticTrace(conflictingCycle)).motionTransitions.issues.map((issue) => issue.code)).toContain("conflicting-transition-identity");
  });

  it("requires every source hold definition and rejects unsupported extra transitions", () => {
    const rows = syntheticMovementRows();
    const missing = rows.filter((row) => row.segmentId !== "vertical-movement-cycle-1-hold-1-transition");
    expect(readinessFor(syntheticTrace(missing)).motionTransitions.issues.map((issue) => issue.code)).toContain("missing-expected-transition");
    const extra = [...rows, { ...rows[0]!, stepKind: "transition" as const, unitId: "lateral-movement-cycle-1-hold-extra", segmentId: "lateral-movement-cycle-1-hold-extra-transition", targetMm: 150 }];
    expect(readinessFor(syntheticTrace(extra)).motionTransitions.issues.map((issue) => issue.code)).toContain("extra-transition");
  });
});
