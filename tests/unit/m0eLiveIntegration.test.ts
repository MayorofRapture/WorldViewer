import { PerspectiveCamera, Scene } from "three";
import { describe, expect, it } from "vitest";
import { createScreenGeometry } from "../../src/engine/geometry/screenGeometry";
import { applyOffAxisProjectionToCamera } from "../../src/engine/projection/cameraProjection";
import { applyPerspectiveStrength } from "../../src/engine/projection/perspectiveStrength";
import { ViewerStateController } from "../../src/engine/viewer/ViewerStateController";
import type { MonotonicClock } from "../../src/engine/viewer/contracts";
import { REFERENCE_TEST_ONE_EURO_CONFIGURATION } from "../../src/engine/filter/poseFilter";
import { LivePoseProcessingPipeline } from "../../src/m0e/livePoseProcessingPipeline";
import { LiveViewerPoseSource } from "../../src/m0e/liveViewerPoseSource";
import type { TrackingObservation } from "../../src/mediapipe/trackingObservationNormalizer";
import type { TrackingSource } from "../../src/mediapipe/mediapipeTrackingSource";
import { createDefaultCalibrationProfile, type CalibrationProfile } from "../../src/shared/contracts/calibration";
import type { TrackingHealth } from "../../src/shared/contracts/viewer";
import { createDiagnosticWorldHost } from "../../src/world-host/development/diagnosticBootstrap";
import { estimatorAObservation, affineMatrix } from "../fixtures/m0d/estimatorFixtures";

class ManualClock implements MonotonicClock {
  private valueMs = 0;

  nowMs(): number { return this.valueMs; }

  advanceMs(deltaMs: number): void { this.valueMs += deltaMs; }
}

class FakeTrackingSource implements TrackingSource {
  readonly id: string;
  readonly kind = "live-camera" as const;
  private readonly listeners = new Set<(observation: TrackingObservation) => void>();
  private health: Readonly<TrackingHealth> = Object.freeze({ status: "acquiring" as const, confidence: null, sinceMonotonicMs: 0 });

  constructor(id: string) { this.id = id; }

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  getHealth(): Readonly<TrackingHealth> { return this.health; }

