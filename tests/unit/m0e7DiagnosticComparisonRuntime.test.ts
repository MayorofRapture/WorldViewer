import { PerspectiveCamera, Scene } from "three";
import { describe, expect, it, vi } from "vitest";
import type { RawViewerPose } from "../../src/engine/pose/SyntheticViewerPoseSource";
import type { AnimationFrameScheduler } from "../../src/world-host/development/syntheticProjectionRuntime";
import { createScreenGeometry } from "../../src/engine/geometry/screenGeometry";
import { createDefaultCalibrationProfile, identityCalibrationTransform } from "../../src/shared/contracts/calibration";
import { applyCalibrationAndFilter, OneEuroPoseFilter } from "../../src/engine/filter/poseFilter";
import type { TrackingHealth } from "../../src/shared/contracts/viewer";
import type { WorldFrame } from "../../src/world-sdk/index";
import type { LivePoseSource } from "../../src/m0e/livePoseProcessingPipeline";
import { M0E7DiagnosticComparisonRuntime, M0E7_COMPARISON_FAR_MM, M0E7_COMPARISON_NEAR_MM } from "../../src/m0e/perceptual/m0e7DiagnosticComparisonRuntime";
import { createM0E7DevelopmentSession } from "../../src/m0e/perceptual/m0e7PerceptualComparison";
import { runM0E6DevelopmentSweep, M0E6_REQUIRED_NEUTRAL_TRIAL_IDS, type M0E6PreparedSample } from "../../src/m0e/runner/m0e6SweepRunner";

const sample = (timestampMs: number, x: number): M0E6PreparedSample => ({ timestampMs, positionMm: { x, y: 0, z: 600 } });
const stationaryTrials = M0E6_REQUIRED_NEUTRAL_TRIAL_IDS.map((trialId) => ({
  trialId,
  settle: [sample(0, 0), sample(10, 0)],
  capture: Array.from({ length: 20 }, (_, index) => sample(20 + index * 10, index % 2 === 0 ? -1 : 1)),
}));
const transitions = (["x", "y", "z"] as const).map((axis) => ({
  transitionId: `transition-${axis}`,
  axis,
  start: 0,
  final: 100,
  samples: Array.from({ length: 80 }, (_, index) => {
    const value = index < 3 ? 0 : 100;
    return { timestampMs: index * 10, input: value, positionMm: { x: axis === "x" ? value : 0, y: axis === "y" ? value : 0, z: axis === "z" ? value : 0 } };
  }),
}));
const session = createM0E7DevelopmentSession(runM0E6DevelopmentSweep({ authority: "fixture", stationaryTrials, transitions }));

class FakeSource implements LivePoseSource {
  starts = 0;
  stops = 0;
  private readonly listeners = new Set<(pose: RawViewerPose | null) => void>();
  private health: TrackingHealth = { status: "tracked", confidence: 1, sinceMonotonicMs: 0 };

