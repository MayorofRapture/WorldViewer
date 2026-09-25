import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as {
  app: { security: { csp: string; devCsp: string } };
};
const provenanceSource = readFileSync("src/mediapipe/mediapipeProvenance.ts", "utf8");

describe("packaged MediaPipe provenance CSP", () => {
  it("allows same-origin packaged fetch while retaining the IPC endpoint", () => {
    expect(tauriConfig.app.security.csp).toContain("connect-src 'self' ipc: http://ipc.localhost");
    expect(tauriConfig.app.security.csp).not.toContain("connect-src *");
    expect(tauriConfig.app.security.csp).not.toContain("connect-src 'self' data:");
    expect(tauriConfig.app.security.csp).not.toContain("https://");
    expect(tauriConfig.app.security.csp).toContain("script-src 'self'");
    expect(tauriConfig.app.security.csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it("retains the development endpoints and the pinned provenance fetch path", () => {
    for (const endpoint of ["connect-src 'self'", "ipc:", "http://ipc.localhost", "http://127.0.0.1:1420", "ws://127.0.0.1:1420"]) {
      expect(tauriConfig.app.security.devCsp).toContain(endpoint);
    }
    expect(provenanceSource).toContain('export const MEDIAPIPE_TASK_ASSET_PATH = "/mediapipe/face_landmarker.task";');
    expect(provenanceSource).toContain("fetch(MEDIAPIPE_TASK_ASSET_PATH, { cache: \"no-store\" })");
    expect(provenanceSource.match(/\bfetch\(/g)).toHaveLength(1);
    expect(provenanceSource).toContain("MEDIAPIPE_TASK_ASSET_SHA256");
    expect(provenanceSource).toContain("MEDIAPIPE_CANONICAL_METADATA_SHA256");
  });
});