  subscribe(listener: (observation: TrackingObservation) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setHealth(health: Readonly<TrackingHealth>): void { this.health = Object.freeze(health); }

  emit(observation: TrackingObservation): void {
    for (const listener of this.listeners) listener(observation);
  }
}

function createLiveSource(trackingSource: TrackingSource): LiveViewerPoseSource {
  return new LiveViewerPoseSource({
    trackingSource,
    display: createScreenGeometry(345.4, 194.3),
    camera: {
      cameraId: trackingSource.id,
      positionScreenMm: { x: 0, y: 103.188, z: 0 },
      captureWidthPx: 640,
      captureHeightPx: 360,
      captureFps: 24,
    },
  });
}

function observation(timestampMs: number, translationX = 0): TrackingObservation {
  return estimatorAObservation({ timestampMs, matrix: affineMatrix(translationX) });
}

function profileWithCorrection(): CalibrationProfile {
  const profile = createDefaultCalibrationProfile();
  return Object.freeze({
    ...profile,
    poseCorrection: Object.freeze({
      scale: Object.freeze({ x: 2, y: 1, z: 1 }),
      offsetMm: Object.freeze({ x: 10, y: 0, z: 0 }),
    }),
  });
}

describe("M0E4 live integration", () => {
  it("carries selected Estimator A through calibration, filtering, ViewerState, and the projection/world boundary", async () => {
    const clock = new ManualClock();
    const tracking = new FakeTrackingSource("integration-camera");
    const source = createLiveSource(tracking);
    const controller = new ViewerStateController(clock);
    const pipeline = new LivePoseProcessingPipeline({
      calibrationProfile: createDefaultCalibrationProfile(),
      oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION,
      source,
      controller,
    });
    const scene = new Scene();
    const worldHost = createDiagnosticWorldHost(scene);
    const camera = new PerspectiveCamera();

    await pipeline.start();
    await worldHost.initialize();
    tracking.setHealth({ status: "tracked", confidence: 0.95, sinceMonotonicMs: 0 });
    tracking.emit(observation(100, 5));

    const raw = source.sample(100);
    expect(raw?.estimatorId).toBe("mediapipe-facial-transform-v1");
    expect(pipeline.getLatestFilteredPose()).toMatchObject({ timestampMs: 100, confidence: 1 });
    const tracked = pipeline.updateViewerState()!;
    expect(tracked.tracking.status).toBe("tracked");
    expect(tracked.tracking.confidence).toBe(0.95);
    expect(tracked.trackedPositionMm).toEqual(pipeline.getLatestFilteredPose()!.positionMm);
    expect(tracked).not.toHaveProperty("estimatorId");

    const frame = Object.freeze({ frameNumber: 1, timestampMs: clock.nowMs(), deltaSeconds: 1 / 60, viewer: tracked });
    const projectionEye = applyPerspectiveStrength(frame.viewer.neutralPositionMm, frame.viewer.effectivePositionMm, 1);
    applyOffAxisProjectionToCamera(camera, createScreenGeometry(345.4, 194.3), projectionEye, 50, 5000);
    worldHost.update(frame);
    expect(camera.position.toArray()).toEqual([projectionEye.x, projectionEye.y, projectionEye.z]);
    expect(camera.projectionMatrix.elements.every(Number.isFinite)).toBe(true);

    tracking.emit(estimatorAObservation({ timestampMs: 200, missingMatrix: true }));
    expect(pipeline.updateViewerState()!.tracking).toMatchObject({ status: "degraded", reasonCode: "pose-processing-failed" });
    clock.advanceMs(350);
    expect(pipeline.updateViewerState()!.tracking.status).toBe("lost");
    clock.advanceMs(5000);
    expect(pipeline.updateViewerState()!.tracking.status).toBe("lost");

    tracking.setHealth({ status: "tracked", confidence: 0.9, sinceMonotonicMs: clock.nowMs() });
    tracking.emit(observation(300, 20));
    const reacquired = pipeline.updateViewerState()!;
    expect(reacquired.tracking.status).toBe("tracked");
    expect(reacquired.effectivePositionMm).toEqual({ x: 0, y: 0, z: 600 });
    clock.advanceMs(300);
    expect(pipeline.updateViewerState()!.tracking.status).toBe("tracked");

    await pipeline.dispose();
    await worldHost.dispose();
  });

  it("resets filter history at calibration and source boundaries without retaining old callbacks", async () => {
    const firstTracking = new FakeTrackingSource("first-camera");
    const secondTracking = new FakeTrackingSource("second-camera");
    const firstSource = createLiveSource(firstTracking);
    const secondSource = createLiveSource(secondTracking);
    const pipeline = new LivePoseProcessingPipeline({
      calibrationProfile: createDefaultCalibrationProfile(),
      oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION,
      source: firstSource,
    });

    await pipeline.start();
    firstTracking.setHealth({ status: "tracked", confidence: 0.9, sinceMonotonicMs: 0 });
    firstTracking.emit(observation(100, 1));
    expect(pipeline.getLatestFilteredPose()).not.toBeNull();

    pipeline.replaceCalibrationProfile(profileWithCorrection());
    expect(pipeline.getLatestFilteredPose()).toBeNull();
    firstTracking.emit(observation(200, 2));
    expect(pipeline.getLatestFilteredPose()).toMatchObject({ timestampMs: 200, velocityMmPerSec: { x: 0, y: 0, z: 0 } });

    await pipeline.replaceSource(secondSource);
    expect(pipeline.getLatestFilteredPose()).toBeNull();
    firstTracking.emit(observation(300, 99));
    expect(pipeline.getLatestFilteredPose()).toBeNull();
    secondTracking.setHealth({ status: "tracked", confidence: 0.8, sinceMonotonicMs: 0 });
    secondTracking.emit(observation(50, 3));
    expect(pipeline.getLatestFilteredPose()).toMatchObject({ timestampMs: 50, velocityMmPerSec: { x: 0, y: 0, z: 0 } });

    await pipeline.dispose();
  });
});
