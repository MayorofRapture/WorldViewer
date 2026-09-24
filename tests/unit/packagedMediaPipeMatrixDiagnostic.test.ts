import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MATRIX_DIAGNOSTIC_CAMERA_CONFIG } from "../../src/mediapipe/packagedMediaPipeMatrixDiagnostic";
import { MEDIAPIPE_CANONICAL_METADATA_SHA256, MEDIAPIPE_TASK_ASSET_SHA256 } from "../../src/mediapipe/mediapipeProvenance";

const workerSource = readFileSync("src/mediapipe/mediapipeBenchmarkWorker.ts", "utf8");
const diagnosticSource = readFileSync("src/mediapipe/packagedMediaPipeMatrixDiagnostic.ts", "utf8");
const runnerSource = readFileSync("scripts/run-mediapipe-matrix-diagnostic.ps1", "utf8");

describe("M0D3B packaged MediaPipe matrix diagnostic wiring", () => {
  it("uses the existing 640x360 at 24 FPS MediaPipe configuration", () => {
    expect(MATRIX_DIAGNOSTIC_CAMERA_CONFIG).toEqual({ widthPx: 640, heightPx: 360, frameRate: 24 });
  });

  it("keeps diagnostic worker output raw and complete without transpose or interpretation", () => {
    expect(workerSource).toContain('purpose === "matrix-diagnostic"');
    expect(workerSource).toContain("data: [...matrix.data]");
    expect(workerSource).toContain("rows: matrix.rows, columns: matrix.columns");
    expect(workerSource).not.toContain("transpose");
    expect(workerSource).not.toContain("Estimator");
  });

  it("uses the pinned provenance hashes and excludes camera identifiers from the diagnostic output", () => {
    expect(MEDIAPIPE_TASK_ASSET_SHA256).toBe("64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF");
    expect(MEDIAPIPE_CANONICAL_METADATA_SHA256).toBe("BDBCDA96DFCB7DA883DA124AAA2C55DEE49770D934F0FCC71747F8C21BDC75B4");
    expect(diagnosticSource).toContain("inputMirrored: false");
    expect(diagnosticSource).not.toContain("deviceId");
    expect(diagnosticSource).not.toContain("pageUrl");
    expect(diagnosticSource).not.toContain("canvas");
  });

  it("runs visibly in a fresh WebView2 profile and preserves structured failures in a unique output", () => {
    expect(runnerSource).toContain('WORLD_VIEWER_SMOKE_MODE"] = "mediapipe-matrix-diagnostic"');
    expect(runnerSource).toContain("WEBVIEW2_USER_DATA_FOLDER");
    expect(runnerSource).toContain("run-");
    expect(runnerSource).toContain("[guid]::NewGuid");
    expect(runnerSource).toContain("DIAGNOSTIC_TIMEOUT");
    expect(runnerSource).toContain("status = $status");
  });
});
