import type { MonotonicMs, Vec3Mm, Vec3MmPerSec } from "../../shared/contracts/primitives";
import type { TrackingHealth, ViewerState } from "../../shared/contracts/viewer";

export interface MonotonicClock {
  nowMs(): MonotonicMs;
}

export interface FilteredViewerPose {
  readonly timestampMs: MonotonicMs;
  readonly positionMm: Vec3Mm;
  readonly velocityMmPerSec: Vec3MmPerSec;
  readonly confidence: number;
}

export interface ViewerStateControllerInput {
  readonly tracking: Readonly<TrackingHealth>;
  readonly filteredPose: Readonly<FilteredViewerPose> | null;
  readonly neutralPositionMm: Vec3Mm;
}

export interface ViewerStateControllerContract {
  reset(neutralPositionMm: Vec3Mm): void;
  update(input: Readonly<ViewerStateControllerInput>): Readonly<ViewerState>;
}
