import { describe, expect, it } from "vitest";
import type { TrackingObservationEvent } from "../../src/mediapipe/mediapipeTrackingSource";
import type { TrackingObservation } from "../../src/mediapipe/trackingObservationNormalizer";
import { M0D7EvidenceRunner, type M0D7EvidenceFile, type M0D7LiveTrackingSource } from "../../src/m0d/runner/m0d7EvidenceRunner";
import { buildM0D7ProcedureSteps } from "../../src/m0d/runner/m0d7Procedure";
import type { MediaPipeProvenance } from "../../src/mediapipe/mediapipeProvenance";

function observation(timestampMs: number): TrackingObservation {
  const landmarks = Array.from({ length: 364 }, () => ({ x: 0.5, y: 0.5, z: -0.1 }));
  return { timestampMs, sourceId: "fake-camera", frame: { widthPx: 640, heightPx: 360 }, confidence: 1, face: { normalizedLandmarks: landmarks, facialTransformMatrix: Array.from({ length: 16 }, (_, index) => index % 5 === 0 ? 1 : 0) } };
}

class FakeSource implements M0D7LiveTrackingSource {
  private listener: ((event: TrackingObservationEvent) => void) | undefined;
  public started = false;
  public stopped = false;
  public async start(): Promise<void> { this.started = true; }
  public async stop(): Promise<void> { this.stopped = true; }
  public subscribeDetailed(listener: (event: TrackingObservationEvent) => void): () => void { this.listener = listener; return () => { this.listener = undefined; }; }
  public getDroppedFrameCount(): number { return 0; }
  public getCameraConfiguration() { return { widthPx: 640, heightPx: 360, frameRate: 24 }; }
  public emit(timestampMs: number): void { this.listener?.({ observation: observation(timestampMs), inferenceDurationMs: 2, completedAtMs: timestampMs + 2 }); }
}

const provenance: MediaPipeProvenance = {
  package: { name: "@mediapipe/tasks-vision", version: "1.0.1" },
  taskAsset: { path: "/mediapipe/face_landmarker.task", sha256: "fixture", verified: true },
  embeddedCanonicalMetadata: { archivePath: "fixture", sha256: "fixture", verified: true },
};

describe("M0D7 evidence runner orchestration", () => {
  it("captures one normalized trace, retains cancellation, and writes the complete layout without claiming a successful experiment", async () => {
    const source = new FakeSource();
    const written: M0D7EvidenceFile[][] = [];
    const runner = new M0D7EvidenceRunner({ source, runId: "run-fixture", cameraOriginScreenMm: { x: 0, y: 103.188, z: 0 }, clock: { now: () => 100 }, provenance: async () => provenance, writer: { write: async (files) => { written.push([...files]); return "fixture-output"; } }, steps: buildM0D7ProcedureSteps().slice(0, 2) });
    await runner.start();
    expect(runner.getState().status).toBe("ready");
    runner.beginProcedure(100);
    source.emit(100);
    const result = await runner.cancel("fixture cancellation");
    expect(source.started).toBe(true);
    expect(source.stopped).toBe(true);
    expect(result.outputRoot).toBe("fixture-output");
    expect(result.validation.passed).toBe(false);
    expect(written).toHaveLength(1);
    expect(written[0]?.map((file) => file.relativePath)).toEqual(expect.arrayContaining(["manifest.json", "calibration/observation-trace.jsonl", "observations/trace.jsonl", "estimator-a/outputs/replay.jsonl", "estimator-b/outputs/replay.jsonl", "validation.json", "m0d8-review.json"]));
    expect(written[0]?.some((file) => file.contents.includes("webcam"))).toBe(false);
  });
});
