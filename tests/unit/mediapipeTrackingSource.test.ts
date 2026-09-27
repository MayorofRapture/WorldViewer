import { describe, expect, it } from "vitest";
import { normalizeWorkerResult } from "../../src/mediapipe/trackingWorkerNormalizer";
import { MediaPipeTrackingSource, type TrackingStreamLike, type TrackingVideoLike, type TrackingWorkerLike } from "../../src/mediapipe/mediapipeTrackingSource";
import type { MediaPipeFaceLandmarkerResultInput } from "../../src/mediapipe/trackingObservationNormalizer";
import type { TrackingWorkerHostMessage, TrackingWorkerToHostMessage } from "../../src/mediapipe/trackingWorkerProtocol";

class FakeWorker implements TrackingWorkerLike {
  public onmessage: ((event: MessageEvent<TrackingWorkerToHostMessage>) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  public terminated = false;
  public messages: TrackingWorkerHostMessage[] = [];

  public postMessage(message: TrackingWorkerHostMessage): void {
    this.messages.push(message);
    if (message.kind === "init") this.emit({ protocolVersion: 1, kind: "ready" });
    if (message.kind === "shutdown") this.emit({ protocolVersion: 1, kind: "status", status: "stopped" });
  }

  public terminate(): void { this.terminated = true; }

  public emit(message: TrackingWorkerToHostMessage): void {
    this.onmessage?.({ data: message } as MessageEvent<TrackingWorkerToHostMessage>);
  }
}

class FakeStream implements TrackingStreamLike {
  public stopCount = 0;
  public getTracks(): readonly { stop: () => void }[] { return [{ stop: () => { this.stopCount += 1; } }]; }
}

class FakeVideo implements TrackingVideoLike {
  public muted = false;
  public playsInline = false;
  public autoplay = false;
  public srcObject: unknown = null;
  public videoWidth = 640;
  public videoHeight = 360;
  public removed = false;
  public cancelled = 0;
  public play(): Promise<void> { return Promise.resolve(); }
  public remove(): void { this.removed = true; }
  public requestVideoFrameCallback(): number { return 1; }
  public cancelVideoFrameCallback(): void { this.cancelled += 1; }
}

const landmarks = () => Array.from({ length: 363 }, (_, index) => ({ x: index / 1000, y: -index / 1000, z: index / 10000 }));

describe("MediaPipeTrackingSource", () => {
  it("owns start/stop lifecycle and consumes normalized face-without-matrix observations", async () => {
    const worker = new FakeWorker();
    const stream = new FakeStream();
    const video = new FakeVideo();
    const source = new MediaPipeTrackingSource({
      createWorker: () => worker,
      getUserMedia: async () => stream,
      createVideo: () => video,
      attachVideo: () => undefined,
      nowMs: () => 10,
    });
    const observations: Array<{ face: boolean; matrix: boolean }> = [];
    source.subscribe((observation) => observations.push({ face: observation.face !== undefined, matrix: observation.face?.facialTransformMatrix !== undefined }));

    await source.start();
    await source.start();
    expect(source.getHealth().status).toBe("acquiring");
    expect(worker.messages.filter((message) => message.kind === "init")).toHaveLength(1);

    const result: MediaPipeFaceLandmarkerResultInput = { faceLandmarks: [landmarks()], facialTransformationMatrixes: [] };
    const message = normalizeWorkerResult({
      result,
      metadata: { timestampMs: 12, sourceId: "mediapipe-camera-0", frame: { widthPx: 640, heightPx: 360 }, confidence: null },
      inferenceDurationMs: 3,
      completedAtMs: 15,
    });
    expect(message.kind).toBe("observation");
    if (message.kind === "observation") worker.emit(message);
    expect(observations).toEqual([{ face: true, matrix: false }]);
    expect(source.getHealth().status).toBe("tracked");

    const stale = normalizeWorkerResult({
      result,
      metadata: { timestampMs: 11, sourceId: "mediapipe-camera-0", frame: { widthPx: 640, heightPx: 360 }, confidence: null, previousTimestampMs: 12 },
      inferenceDurationMs: 3,
      completedAtMs: 15,
    });
    expect(stale.kind).toBe("error");
    if (stale.kind === "error") worker.emit(stale);
    expect(source.getHealth().reasonCode).toBe("INVALID_OBSERVATION");

    await source.stop();
    await source.stop();
    expect(stream.stopCount).toBe(1);
    expect(video.cancelled).toBe(1);
    expect(video.removed).toBe(true);
    expect(worker.terminated).toBe(true);
    expect(source.getHealth().status).toBe("unavailable");
  });
});
