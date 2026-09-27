import { describe, expect, it } from "vitest";
import { normalizeWorkerResult } from "../../src/mediapipe/trackingWorkerNormalizer";
import type { MediaPipeFaceLandmarkerResultInput } from "../../src/mediapipe/trackingObservationNormalizer";

const matrix = { rows: 4, columns: 4, data: Array.from({ length: 16 }, (_, index) => index + 1) };
const landmarks = () => Array.from({ length: 363 }, (_, index) => ({ x: index / 1000, y: -index / 1000, z: index / 10000 }));
const metadata = {
  timestampMs: 100,
  sourceId: "mediapipe-camera-0",
  frame: { widthPx: 640, heightPx: 360 },
  confidence: null,
};
const baseResult = (): MediaPipeFaceLandmarkerResultInput => ({ faceLandmarks: [landmarks()], facialTransformationMatrixes: [matrix] });

describe("production tracking worker normalization", () => {
  it("emits only an immutable normalized observation for face plus matrix", () => {
    const source = baseResult();
    const message = normalizeWorkerResult({ result: source, metadata, inferenceDurationMs: 4, completedAtMs: 104 });

    expect(message.kind).toBe("observation");
    if (message.kind !== "observation") return;
    expect(message.observation.face?.normalizedLandmarks).toHaveLength(363);
    expect(message.observation.face?.facialTransformMatrix).toEqual(matrix.data);
    expect(Object.isFrozen(message.observation)).toBe(true);
    expect(Object.isFrozen(message.observation.face)).toBe(true);
    expect(Object.isFrozen(message.observation.face?.normalizedLandmarks)).toBe(true);
    expect(message).not.toHaveProperty("result");
    (source.faceLandmarks[0]![33] as { x: number }).x = 999;
    expect(message.observation.face?.normalizedLandmarks[33]?.x).toBe(0.033);
  });

  it("preserves face-without-matrix and no-face observations", () => {
    const withoutMatrix = normalizeWorkerResult({ result: { faceLandmarks: [landmarks()], facialTransformationMatrixes: [] }, metadata, inferenceDurationMs: 1, completedAtMs: 101 });
    const noFace = normalizeWorkerResult({ result: { faceLandmarks: [], facialTransformationMatrixes: [] }, metadata, inferenceDurationMs: 1, completedAtMs: 101 });

    expect(withoutMatrix.kind).toBe("observation");
    expect(noFace.kind).toBe("observation");
    if (withoutMatrix.kind === "observation" && noFace.kind === "observation") {
      expect(withoutMatrix.observation.face?.facialTransformMatrix).toBeUndefined();
      expect(noFace.observation.face).toBeUndefined();
    }
  });

  it("returns a structured validation error for malformed non-finite MediaPipe output", () => {
    const invalid = baseResult();
    (invalid.faceLandmarks[0]![362] as { x: number }).x = Number.NaN;
    const message = normalizeWorkerResult({ result: invalid, metadata, inferenceDurationMs: 2, completedAtMs: 102 });

    expect(message).toMatchObject({ kind: "error", error: { code: "INVALID_OBSERVATION", recoverable: true, validation: { code: "invalid-landmark-value" } } });
    expect(message).not.toHaveProperty("result");
  });
});
