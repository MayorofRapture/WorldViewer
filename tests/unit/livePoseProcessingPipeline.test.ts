import { describe, expect, it } from "vitest";
import { REFERENCE_TEST_ONE_EURO_CONFIGURATION } from "../../src/engine/filter/poseFilter";
import { createDefaultCalibrationProfile, identityCalibrationTransform, type CalibratedViewerPose, type CalibrationProfile, type CalibrationTransformContract } from "../../src/shared/contracts/calibration";
import { LivePoseProcessingPipeline, type LivePoseSource } from "../../src/m0e/livePoseProcessingPipeline";
import type { RawViewerPose } from "../../src/engine/pose/SyntheticViewerPoseSource";
import type { TrackingHealth, ViewerState } from "../../src/shared/contracts/viewer";
import type { ViewerStateControllerContract, ViewerStateControllerInput } from "../../src/engine/viewer/contracts";
import { ViewerStateController } from "../../src/engine/viewer/ViewerStateController";
import type { MonotonicClock } from "../../src/engine/viewer/contracts";

const raw = (timestampMs: number, x: number, confidence = 0.75): RawViewerPose => Object.freeze({
  timestampMs,
  positionMm: Object.freeze({ x, y: 2, z: 600 }),
  confidence,
  estimatorId: "mediapipe-facial-transform-v1",
});

function profileWithCorrection(): CalibrationProfile {
  const profile = createDefaultCalibrationProfile();
  return Object.freeze({
    ...profile,
    poseCorrection: Object.freeze({ scale: Object.freeze({ x: 2, y: 3, z: 4 }), offsetMm: Object.freeze({ x: 10, y: 20, z: 30 }) }),
  });
}

class FakeSource implements LivePoseSource {
  readonly callbacks = new Set<(pose: RawViewerPose | null) => void>();
  starts = 0;
  stops = 0;
  health: TrackingHealth = Object.freeze({ status: "acquiring", confidence: null, sinceMonotonicMs: 0 });
  async start(): Promise<void> { this.starts += 1; }
  async stop(): Promise<void> { this.stops += 1; }
  sample(): RawViewerPose | null { return null; }
  subscribe(listener: (pose: RawViewerPose | null) => void): () => void {
    this.callbacks.add(listener);
    return () => this.callbacks.delete(listener);
  }
  emit(pose: RawViewerPose | null): void { for (const callback of this.callbacks) callback(pose); }
  getHealth(): Readonly<TrackingHealth> { return this.health; }
}

class RecordingController implements ViewerStateControllerContract {
  readonly resets: Readonly<{ x: number; y: number; z: number }>[] = [];
  updates = 0;
  lastInput: Readonly<ViewerStateControllerInput> | undefined;
  reset(neutralPositionMm: { readonly x: number; readonly y: number; readonly z: number }): void { this.resets.push(neutralPositionMm); }
  update(input: Parameters<ViewerStateControllerContract["update"]>[0]): Readonly<ViewerState> {
    this.lastInput = input;
    this.updates += 1;
    return {} as ViewerState;
  }
}

class ManualClock implements MonotonicClock {
  private valueMs = 0;
  nowMs(): number { return this.valueMs; }
  advanceMs(deltaMs: number): void { this.valueMs += deltaMs; }
}

function profileWithNeutral(x: number): CalibrationProfile {
  return Object.freeze({ ...createDefaultCalibrationProfile(), neutralViewerPositionMm: Object.freeze({ x, y: 0, z: 600 }) });
}

