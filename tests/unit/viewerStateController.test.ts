import { describe, expect, it } from "vitest";
import type { MonotonicClock, FilteredViewerPose, ViewerStateControllerInput } from "../../src/engine/viewer/contracts";
import {
  LOSS_CONFIRMATION_MS,
  NEUTRAL_RETURN_MS,
  REACQUISITION_MS,
  ViewerStateController,
} from "../../src/engine/viewer/ViewerStateController";
import type { MonotonicMs, Vec3Mm } from "../../src/shared/contracts/primitives";
import type { TrackingHealth, TrackingStatus } from "../../src/shared/contracts/viewer";

class ManualClock implements MonotonicClock {
  private valueMs = 0;

  nowMs(): MonotonicMs {
    return this.valueMs;
  }

  setMs(value: MonotonicMs): void {
    this.valueMs = value;
  }

  advanceMs(deltaMs: number): void {
    this.valueMs += deltaMs;
  }
}

const neutral: Vec3Mm = Object.freeze({ x: 0, y: 0, z: 600 });

function tracking(status: TrackingStatus, clock: ManualClock, confidence: number | null = status === "tracked" ? 1 : null): TrackingHealth {
  return { status, confidence, sinceMonotonicMs: clock.nowMs() };
}

function pose(clock: ManualClock, x = 100, y = 0, z = 600, confidence = 0.8): FilteredViewerPose {
  return {
    timestampMs: clock.nowMs(),
    positionMm: { x, y, z },
    velocityMmPerSec: { x: 10, y: 20, z: 30 },
    confidence,
  };
}

function input(clock: ManualClock, status: TrackingStatus, filteredPose: FilteredViewerPose | null, neutralPositionMm = neutral): ViewerStateControllerInput {
  return { tracking: tracking(status, clock), filteredPose, neutralPositionMm };
}

