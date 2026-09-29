import { describe, expect, it } from "vitest";
import { createScreenGeometry } from "../../src/engine/geometry/screenGeometry";
import { LiveViewerPoseSource } from "../../src/m0e/liveViewerPoseSource";
import type { TrackingObservation } from "../../src/mediapipe/trackingObservationNormalizer";
import type { TrackingSource } from "../../src/mediapipe/mediapipeTrackingSource";
import { affineMatrix, estimatorAObservation } from "../fixtures/m0d/estimatorFixtures";

class FakeTrackingSource implements TrackingSource {
  readonly id = "fake-camera";
  readonly kind = "live-camera" as const;
  private listener: ((observation: TrackingObservation) => void) | undefined;
  starts = 0;
  stops = 0;

  async start(): Promise<void> { this.starts += 1; }
  async stop(): Promise<void> { this.stops += 1; this.listener = undefined; }
  getHealth() { return Object.freeze({ status: "acquiring" as const, confidence: null, sinceMonotonicMs: 0, reasonCode: "test" }); }
  subscribe(listener: (observation: TrackingObservation) => void): () => void {
    this.listener = listener;
    return () => { if (this.listener === listener) this.listener = undefined; };
  }
  emit(observation: TrackingObservation): void { this.listener?.(observation); }
}

function sourceFixture() {
  const tracking = new FakeTrackingSource();
  const source = new LiveViewerPoseSource({
    trackingSource: tracking,
    display: createScreenGeometry(345.4, 194.3),
    camera: { cameraId: "fake-camera", positionScreenMm: { x: 0, y: 103.188, z: 0 }, captureWidthPx: 640, captureHeightPx: 360, captureFps: 24 },
  });
  return { source, tracking };
}

function observation(timestampMs: number, translationZ = -53.46566307544708): TrackingObservation {
  return estimatorAObservation({ timestampMs, matrix: affineMatrix(0, 0, translationZ) });
}

describe("LiveViewerPoseSource", () => {
  it("emits Estimator A RawViewerPose values with estimator output unchanged", async () => {
    const { source, tracking } = sourceFixture();
    const emitted: unknown[] = [];
    source.subscribe((pose) => emitted.push(pose));
    await source.start();
    const input = observation(100);
    tracking.emit(input);
    const pose = source.sample(100);

    expect(emitted).toHaveLength(1);
    expect(pose).toMatchObject({ timestampMs: 100, confidence: 1, estimatorId: "mediapipe-facial-transform-v1" });
    expect(pose?.positionMm).toEqual({ x: 0, y: 136.23634027462495, z: 629.5838309197264 });
  });

  it("does not emit null estimates, duplicate timestamps, or stale observations", async () => {
    const { source, tracking } = sourceFixture();
    const emitted: unknown[] = [];
    source.subscribe((pose) => emitted.push(pose));
    await source.start();
    tracking.emit(observation(100));
    tracking.emit(observation(100, -63.46566307544708));
    tracking.emit(observation(99, -63.46566307544708));
    tracking.emit(estimatorAObservation({ timestampMs: 101, missingMatrix: true }));

    expect(emitted).toHaveLength(1);
    expect(source.sample(101)?.timestampMs).toBe(100);
  });

  it("unsubscribes and starts with clean pose history after restart", async () => {
    const { source, tracking } = sourceFixture();
    await source.start();
    tracking.emit(observation(100));
    await source.stop();
    expect(source.sample(100)).toBeNull();
    tracking.emit(observation(200));
    await source.start();
    expect(source.sample(200)).toBeNull();
    tracking.emit(observation(200));
    expect(source.sample(200)?.timestampMs).toBe(200);
    expect(tracking.starts).toBe(2);
    expect(tracking.stops).toBe(1);
  });
});
