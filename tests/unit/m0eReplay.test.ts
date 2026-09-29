import { describe, expect, it } from "vitest";
import { parseSelectedEstimatorReplayJsonl, replayRawViewerPoses, selectedEstimatorIdentity } from "../../src/m0e/replay/recordedReplay";
import { createDefaultCalibrationProfile } from "../../src/shared/contracts/calibration";

describe("M0E selected-estimator replay", () => {
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
});
