import { describe, expect, it } from "vitest";
import type { TrackingObservationEvent } from "../../src/mediapipe/mediapipeTrackingSource";
import type { TrackingObservation } from "../../src/mediapipe/trackingObservationNormalizer";
import { M0D7EvidenceRunner, type M0D7EvidenceFile, type M0D7LiveTrackingSource } from "../../src/m0d/runner/m0d7EvidenceRunner";
import { buildM0D7ProcedureSteps } from "../../src/m0d/runner/m0d7Procedure";
import type { MediaPipeProvenance } from "../../src/mediapipe/mediapipeProvenance";
import { estimatorAObservation, estimatorBObservation, affineMatrix } from "../fixtures/m0d/estimatorFixtures";

function observation(timestampMs: number): TrackingObservation {
  const landmarks = Array.from({ length: 364 }, () => ({ x: 0.5, y: 0.5, z: -0.1 }));
  return { timestampMs, sourceId: "fake-camera", frame: { widthPx: 640, heightPx: 360 }, confidence: 1, face: { normalizedLandmarks: landmarks, facialTransformMatrix: Array.from({ length: 16 }, (_, index) => index % 5 === 0 ? 1 : 0) } };
}

class FakeSource implements M0D7LiveTrackingSource {
  private listener: ((event: TrackingObservationEvent) => void) | undefined;
  public started = false;
  public stopped = false;
  public clearConfigurationOnStop = false;
  public cameraConfiguration: { widthPx: number | null; heightPx: number | null; frameRate: number | null } = { widthPx: 640, heightPx: 360, frameRate: 24 };
  public eventObservation: (timestampMs: number) => TrackingObservation = observation;
  public async start(): Promise<void> { this.started = true; }
  public async stop(): Promise<void> { this.stopped = true; if (this.clearConfigurationOnStop) this.cameraConfiguration = { widthPx: null, heightPx: null, frameRate: null }; }
  public subscribeDetailed(listener: (event: TrackingObservationEvent) => void): () => void { this.listener = listener; return () => { this.listener = undefined; }; }
  public getDroppedFrameCount(): number { return 0; }
  public getCameraConfiguration() { return this.cameraConfiguration; }
  public emit(timestampMs: number): void { this.listener?.({ observation: this.eventObservation(timestampMs), inferenceDurationMs: 2, completedAtMs: timestampMs + 2 }); }
}