describe("ViewerStateController", () => {
  it("preserves startup statuses at neutral until reliable tracking exists", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);

    for (const status of ["unavailable", "initializing", "acquiring"] as const) {
      const state = controller.update(input(clock, status, null));
      expect(state.tracking.status).toBe(status);
      expect(state.trackedPositionMm).toBeNull();
      expect(state.effectivePositionMm).toEqual(neutral);
      expect(state.velocityMmPerSec).toEqual({ x: 0, y: 0, z: 0 });
      expect(state.confidence).toBeNull();
    }
  });

  it("accepts the first reliable pose immediately and follows normal tracked updates", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);
    const first = controller.update(input(clock, "tracked", pose(clock, 100, -20, 610, 0.75)));

    expect(first.tracking.status).toBe("tracked");
    expect(first.trackedPositionMm).toEqual({ x: 100, y: -20, z: 610 });
    expect(first.effectivePositionMm).toEqual({ x: 100, y: -20, z: 610 });
    expect(first.velocityMmPerSec).toEqual({ x: 10, y: 20, z: 30 });
    expect(first.confidence).toBe(0.75);

    clock.advanceMs(16);
    const next = controller.update(input(clock, "tracked", pose(clock, 120, -10, 605, 0.9)));
    expect(next.effectivePositionMm).toEqual({ x: 120, y: -10, z: 605 });
    expect(next.velocityMmPerSec).toEqual({ x: 10, y: 20, z: 30 });
    expect(next.confidence).toBe(0.9);
  });

  it("holds position during degraded grace and accepts usable marginal poses", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);
    controller.update(input(clock, "tracked", pose(clock, 100)));
    clock.advanceMs(100);
    const degraded = controller.update(input(clock, "degraded", pose(clock, 80, 5)));

    expect(degraded.tracking.status).toBe("degraded");
    expect(degraded.effectivePositionMm).toEqual({ x: 80, y: 5, z: 600 });
    expect(degraded.trackedPositionMm).toEqual({ x: 80, y: 5, z: 600 });

    clock.advanceMs(100);
    const missing = controller.update(input(clock, "degraded", null));
    expect(missing.effectivePositionMm).toEqual({ x: 80, y: 5, z: 600 });
    expect(missing.trackedPositionMm).toBeNull();
    expect(missing.velocityMmPerSec).toEqual({ x: 0, y: 0, z: 0 });
    expect(missing.confidence).toBeNull();
  });

  it("recovers at 349 ms without entering lost", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);
    controller.update(input(clock, "tracked", pose(clock, 100)));
    controller.update(input(clock, "degraded", null));
    clock.advanceMs(349);
    const recovered = controller.update(input(clock, "tracked", pose(clock, 40)));

    expect(recovered.tracking.status).toBe("tracked");
    expect(recovered.effectivePositionMm.x).toBe(40);
  });

  it("confirms loss at exactly 350 ms without snapping", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);
    controller.update(input(clock, "tracked", pose(clock, 100)));
    controller.update(input(clock, "degraded", null));
    clock.advanceMs(LOSS_CONFIRMATION_MS);
    const lost = controller.update(input(clock, "degraded", null));

    expect(lost.tracking.status).toBe("lost");
    expect(lost.effectivePositionMm).toEqual({ x: 100, y: 0, z: 600 });
    expect(lost.trackedPositionMm).toBeNull();
  });

  it("returns to neutral with smoothstep over exactly five seconds", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);
    controller.update(input(clock, "tracked", pose(clock, 100)));
    controller.update(input(clock, "degraded", null));
    clock.advanceMs(LOSS_CONFIRMATION_MS);
    controller.update(input(clock, "degraded", null));

    clock.advanceMs(2500);
    const midpoint = controller.update(input(clock, "lost", null));
    expect(midpoint.tracking.status).toBe("lost");
    expect(midpoint.effectivePositionMm).toEqual({ x: 50, y: 0, z: 600 });

    clock.advanceMs(NEUTRAL_RETURN_MS - 2500);
    const complete = controller.update(input(clock, "lost", null));
    expect(complete.effectivePositionMm).toEqual(neutral);
    expect(complete.velocityMmPerSec).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("reacquires without a snap and tracks the latest target during the 300 ms blend", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);
    controller.update(input(clock, "tracked", pose(clock, 100)));
    controller.update(input(clock, "lost", null));
    clock.advanceMs(LOSS_CONFIRMATION_MS);
    controller.update(input(clock, "lost", null));
    clock.advanceMs(NEUTRAL_RETURN_MS);
    controller.update(input(clock, "lost", null));

    clock.advanceMs(1);
    const start = controller.update(input(clock, "tracked", pose(clock, 200)));
    expect(start.tracking.status).toBe("tracked");
    expect(start.effectivePositionMm).toEqual(neutral);

    clock.advanceMs(150);
    const midpoint = controller.update(input(clock, "tracked", pose(clock, 300)));
    expect(midpoint.effectivePositionMm.x).toBe(150);
    expect(midpoint.trackedPositionMm?.x).toBe(300);

    clock.advanceMs(REACQUISITION_MS - 150);
    const complete = controller.update(input(clock, "tracked", pose(clock, 300)));
    expect(complete.effectivePositionMm.x).toBe(300);
  });

  it("restarts reacquisition from the current effective pose after interruption", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);
    controller.update(input(clock, "tracked", pose(clock, 0)));
    controller.update(input(clock, "lost", null));
    clock.advanceMs(LOSS_CONFIRMATION_MS);
    controller.update(input(clock, "lost", null));
    clock.advanceMs(NEUTRAL_RETURN_MS);
    controller.update(input(clock, "tracked", pose(clock, 100)));
    clock.advanceMs(150);
    controller.update(input(clock, "tracked", pose(clock, 100)));
    const interrupted = controller.update(input(clock, "degraded", null));
    expect(interrupted.effectivePositionMm.x).toBe(50);

    clock.advanceMs(100);
    const recovered = controller.update(input(clock, "tracked", pose(clock, -100)));
    expect(recovered.effectivePositionMm.x).toBe(50);
    clock.advanceMs(150);
    expect(controller.update(input(clock, "tracked", pose(clock, -100))).effectivePositionMm.x).toBe(-25);
  });

  it("keeps repeated short interruptions from corrupting transition state", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);
    controller.update(input(clock, "tracked", pose(clock, 20)));
    clock.advanceMs(100);
    controller.update(input(clock, "degraded", null));
    clock.advanceMs(100);
    expect(controller.update(input(clock, "tracked", pose(clock, 30))).tracking.status).toBe("tracked");
    clock.advanceMs(50);
    controller.update(input(clock, "degraded", null));
    clock.advanceMs(50);
    const recovered = controller.update(input(clock, "tracked", pose(clock, 40)));
    expect(recovered.tracking.status).toBe("tracked");
    expect(recovered.effectivePositionMm.x).toBe(40);
  });

  it("treats invalid poses as missing and never propagates non-finite values", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);
    const invalid = pose(clock, Number.NaN);
    const state = controller.update(input(clock, "tracked", invalid));

    expect(state.tracking.status).toBe("tracked");
    expect(state.trackedPositionMm).toBeNull();
    expect(state.effectivePositionMm).toEqual(neutral);
    expect(state.velocityMmPerSec).toEqual({ x: 0, y: 0, z: 0 });
    expect(state.confidence).toBeNull();
  });

  it("resets transition history and stale tracked state to a new neutral", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);
    controller.update(input(clock, "tracked", pose(clock, 100)));
    const newNeutral = Object.freeze({ x: -20, y: 30, z: 700 });
    controller.reset(newNeutral);

    const state = controller.update(input(clock, "acquiring", null, newNeutral));
    expect(state.tracking.status).toBe("acquiring");
    expect(state.trackedPositionMm).toBeNull();
    expect(state.effectivePositionMm).toEqual(newNeutral);
    expect(state.neutralPositionMm).toEqual(newNeutral);
  });

  it("rejects a backward clock and keeps returned values immutable", () => {
    const clock = new ManualClock();
    const controller = new ViewerStateController(clock);
    const state = controller.update(input(clock, "acquiring", null));
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.tracking)).toBe(true);
    expect(Object.isFrozen(state.effectivePositionMm)).toBe(true);
    expect(Object.isFrozen(state.velocityMmPerSec)).toBe(true);

    clock.advanceMs(10);
    controller.update(input(clock, "acquiring", null));
    clock.setMs(9);
    expect(() => controller.update(input(clock, "acquiring", null))).toThrow(RangeError);
  });
});
