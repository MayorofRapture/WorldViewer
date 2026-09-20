import type { MonotonicMs, Vec3Mm, Vec3MmPerSec } from "./primitives";

export type TrackingStatus =
  | "unavailable"
  | "initializing"
  | "acquiring"
  | "tracked"
  | "degraded"
  | "lost";

export interface TrackingHealth {
  readonly status: TrackingStatus;
  readonly confidence: number | null;
  readonly sinceMonotonicMs: MonotonicMs;
  readonly reasonCode?: string;
}

export interface ViewerState {
  readonly timestampMs: MonotonicMs;
  readonly tracking: Readonly<TrackingHealth>;
  readonly trackedPositionMm: Vec3Mm | null;
  readonly effectivePositionMm: Vec3Mm;
  readonly neutralPositionMm: Vec3Mm;
  readonly velocityMmPerSec: Vec3MmPerSec;
  readonly confidence: number | null;
}

export interface ViewportState {
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly devicePixelRatio: number;
}