function fixtureObservation(timestampMs: number): TrackingObservation {
  const a = estimatorAObservation({ timestampMs, matrix: affineMatrix() });
  const b = estimatorBObservation({ timestampMs });
  if (a.face === undefined || b.face === undefined) throw new Error("fixture face missing");
  return Object.freeze({ ...a, face: Object.freeze({ ...a.face, normalizedLandmarks: b.face.normalizedLandmarks }) });
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

  it("fails formal validation without a verified negotiated camera configuration and never falls back after source stop", async () => {
    const source = new FakeSource();
    source.cameraConfiguration = { widthPx: null, heightPx: null, frameRate: null };
    source.clearConfigurationOnStop = true;
    const runner = new M0D7EvidenceRunner({ source, runId: "run-camera-unverified", cameraOriginScreenMm: { x: 0, y: 103.188, z: 0 }, clock: { now: () => 0 }, provenance: async () => provenance, writer: { write: async () => "fixture-output" }, steps: buildM0D7ProcedureSteps().slice(0, 1) });
    await runner.start();
    expect(runner.getState().status).toBe("failed");
    const result = await runner.finalize();
    expect(result.validation.passed).toBe(false);
    expect(result.validation.failures).toContainEqual(expect.objectContaining({ code: "unverified-camera-configuration" }));
    expect(result.manifest.cameraConfiguration).toEqual({ widthPx: null, heightPx: null, fps: null });
  });

  it("runs the full deterministic procedure through replay, scenario metrics, structural evidence, and validation", async () => {
    const source = new FakeSource();
    source.eventObservation = fixtureObservation;
    source.clearConfigurationOnStop = true;
    const written: M0D7EvidenceFile[][] = [];
    const runner = new M0D7EvidenceRunner({ source, runId: "run-complete-fixture", cameraOriginScreenMm: { x: 0, y: 103.188, z: 0 }, clock: { now: () => 0 }, provenance: async () => provenance, writer: { write: async (files) => { written.push([...files]); return "fixture-output"; } } });
    await runner.start();
    runner.beginProcedure(0);
    let now = 0;
    let stationaryReplacementDone = false;
    let movementReplacementDone = false;
    while (runner.getState().status === "running") {
      const current = runner.getState().steps[runner.getState().stepIndex];
      if (current === undefined) break;
      if (current.kind === "transition") {
        runner.confirmTargetReached(now + 1);
        source.emit(now + 2);
        if (!movementReplacementDone && current.scenarioId === "lateral-movement" && current.cycleNumber === 1) {
          runner.invalidateCurrentAttempt("external-interruption", "fixture invalidated movement hold");
          now += 3;
          runner.beginReplacementAttempt(now);
          runner.confirmTargetReached(now + 1);
          source.emit(now + 2);
          now += 2_002;
          runner.tick(now);
          movementReplacementDone = true;
          continue;
        }
        now += 2_001;
        runner.tick(now);
      } else {
        source.emit(now + 1);
        if (!stationaryReplacementDone && current.scenarioId === "neutral-stationary" && current.trialNumber === 2 && current.kind === "capture") {
          runner.invalidateCurrentAttempt("external-interruption", "fixture invalidated stationary trial", "capture");
          now += 2;
          runner.beginReplacementAttempt(now);
          now += 2_000;
          runner.tick(now);
          source.emit(now + 1);
          now += 5_000;
          runner.tick(now);
          stationaryReplacementDone = true;
          continue;
        }
        now += current.durationMs ?? 0;
        runner.tick(now);
      }
    }
    const result = await runner.finalize();
    expect(result.validation.passed).toBe(true);
    expect(result.manifest.runEndTimestampMs).toBeGreaterThan(result.manifest.runStartTimestampMs);
    expect(result.manifest.cameraConfiguration).toEqual({ widthPx: 640, heightPx: 360, fps: 24 });
    expect(result.replayCalibration).not.toBeNull();
    expect(result.estimatorAOutputs.length).toBeGreaterThan(0);
    expect(written[0]?.find((file) => file.relativePath === "metrics/scenario-summary.json")?.contents).toContain("lateral-movement");
    const authoritative = JSON.parse(written[0]?.find((file) => file.relativePath === "observations/trace.jsonl")?.contents.split("\n").filter(Boolean).join(",") === undefined ? "[]" : `[${written[0]!.find((file) => file.relativePath === "observations/trace.jsonl")!.contents.split("\n").filter(Boolean).join(",")}]`) as Array<{ envelope: { trialId?: string; attemptId?: string } }>;
    const retained = JSON.parse(`[${written[0]!.find((file) => file.relativePath === "observations/retained-invalid.jsonl")!.contents.split("\n").filter(Boolean).join(",")}]`) as Array<{ envelope: { trialId?: string; attemptId?: string } }>;
    expect(authoritative.some((record) => record.envelope.trialId === "neutral-stationary-trial-1")).toBe(true);
    expect(authoritative.some((record) => record.envelope.trialId === "neutral-stationary-trial-2" && record.envelope.attemptId === "run-complete-fixture-attempt-2")).toBe(true);
    expect(retained.some((record) => record.envelope.trialId === "neutral-stationary-trial-2" && record.envelope.attemptId === "run-complete-fixture-attempt-1")).toBe(true);
    expect(retained.some((record) => record.envelope.attemptId === "run-complete-fixture-attempt-2")).toBe(true);
  });
});