  async start(): Promise<void> { this.starts += 1; }
  async stop(): Promise<void> { this.stops += 1; }
  sample(): RawViewerPose | null { return null; }
  subscribe(listener: (pose: RawViewerPose | null) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  getHealth(): Readonly<TrackingHealth> { return this.health; }
  emit(timestampMs: number, x: number): void {
    const pose: RawViewerPose = { timestampMs, positionMm: { x, y: 0, z: 600 }, confidence: 1, estimatorId: "mediapipe-facial-transform-v1" };
    for (const listener of this.listeners) listener(pose);
  }
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function testScheduler(): { scheduler: AnimationFrameScheduler; callbacks: Map<number, (timestampMs: number) => void>; cancel: ReturnType<typeof vi.fn> } {
  const callbacks = new Map<number, (timestampMs: number) => void>();
  let nextHandle = 1;
  const cancel = vi.fn((handle: number) => callbacks.delete(handle));
  return {
    callbacks,
    cancel,
    scheduler: {
      request: (callback) => { const handle = nextHandle++; callbacks.set(handle, callback); return handle; },
      cancel,
    },
  };
}

function worldHost() {
  const frames: WorldFrame[] = [];
  return {
    frames,
    initialize: vi.fn(async () => undefined),
    update: vi.fn((frame: WorldFrame) => frames.push(frame)),
    dispose: vi.fn(async () => undefined),
    root: new (class {})() as never,
    context: new (class {})() as never,
  };
}

function runtimeFixture(source: FakeSource, scheduler: AnimationFrameScheduler, world: ReturnType<typeof worldHost>, render = vi.fn()) {
  const scene = new Scene();
  return new M0E7DiagnosticComparisonRuntime({
    renderHost: { renderer: { render }, scene, camera: new PerspectiveCamera() },
    session,
    calibrationProfile: createDefaultCalibrationProfile(),
    source,
    screenGeometry: createScreenGeometry(345.4, 194.3),
    scheduler,
    worldHost: world,
  });
}

describe("M0E7A live diagnostic comparison runtime", () => {
  it("resolves neutral aliases, rejects unknown aliases, and keeps the source continuous", async () => {
    const source = new FakeSource();
    const scheduled = testScheduler();
    const world = worldHost();
    const runtime = runtimeFixture(source, scheduled.scheduler, world);
    expect(() => runtime.activateCandidate("Unknown")).toThrow(/unknown M0E7 candidate alias/);
    runtime.activateCandidate("Candidate A");
    await runtime.start();
    const candidate = session.candidateProvenance.find(({ alias }) => alias === "Candidate A")!;
    const expectedFilter = new OneEuroPoseFilter({ minCutoffHz: candidate.configuration.minCutoffHz, beta: candidate.configuration.beta, dCutoffHz: candidate.configuration.dCutoffHz, initialFrequencyHz: 60 });
    const profile = createDefaultCalibrationProfile();
    applyCalibrationAndFilter({ timestampMs: 100, positionMm: { x: 0, y: 0, z: 600 }, confidence: 1, estimatorId: "mediapipe-facial-transform-v1" }, profile, identityCalibrationTransform, expectedFilter);
    const expected = applyCalibrationAndFilter({ timestampMs: 200, positionMm: { x: 100, y: 0, z: 600 }, confidence: 1, estimatorId: "mediapipe-facial-transform-v1" }, profile, identityCalibrationTransform, expectedFilter);
    source.emit(100, 0);
    source.emit(200, 100);
    scheduled.callbacks.values().next().value!(200);
    expect(world.frames[0]?.viewer.trackedPositionMm).toEqual(expected.positionMm);
    runtime.activateCandidate("Candidate B");
    expect(runtime.getActiveCandidateAlias()).toBe("Candidate B");
    expect(source.starts).toBe(1);
    await runtime.dispose();
    await runtime.dispose();
    expect(source.stops).toBe(1);
    expect(scheduled.cancel).toHaveBeenCalledTimes(1);
  });

  it("resets candidate filter and controller history while preserving the real pipeline", async () => {
    const source = new FakeSource();
    const scheduled = testScheduler();
    const world = worldHost();
    const runtime = runtimeFixture(source, scheduled.scheduler, world);
    runtime.activateCandidate("Candidate A");
    await runtime.start();
    source.emit(100, 0);
    source.emit(200, 100);
    runtime.activateCandidate("Candidate B");
    source.emit(300, 100);
    scheduled.callbacks.values().next().value!(300);
    expect(runtime.getActiveCandidateAlias()).toBe("Candidate B");
    expect(world.frames[0]?.viewer.effectivePositionMm).toEqual({ x: 100, y: 0, z: 600 });
    expect(world.frames[0]?.viewer.trackedPositionMm).toEqual({ x: 100, y: 0, z: 600 });
    expect(world.frames[0]?.viewer.velocityMmPerSec).toEqual({ x: 0, y: 0, z: 0 });
    await runtime.dispose();
  });

  it("runs viewer state through projection, diagnostic world, rendering, baseline perspective, and delta clamp", async () => {
    const source = new FakeSource();
    const scheduled = testScheduler();
    const world = worldHost();
    const render = vi.fn();
    const runtime = runtimeFixture(source, scheduled.scheduler, world, render);
    runtime.activateCandidate("Candidate A");
    await runtime.start();
    source.emit(100, 5);
    runtime.step(100);
    runtime.step(10_000);
    const camera = render.mock.calls[1]![1] as PerspectiveCamera;
    expect(world.update).toHaveBeenCalledTimes(2);
    expect(world.frames[1]!.deltaSeconds).toBe(0.1);
    expect(render).toHaveBeenCalledTimes(2);
    expect(world.frames[0]!.viewer.tracking.status).toBe("tracked");
    expect(world.frames[0]!.viewer.effectivePositionMm).toEqual({ x: 5, y: 0, z: 600 });
    expect(camera.position.toArray()).toEqual([5, 0, 600]);
    expect(camera.near).toBe(M0E7_COMPARISON_NEAR_MM);
    expect(camera.far).toBe(M0E7_COMPARISON_FAR_MM);
    expect(camera.projectionMatrix.elements.every(Number.isFinite)).toBe(true);
    expect(camera.projectionMatrix.elements).not.toEqual(new PerspectiveCamera().projectionMatrix.elements);
    await runtime.dispose();
    runtime.step(20_000);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("waits for diagnostic-world initialization before disposing", async () => {
    const source = new FakeSource();
    const scheduled = testScheduler();
    const world = worldHost();
    const initialization = deferred<undefined>();
    world.initialize.mockImplementation(() => initialization.promise);
    const render = vi.fn();
    const runtime = runtimeFixture(source, scheduled.scheduler, world, render);
    runtime.activateCandidate("Candidate A");

    const starting = runtime.start();
    await Promise.resolve();
    expect(world.initialize).toHaveBeenCalledTimes(1);
    const disposing = runtime.dispose();
    let disposalSettled = false;
    void disposing.then(() => { disposalSettled = true; });
    await Promise.resolve();
    expect(disposalSettled).toBe(false);

    initialization.resolve(undefined);
    await Promise.all([starting, disposing]);
    expect(world.dispose).toHaveBeenCalledTimes(1);
    expect(source.starts).toBe(0);
    expect(source.stops).toBe(1);
    expect(scheduled.callbacks.size).toBe(0);
    expect(render).not.toHaveBeenCalled();
  });

  it("shares the terminal cleanup promise across concurrent disposal callers", async () => {
    const source = new FakeSource();
    const scheduled = testScheduler();
    const world = worldHost();
    const initialization = deferred<undefined>();
    world.initialize.mockImplementation(() => initialization.promise);
    const render = vi.fn();
    const runtime = runtimeFixture(source, scheduled.scheduler, world, render);
    runtime.activateCandidate("Candidate A");

    const starting = runtime.start();
    await Promise.resolve();
    expect(world.initialize).toHaveBeenCalledTimes(1);

    const firstDisposal = runtime.dispose();
    const secondDisposal = runtime.dispose();
    expect(secondDisposal).toBe(firstDisposal);
    let firstSettled = false;
    let secondSettled = false;
    void firstDisposal.then(() => { firstSettled = true; });
    void secondDisposal.then(() => { secondSettled = true; });
    await Promise.resolve();
    expect(firstSettled).toBe(false);
    expect(secondSettled).toBe(false);

    initialization.resolve(undefined);
    await Promise.all([starting, firstDisposal, secondDisposal]);
    expect(firstSettled).toBe(true);
    expect(secondSettled).toBe(true);
    expect(world.dispose).toHaveBeenCalledTimes(1);
    expect(source.stops).toBe(1);
    expect(scheduled.callbacks.size).toBe(0);
    expect(render).not.toHaveBeenCalled();
  });

  it("waits for source startup before disposing", async () => {
    const source = new FakeSource();
    const startup = deferred<void>();
    vi.spyOn(source, "start").mockImplementation(async () => {
      source.starts += 1;
      await startup.promise;
    });
    const scheduled = testScheduler();
    const world = worldHost();
    const runtime = runtimeFixture(source, scheduled.scheduler, world);
    runtime.activateCandidate("Candidate A");

    const starting = runtime.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(source.starts).toBe(1);
    const disposing = runtime.dispose();
    startup.resolve();
    await Promise.all([starting, disposing]);
    expect(source.starts).toBe(1);
    expect(source.stops).toBe(1);
    expect(world.dispose).toHaveBeenCalledTimes(1);
    expect(scheduled.callbacks.size).toBe(0);
  });

  it("cleans partially initialized resources when source startup fails", async () => {
    const source = new FakeSource();
    const startupError = new Error("source startup failed");
    vi.spyOn(source, "start").mockRejectedValueOnce(startupError);
    const scheduled = testScheduler();
    const world = worldHost();
    const runtime = runtimeFixture(source, scheduled.scheduler, world);
    runtime.activateCandidate("Candidate A");

    await expect(runtime.start()).rejects.toBe(startupError);
    expect(source.stops).toBe(1);
    expect(world.dispose).toHaveBeenCalledTimes(1);
    expect(scheduled.callbacks.size).toBe(0);
  });

  it("requires explicit activation and makes duplicate start safe", async () => {
    const source = new FakeSource();
    const scheduled = testScheduler();
    const world = worldHost();
    const runtime = runtimeFixture(source, scheduled.scheduler, world);
    await expect(runtime.start()).rejects.toThrow(/activate an M0E7 candidate/);
    runtime.activateCandidate("Candidate A");
    await Promise.all([runtime.start(), runtime.start()]);
    expect(source.starts).toBe(1);
    expect(world.initialize).toHaveBeenCalledTimes(1);
    await runtime.dispose();
  });
});