describe("LivePoseProcessingPipeline", () => {
  it("applies calibration before filtering and preserves contract fields", () => {
    const order: string[] = [];
    const transform: CalibrationTransformContract = {
      apply(sample, profile): CalibratedViewerPose {
        order.push("calibrate");
        return identityCalibrationTransform.apply(sample, profile);
      },
    };
    const pipeline = new LivePoseProcessingPipeline({ calibrationProfile: profileWithCorrection(), calibrationTransform: transform, oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION });
    const filtered = pipeline.ingest(raw(100, 5, 0.6));

    order.push("read-filtered");
    expect(filtered).toMatchObject({ timestampMs: 100, positionMm: { x: 20, y: 26, z: 2430 }, confidence: 0.6, velocityMmPerSec: { x: 0, y: 0, z: 0 } });
    expect(Object.keys(filtered ?? {})).not.toContain("estimatorId");
    expect(order).toEqual(["calibrate", "read-filtered"]);
  });

  it("caches one filtered result and does not re-filter on repeated reads", () => {
    const pipeline = new LivePoseProcessingPipeline({ calibrationProfile: createDefaultCalibrationProfile(), oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION });
    const first = pipeline.ingest(raw(100, 1));
    const cached = pipeline.getLatestFilteredPose();
    const secondRead = pipeline.getLatestFilteredPose();

    expect(cached).toBe(first);
    expect(secondRead).toBe(first);
  });

  it("ignores duplicate and stale samples without advancing filter state", () => {
    const pipeline = new LivePoseProcessingPipeline({ calibrationProfile: createDefaultCalibrationProfile(), oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION });
    const first = pipeline.ingest(raw(100, 1));
    expect(pipeline.ingest(raw(100, 100))).toBeNull();
    expect(pipeline.ingest(raw(90, 100))).toBeNull();
    const next = pipeline.ingest(raw(200, 3));

    expect(first?.positionMm.x).toBe(1);
    expect(next?.timestampMs).toBe(200);
    expect(next?.velocityMmPerSec.x).toBeCloseTo((next!.positionMm.x - first!.positionMm.x) / 0.1);
  });

  it("rejects a profile whose estimator identity or handoff parameters differ", () => {
    const identityMismatch = { ...createDefaultCalibrationProfile(), estimator: { ...createDefaultCalibrationProfile().estimator, id: "other-estimator" } };
    expect(() => new LivePoseProcessingPipeline({ calibrationProfile: identityMismatch, oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION })).toThrow(/selected Estimator A handoff/);

    const parametersMismatch = { ...createDefaultCalibrationProfile(), estimator: { ...createDefaultCalibrationProfile().estimator, parameters: { ...createDefaultCalibrationProfile().estimator.parameters, scaleA: 2 } } };
    expect(() => new LivePoseProcessingPipeline({ calibrationProfile: parametersMismatch, oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION })).toThrow(/selected Estimator A handoff/);
  });

  it("requires explicit filter configuration rather than supplying a production default", () => {
    const constructor = LivePoseProcessingPipeline as unknown as new (options: { calibrationProfile: CalibrationProfile; oneEuroConfiguration: undefined }) => unknown;
    expect(() => new constructor({ calibrationProfile: createDefaultCalibrationProfile(), oneEuroConfiguration: undefined })).toThrow();
  });

  it("resets pose, filter, and timestamp history across source replacement and ignores late old callbacks", async () => {
    const first = new FakeSource();
    const second = new FakeSource();
    const pipeline = new LivePoseProcessingPipeline({ calibrationProfile: createDefaultCalibrationProfile(), oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION, source: first });
    await pipeline.start();
    first.emit(raw(100, 10));
    expect(pipeline.getLatestFilteredPose()?.positionMm.x).toBe(10);

    await pipeline.replaceSource(second);
    expect(first.stops).toBe(1);
    expect(pipeline.getLatestFilteredPose()).toBeNull();
    first.emit(raw(200, 999));
    expect(pipeline.getLatestFilteredPose()).toBeNull();
    second.emit(raw(50, 2));
    expect(pipeline.getLatestFilteredPose()).toMatchObject({ timestampMs: 50, positionMm: { x: 2 }, velocityMmPerSec: { x: 0 } });
    await pipeline.dispose();
    expect(second.stops).toBe(1);
  });

  it("validates calibration before replacement and resets the controller to the new neutral", () => {
    const controller = new RecordingController();
    const pipeline = new LivePoseProcessingPipeline({ calibrationProfile: profileWithNeutral(0), oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION, controller });
    pipeline.ingest(raw(100, 10));
    const invalid = { ...profileWithNeutral(25), estimator: { ...profileWithNeutral(25).estimator, id: "invalid" } };
    expect(() => pipeline.replaceCalibrationProfile(invalid)).toThrow(/selected Estimator A handoff/);
    expect(pipeline.getCalibrationProfile().neutralViewerPositionMm.x).toBe(0);

    pipeline.replaceCalibrationProfile(profileWithNeutral(25));
    expect(pipeline.getLatestFilteredPose()).toBeNull();
    expect(pipeline.getCalibrationProfile().neutralViewerPositionMm.x).toBe(25);
    expect(controller.resets.at(-1)).toEqual({ x: 25, y: 0, z: 600 });
    const resetCount = controller.resets.length;
    pipeline.replaceCalibrationProfile(profileWithNeutral(25));
    expect(controller.resets).toHaveLength(resetCount);
    expect(pipeline.ingest(raw(10, 3))?.velocityMmPerSec.x).toBe(0);
  });

  it("does not reset on render ticks or ordinary tracking health changes", async () => {
    const source = new FakeSource();
    const controller = new RecordingController();
    const pipeline = new LivePoseProcessingPipeline({ calibrationProfile: createDefaultCalibrationProfile(), oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION, source, controller });
    await pipeline.start();
    const resetCount = controller.resets.length;
    source.emit(raw(100, 1));
    source.health = Object.freeze({ status: "degraded", confidence: 0.4, sinceMonotonicMs: 100 });
    pipeline.updateViewerState();
    source.health = Object.freeze({ status: "lost", confidence: null, sinceMonotonicMs: 200 });
    pipeline.updateViewerState();
    expect(controller.resets).toHaveLength(resetCount);
    expect(controller.updates).toBe(2);
    await pipeline.stop();
  });

  it("supplies coherent health and current pose data to the controller across loss and reacquisition", async () => {
    const clock = new ManualClock();
    const source = new FakeSource();
    const controller = new ViewerStateController(clock);
    const pipeline = new LivePoseProcessingPipeline({
      calibrationProfile: createDefaultCalibrationProfile(),
      oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION,
      source,
      controller,
    });
    await pipeline.start();

    expect(pipeline.updateViewerState()?.tracking.status).toBe("acquiring");

    source.health = Object.freeze({ status: "tracked" as const, confidence: 0.9, sinceMonotonicMs: 0 });
    source.emit(raw(100, 100, 0.8));
    const first = pipeline.updateViewerState()!;
    expect(first.tracking.status).toBe("tracked");
    expect(first.trackedPositionMm?.x).toBe(100);
    expect(first.confidence).toBe(0.8);

    source.emit(raw(200, 110, 0.7));
    const ordinary = pipeline.updateViewerState()!;
    expect(ordinary.tracking.status).toBe("tracked");
    expect(ordinary.trackedPositionMm?.x).toBeGreaterThan(100);
    expect(ordinary.confidence).toBe(0.7);

    source.emit(null);
    const degraded = pipeline.updateViewerState()!;
    expect(degraded.tracking).toMatchObject({ status: "degraded", reasonCode: "pose-processing-failed" });
    expect(degraded.trackedPositionMm).toBeNull();
    expect(degraded.confidence).toBeNull();
    clock.advanceMs(349);
    expect(pipeline.updateViewerState()!.tracking.status).toBe("degraded");
    clock.advanceMs(1);
    const lost = pipeline.updateViewerState()!;
    expect(lost.tracking.status).toBe("lost");
    expect(lost.trackedPositionMm).toBeNull();

    clock.advanceMs(2500);
    const halfwayNeutral = pipeline.updateViewerState()!;
    expect(halfwayNeutral.tracking.status).toBe("lost");
    expect(halfwayNeutral.effectivePositionMm.x).toBeGreaterThan(0);
    clock.advanceMs(2500);
    expect(pipeline.updateViewerState()!.effectivePositionMm).toEqual({ x: 0, y: 0, z: 600 });

    source.health = Object.freeze({ status: "tracked" as const, confidence: 0.6, sinceMonotonicMs: clock.nowMs() });
    source.emit(raw(300, 200, 0.6));
    const reacquiredPose = pipeline.getLatestFilteredPose()!;
    const reacquired = pipeline.updateViewerState()!;
    expect(reacquired.tracking.status).toBe("tracked");
    expect(reacquired.trackedPositionMm).toEqual(reacquiredPose.positionMm);
    expect(reacquired.effectivePositionMm).toEqual({ x: 0, y: 0, z: 600 });
    clock.advanceMs(150);
    const interrupted = pipeline.updateViewerState()!;
    expect(interrupted.effectivePositionMm.x).toBeGreaterThan(0);
    source.health = Object.freeze({ status: "degraded" as const, confidence: 0.2, sinceMonotonicMs: clock.nowMs() });
    source.emit(null);
    const pending = pipeline.updateViewerState()!;
    const preserved = pending.effectivePositionMm;
    clock.advanceMs(350);
    expect(pipeline.updateViewerState()!.tracking.status).toBe("lost");
    source.health = Object.freeze({ status: "tracked" as const, confidence: 0.5, sinceMonotonicMs: clock.nowMs() });
    source.emit(raw(400, 300, 0.5));
    const recovered = pipeline.updateViewerState()!;
    expect(recovered.tracking.status).toBe("tracked");
    expect(recovered.effectivePositionMm).toEqual(preserved);

    await pipeline.dispose();
  });

  it("does not retain a stale filtered pose after a failed new observation and does not re-filter duplicates", async () => {
    const source = new FakeSource();
    const controller = new RecordingController();
    const pipeline = new LivePoseProcessingPipeline({ calibrationProfile: createDefaultCalibrationProfile(), oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION, source, controller });
    await pipeline.start();
    source.health = Object.freeze({ status: "tracked" as const, confidence: 0.8, sinceMonotonicMs: 0 });
    source.emit(raw(100, 10));
    pipeline.updateViewerState();
    expect(controller.lastInput?.tracking.status).toBe("tracked");
    const accepted = pipeline.getLatestFilteredPose();
    source.emit(raw(100, 999));
    pipeline.updateViewerState();
    expect(controller.lastInput?.tracking.status).toBe("tracked");
    expect(pipeline.getLatestFilteredPose()).toBe(accepted);
    source.emit(null);
    expect(pipeline.getLatestFilteredPose()).toBeNull();
    pipeline.updateViewerState();
    expect(controller.lastInput).toMatchObject({ tracking: { status: "degraded", reasonCode: "pose-processing-failed" }, filteredPose: null });
    source.emit(raw(200, 20));
    expect(pipeline.getLatestFilteredPose()?.timestampMs).toBe(200);
    expect(pipeline.getLatestFilteredPose()?.velocityMmPerSec.x).toBeCloseTo((pipeline.getLatestFilteredPose()!.positionMm.x - accepted!.positionMm.x) / 0.1);
    await pipeline.dispose();
  });

  it("restarts with one active listener and deterministic empty history", async () => {
    const source = new FakeSource();
    const pipeline = new LivePoseProcessingPipeline({ calibrationProfile: createDefaultCalibrationProfile(), oneEuroConfiguration: REFERENCE_TEST_ONE_EURO_CONFIGURATION, source });
    await pipeline.start();
    source.emit(raw(100, 4));
    await pipeline.stop();
    expect(pipeline.getLatestFilteredPose()).toBeNull();
    source.emit(raw(200, 400));
    expect(pipeline.getLatestFilteredPose()).toBeNull();
    await pipeline.start();
    source.emit(raw(50, 5));
    expect(pipeline.getLatestFilteredPose()).toMatchObject({ timestampMs: 50, positionMm: { x: 5 }, velocityMmPerSec: { x: 0 } });
    await pipeline.dispose();
    expect(source.callbacks).toHaveLength(0);
  });
});
