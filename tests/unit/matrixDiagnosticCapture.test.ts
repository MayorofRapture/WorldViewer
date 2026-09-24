import { describe, expect, it } from "vitest";
import {
  acceptMatrixDiagnosticObservation,
  advanceMatrixDiagnosticCapture,
  cancelMatrixDiagnosticCapture,
  createMatrixDiagnosticCapture,
  MATRIX_DIAGNOSTIC_REQUIRED_SAMPLES,
  MATRIX_DIAGNOSTIC_SETTLE_MS,
  startMatrixDiagnosticCapture,
} from "../../src/mediapipe/matrixDiagnosticCapture";

const matrix = [11, 12, 13, 14, 21, 22, 23, 24, 31, 32, 33, 34, 41, 42, 43, 44];

function observation(timestampMs: number, face: "valid" | "missing" | "no-matrix" = "valid") {
  const landmarks = Array.from({ length: 363 }, (_, index) => ({ x: index + 0.1, y: index + 0.2, z: index + 0.3 }));
  return {
    timestampMs,
    frame: { widthPx: 640, heightPx: 360 },
    ...(face === "missing" ? {} : { face: { normalizedLandmarks: landmarks, ...(face === "valid" ? { facialTransformMatrix: matrix } : {}) } }),
    matrixRows: face === "valid" ? 4 : null,
    matrixColumns: face === "valid" ? 4 : null,
  } as const;
}

function capturingState() {
  const started = startMatrixDiagnosticCapture(createMatrixDiagnosticCapture(), 1000, {});
  return advanceMatrixDiagnosticCapture(started, 1000 + MATRIX_DIAGNOSTIC_SETTLE_MS);
}

describe("M0D3B bounded matrix diagnostic capture", () => {
  it("captures exactly three chronological samples and preserves all returned matrix values", () => {
    let state = capturingState();
    for (let index = 0; index < MATRIX_DIAGNOSTIC_REQUIRED_SAMPLES; index += 1) {
      state = acceptMatrixDiagnosticObservation(state, observation(2000 + index)).state;
    }
    expect(state.status).toBe("ready");
    expect(state.phase).toBe("left-asymmetric");
    expect(state.captures[0]?.samples).toHaveLength(3);
    expect(state.captures[0]?.samples[0]?.matrix).toEqual({ rows: 4, columns: 4, data: matrix });
    expect(state.captures[0]?.samples.map((sample) => sample.sequenceNumber)).toEqual([1, 2, 3]);
  });

  it("counts missing faces and matrices without allowing premature success", () => {
    let state = capturingState();
    state = acceptMatrixDiagnosticObservation(state, observation(2000, "missing")).state;
    state = acceptMatrixDiagnosticObservation(state, observation(2001, "no-matrix")).state;
    expect(state.status).toBe("capturing");
    expect(state.missingFaceCount).toBe(1);
    expect(state.missingMatrixCount).toBe(1);
    expect(state.captures).toHaveLength(0);
  });

  it("marks a phase incomplete on timeout and supports explicit cancellation", () => {
    const started = startMatrixDiagnosticCapture(createMatrixDiagnosticCapture(), 1000, {});
    const settled = advanceMatrixDiagnosticCapture(started, 1000 + MATRIX_DIAGNOSTIC_SETTLE_MS);
    const timedOut = advanceMatrixDiagnosticCapture(settled, settled.captureDeadlineMs! + 1);
    expect(timedOut.status).toBe("incomplete");
    expect(cancelMatrixDiagnosticCapture(settled).status).toBe("cancelled");
  });

  it("rejects out-of-order observations without altering the accepted sequence", () => {
    let state = capturingState();
    state = acceptMatrixDiagnosticObservation(state, observation(2000)).state;
    state = acceptMatrixDiagnosticObservation(state, observation(1999)).state;
    expect(state.currentSamples).toHaveLength(1);
    expect(state.invalidObservationCount).toBe(1);
  });
});
