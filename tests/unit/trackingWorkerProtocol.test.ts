import { describe, expect, it } from "vitest";
import {
  isTrackingWorkerToHostMessage,
  TRACKING_WORKER_PROTOCOL_VERSION,
} from "../../src/mediapipe/trackingWorkerProtocol";

describe("tracking worker protocol", () => {
  it("uses a versioned discriminated host/worker message contract", () => {
    expect(TRACKING_WORKER_PROTOCOL_VERSION).toBe(1);
    expect(isTrackingWorkerToHostMessage({ protocolVersion: 1, kind: "ready" })).toBe(true);
    expect(isTrackingWorkerToHostMessage({ protocolVersion: 1, kind: "status", status: "running" })).toBe(true);
    expect(isTrackingWorkerToHostMessage({ protocolVersion: 1, kind: "error", error: { code: "INVALID_OBSERVATION", message: "bad result", recoverable: true } })).toBe(true);
    expect(isTrackingWorkerToHostMessage({ protocolVersion: 2, kind: "ready" })).toBe(false);
    expect(isTrackingWorkerToHostMessage({ protocolVersion: 1, kind: "unknown" })).toBe(false);
  });
});
