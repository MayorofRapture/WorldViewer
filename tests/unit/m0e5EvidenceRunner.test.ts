import { describe, expect, it } from "vitest";
import { createM0DObservationRecord } from "../../src/m0d/evidence/m0dEvidenceContracts";
import { estimatorAObservation } from "../fixtures/m0d/estimatorFixtures";
import { M0E5EvidenceRunner, replaySelectedEstimatorA, type M0E5EvidenceFile, type M0E5LiveTrackingSource } from "../../src/m0e/runner/m0e5EvidenceRunner";
import { buildM0E5ProcedureSteps } from "../../src/m0e/runner/m0e5Procedure";
import type { TrackingObservationEvent } from "../../src/mediapipe/mediapipeTrackingSource";

function envelope(sequenceNumber: number, traceId = "m0e5-test") {
  return { schemaVersion: 1, sequenceNumber, traceId, scenarioId: "lateral-movement", segmentId: "segment-1", unitId: "unit-1", experimentRunId: traceId, configurationIds: ["mediapipe-640x360-24hz"], configurationHashes: ["test"], workerTiming: { inferenceDurationMs: null, completedAtMs: null }, diagnostics: {} } as const;
}

function replayRecord(observation: ReturnType<typeof estimatorAObservation>, sequenceNumber: number) {
  return { observation: createM0DObservationRecord(observation, sequenceNumber), envelope: envelope(sequenceNumber) };
}

class FakeSource implements M0E5LiveTrackingSource {
  public started = 0;
  public stopped = 0;
  private listener: ((event: TrackingObservationEvent) => void) | undefined;
  public constructor(private readonly configuration: { widthPx: number | null; heightPx: number | null; frameRate: number | null }) {}
  public async start(): Promise<void> { this.started += 1; }
  public async stop(): Promise<void> { this.stopped += 1; }
  public subscribeDetailed(listener: (event: TrackingObservationEvent) => void): () => void { this.listener = listener; return () => { this.listener = undefined; }; }
  public getDroppedFrameCount(): number { return 0; }
  public getCameraConfiguration(): Readonly<{ widthPx: number | null; heightPx: number | null; frameRate: number | null }> { return this.configuration; }
  public emit(observation = estimatorAObservation()): void { this.listener?.({ observation, inferenceDurationMs: 1, completedAtMs: observation.timestampMs }); }
}

describe("M0E5 evidence runner", () => {
  it.each([
    [{ widthPx: 639, heightPx: 360, frameRate: 24 }, "width"],
    [{ widthPx: 640, heightPx: 359, frameRate: 24 }, "height"],
    [{ widthPx: 640, heightPx: 360, frameRate: 23 }, "fps"],
    [{ widthPx: null, heightPx: null, frameRate: null }, "unavailable"],
  ])("rejects invalid camera configuration (%s)", async (...args) => {
    const [configuration] = args;
    const source = new FakeSource(configuration);
    const runner = new M0E5EvidenceRunner({ source, runId: "camera-test", writer: { write: async () => "out" } });
    await runner.start();
    expect(runner.getState().status).toBe("failed");
    expect(runner.getState().cameraConfigurationVerified).toBe(false);
    expect(runner.getState().actualCameraConfiguration).toEqual(configuration);
    expect(source.stopped).toBe(1);
  });

  it("accepts 640x360 at 24 FPS and rejects collection before subscribing otherwise", async () => {
    const source = new FakeSource({ widthPx: 640, heightPx: 360, frameRate: 24 });
    const runner = new M0E5EvidenceRunner({ source, runId: "camera-pass", writer: { write: async () => "out" } });
    await runner.start();
    expect(runner.getState().status).toBe("ready");
    expect(runner.getState().cameraConfigurationVerified).toBe(true);
    expect(runner.beginProcedure().status).toBe("running");
  });

  it("emits deterministic selected Estimator A rows for every retained observation", () => {
    const records = [replayRecord(estimatorAObservation({ timestampMs: 1010 }), 0), replayRecord(estimatorAObservation({ timestampMs: 1020, missingMatrix: true }), 1)];
    const first = replaySelectedEstimatorA(records);
    const second = replaySelectedEstimatorA(records);
    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
    expect(first[0]).toMatchObject({ timestampMs: 1010, observationTraceId: "m0e5-test", estimatorId: "mediapipe-facial-transform-v1", estimatorConfigHash: "fnv1a64-825a99daebb20f6c", valid: true });
    expect(first[1]).toMatchObject({ timestampMs: 1020, observationTraceId: "m0e5-test", valid: false });
    expect(first[1]?.invalidReason).toBe("missing-facial-transform-matrix");
  });

  it("excludes invalidated attempts from the authoritative trace and replay", async () => {
    const source = new FakeSource({ widthPx: 640, heightPx: 360, frameRate: 24 });
    let written: readonly M0E5EvidenceFile[] = [];
    const step = buildM0E5ProcedureSteps().find((candidate) => candidate.scenarioId === "lateral-movement" && candidate.kind === "hold")!;
    const runner = new M0E5EvidenceRunner({ source, runId: "retention-test", steps: [step], writer: { write: async (files) => { written = files; return "out"; } } });
    await runner.start();
    runner.beginProcedure(0);
    source.emit(estimatorAObservation({ timestampMs: 1 }));
    runner.invalidateCurrentAttempt("external-interruption", "invalid attempt");
    runner.beginReplacementAttempt(2);
    source.emit(estimatorAObservation({ timestampMs: 3 }));
    await runner.cancel();
    const trace = written.find((file) => file.relativePath === "source/trace.jsonl")?.contents.trim().split("\n").map((line) => JSON.parse(line)) ?? [];
    const replay = written.find((file) => file.relativePath === "estimator-a/outputs/replay.jsonl")?.contents.trim().split("\n").map((line) => JSON.parse(line)) ?? [];
    expect(trace).toHaveLength(1);
    expect(trace[0].observation.timestampMs).toBe(3);
    expect(replay).toHaveLength(1);
    expect(replay[0].timestampMs).toBe(3);
  });
});
