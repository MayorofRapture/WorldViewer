import { describe, expect, it } from "vitest";
import { normalizeTrackingObservation, type MediaPipeFaceLandmarkerResultInput } from "../../src/mediapipe/trackingObservationNormalizer";

const matrix = { rows: 4, columns: 4, data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] };

function landmarks() {
  return Array.from({ length: 363 }, (_, index) => ({ x: index / 1000, y: -index / 1000, z: index / 10000 }));
}

function result(overrides: Partial<MediaPipeFaceLandmarkerResultInput> = {}): MediaPipeFaceLandmarkerResultInput {
  return { faceLandmarks: [landmarks()], facialTransformationMatrixes: [matrix], ...overrides };
}

const metadata = {
  timestampMs: 100,
  sourceId: "mediapipe-camera-0",
  frame: { widthPx: 640, heightPx: 360 },
  confidence: 0.75,
};

describe("normalizeTrackingObservation", () => {
  it("preserves required landmark indices and matrix order in a deep-frozen copy", () => {
    const source = result();
    const normalized = normalizeTrackingObservation(source, metadata);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.observation.face?.normalizedLandmarks[33]).toEqual({ x: 0.033, y: -0.033, z: 0.0033 });
    expect(normalized.observation.face?.normalizedLandmarks[133]).toEqual({ x: 0.133, y: -0.133, z: 0.0133 });
    expect(normalized.observation.face?.normalizedLandmarks[362]).toEqual({ x: 0.362, y: -0.362, z: 0.0362 });
    expect(normalized.observation.face?.facialTransformMatrix).toEqual(matrix.data);
    expect(Object.isFrozen(normalized.observation)).toBe(true);
    expect(Object.isFrozen(normalized.observation.face)).toBe(true);
    expect(Object.isFrozen(normalized.observation.face?.normalizedLandmarks)).toBe(true);
    expect(Object.isFrozen(normalized.observation.face?.facialTransformMatrix)).toBe(true);

    (source.faceLandmarks[0]![33] as { x: number }).x = 999;
    (source.facialTransformationMatrixes[0]!.data as number[])[0] = 999;
    expect(normalized.observation.face?.normalizedLandmarks[33]?.x).toBe(0.033);
    expect(normalized.observation.face?.facialTransformMatrix?.[0]).toBe(1);
  });

  it("normalizes no-face and face-without-matrix observations distinctly", () => {
    const noFace = normalizeTrackingObservation({ faceLandmarks: [], facialTransformationMatrixes: [] }, { ...metadata, confidence: null });
    expect(noFace).toEqual({ ok: true, observation: { timestampMs: 100, sourceId: metadata.sourceId, frame: metadata.frame, confidence: null } });

    const withoutMatrix = normalizeTrackingObservation(result({ facialTransformationMatrixes: [] }), metadata);
    expect(withoutMatrix.ok).toBe(true);
    if (!withoutMatrix.ok) return;
    expect(withoutMatrix.observation.face?.normalizedLandmarks).toHaveLength(363);
    expect(withoutMatrix.observation.face?.facialTransformMatrix).toBeUndefined();
  });

  it("returns structured failures for malformed matrices and non-finite values", () => {
    expect(normalizeTrackingObservation(result({ facialTransformationMatrixes: [{ ...matrix, rows: 3 }] }), metadata)).toMatchObject({ ok: false, failure: { code: "invalid-matrix-dimensions" } });
    expect(normalizeTrackingObservation(result({ facialTransformationMatrixes: [{ ...matrix, data: matrix.data.slice(0, 15) }] }), metadata)).toMatchObject({ ok: false, failure: { code: "invalid-matrix-dimensions" } });
    expect(normalizeTrackingObservation(result({ facialTransformationMatrixes: [{ ...matrix, data: [Number.NaN, ...matrix.data.slice(1)] }] }), metadata)).toMatchObject({ ok: false, failure: { code: "invalid-matrix-values" } });
    const invalidLandmarks = landmarks();
    invalidLandmarks[362]!.x = Number.POSITIVE_INFINITY;
    expect(normalizeTrackingObservation(result({ faceLandmarks: [invalidLandmarks] }), metadata)).toMatchObject({ ok: false, failure: { code: "invalid-landmark-value" } });
  });

  it("returns structured failures for invalid metadata and timestamp order", () => {
    expect(normalizeTrackingObservation(result(), { ...metadata, timestampMs: Number.NaN })).toMatchObject({ ok: false, failure: { code: "invalid-timestamp" } });
    expect(normalizeTrackingObservation(result(), { ...metadata, previousTimestampMs: 101 })).toMatchObject({ ok: false, failure: { code: "non-monotonic-timestamp" } });
    expect(normalizeTrackingObservation(result(), { ...metadata, sourceId: "   " })).toMatchObject({ ok: false, failure: { code: "invalid-source-id" } });
    expect(normalizeTrackingObservation(result(), { ...metadata, frame: { widthPx: 0, heightPx: 360 } })).toMatchObject({ ok: false, failure: { code: "invalid-frame-dimensions" } });
    expect(normalizeTrackingObservation(result(), { ...metadata, confidence: 1.1 })).toMatchObject({ ok: false, failure: { code: "invalid-confidence" } });
  });

  it("rejects matrix data without a face and multiple face/matrix records", () => {
    expect(normalizeTrackingObservation({ faceLandmarks: [], facialTransformationMatrixes: [matrix] }, { ...metadata, confidence: null })).toMatchObject({ ok: false, failure: { code: "invalid-face-result" } });
    expect(normalizeTrackingObservation({ faceLandmarks: [landmarks(), landmarks()], facialTransformationMatrixes: [] }, metadata)).toMatchObject({ ok: false, failure: { code: "invalid-face-result" } });
    expect(normalizeTrackingObservation({ faceLandmarks: [landmarks()], facialTransformationMatrixes: [matrix, matrix] }, metadata)).toMatchObject({ ok: false, failure: { code: "invalid-face-result" } });
  });
});
