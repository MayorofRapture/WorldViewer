import type { MonotonicMs, Vec3Mm, Vec3MmPerSec } from "../../shared/contracts/primitives";
import type { TrackingHealth, TrackingStatus, ViewerState } from "../../shared/contracts/viewer";
import type {
  FilteredViewerPose,
  MonotonicClock,
  ViewerStateControllerContract,
  ViewerStateControllerInput,
} from "./contracts";

export const LOSS_CONFIRMATION_MS = 350;
export const NEUTRAL_RETURN_MS = 5000;
export const REACQUISITION_MS = 300;

type Phase = "pre-tracked" | "normal" | "loss-pending" | "neutral-return" | "reacquiring";
type LossPendingOrigin = "normal" | "reacquiring";

const TRACKING_STATUSES = new Set<TrackingStatus>([
  "unavailable",
  "initializing",
  "acquiring",
  "tracked",
  "degraded",
  "lost",
]);

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
}

function nonNegativeFinite(value: number, name: string): number {
  finite(value, name);
  if (value < 0) throw new RangeError(`${name} must not be negative`);
  return value;
}

function copyVec3(value: Vec3Mm, name: string): Vec3Mm {
  return Object.freeze({
    x: finite(value.x, `${name}.x`),
    y: finite(value.y, `${name}.y`),
    z: finite(value.z, `${name}.z`),
  });
}

function copyVelocity(value: Vec3MmPerSec): Vec3MmPerSec {
  return Object.freeze({
    x: finite(value.x, "velocityMmPerSec.x"),
    y: finite(value.y, "velocityMmPerSec.y"),
    z: finite(value.z, "velocityMmPerSec.z"),
  });
}

function copyTracking(tracking: Readonly<TrackingHealth>, status = tracking.status): Readonly<TrackingHealth> {
  if (!TRACKING_STATUSES.has(tracking.status)) throw new RangeError("tracking.status is invalid");
  nonNegativeFinite(tracking.sinceMonotonicMs, "tracking.sinceMonotonicMs");
  if (tracking.confidence !== null) {
    finite(tracking.confidence, "tracking.confidence");
    if (tracking.confidence < 0 || tracking.confidence > 1) throw new RangeError("tracking.confidence must be between zero and one");
  }
  return Object.freeze({
    status,
    confidence: tracking.confidence,
    sinceMonotonicMs: tracking.sinceMonotonicMs,
    ...(tracking.reasonCode === undefined ? {} : { reasonCode: tracking.reasonCode }),
  });
}

function usablePose(pose: Readonly<FilteredViewerPose> | null): FilteredViewerPose | null {
  if (pose === null) return null;
  try {
    return Object.freeze({
      timestampMs: nonNegativeFinite(pose.timestampMs, "filteredPose.timestampMs"),
      positionMm: copyVec3(pose.positionMm, "filteredPose.positionMm"),
      velocityMmPerSec: copyVelocity(pose.velocityMmPerSec),
      confidence: finite(pose.confidence, "filteredPose.confidence"),
    });
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

function validPose(pose: FilteredViewerPose | null): pose is FilteredViewerPose {
  return pose !== null && pose.confidence >= 0 && pose.confidence <= 1;
}

function smoothstep(elapsedMs: number, durationMs: number): number {
  const progress = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
  return progress * progress * (3 - 2 * progress);
}

function lerp(start: Vec3Mm, target: Vec3Mm, weight: number): Vec3Mm {
  return Object.freeze({
    x: start.x + (target.x - start.x) * weight,
    y: start.y + (target.y - start.y) * weight,
    z: start.z + (target.z - start.z) * weight,
  });
}

function zeroVelocity(): Vec3MmPerSec {
  return Object.freeze({ x: 0, y: 0, z: 0 });
}

export class ViewerStateController implements ViewerStateControllerContract {
  private neutralPositionMm: Vec3Mm | null = null;
  private effectivePositionMm: Vec3Mm | null = null;
  private phase: Phase = "pre-tracked";
  private lossPendingOrigin: LossPendingOrigin = "normal";
  private lossPendingSinceMs: MonotonicMs | null = null;
  private neutralReturnStartPositionMm: Vec3Mm | null = null;
  private neutralReturnStartedAtMs: MonotonicMs | null = null;
  private reacquisitionStartPositionMm: Vec3Mm | null = null;
  private reacquisitionStartedAtMs: MonotonicMs | null = null;
  private lastClockMs: MonotonicMs | null = null;

  constructor(private readonly clock: MonotonicClock) {}

  reset(neutralPositionMm: Vec3Mm): void {
    const neutral = copyVec3(neutralPositionMm, "neutralPositionMm");
    this.neutralPositionMm = neutral;
    this.effectivePositionMm = neutral;
    this.phase = "pre-tracked";
    this.lossPendingOrigin = "normal";
    this.lossPendingSinceMs = null;
    this.neutralReturnStartPositionMm = null;
    this.neutralReturnStartedAtMs = null;
    this.reacquisitionStartPositionMm = null;
    this.reacquisitionStartedAtMs = null;
    this.lastClockMs = null;
  }

  update(input: Readonly<ViewerStateControllerInput>): Readonly<ViewerState> {
    const nowMs = nonNegativeFinite(this.clock.nowMs(), "clock.nowMs()");
    if (this.lastClockMs !== null && nowMs < this.lastClockMs) {
      throw new RangeError("monotonic clock moved backward");
    }
    const neutral = copyVec3(input.neutralPositionMm, "neutralPositionMm");
    if (this.neutralPositionMm === null) {
      this.neutralPositionMm = neutral;
      this.effectivePositionMm = neutral;
    } else {
      this.neutralPositionMm = neutral;
    }
    const pose = usablePose(input.filteredPose);
    this.lastClockMs = nowMs;

    if (this.phase === "pre-tracked") return this.updatePreTracked(nowMs, input.tracking, pose);
    if (this.phase === "normal") return this.updateNormal(nowMs, input.tracking, pose);
    if (this.phase === "loss-pending") return this.updateLossPending(nowMs, input.tracking, pose);
    if (this.phase === "neutral-return") return this.updateNeutralReturn(nowMs, input.tracking, pose);
    return this.updateReacquiring(nowMs, input.tracking, pose);
  }

  private updatePreTracked(nowMs: MonotonicMs, tracking: Readonly<TrackingHealth>, pose: FilteredViewerPose | null): Readonly<ViewerState> {
    if (tracking.status === "tracked" && validPose(pose)) {
      this.phase = "normal";
      this.effectivePositionMm = pose.positionMm;
      return this.state(nowMs, tracking, pose.positionMm, pose.positionMm, pose.velocityMmPerSec, pose.confidence, "tracked");
    }
    return this.state(nowMs, tracking, null, this.effectivePositionMm!, zeroVelocity(), null);
  }

  private updateNormal(nowMs: MonotonicMs, tracking: Readonly<TrackingHealth>, pose: FilteredViewerPose | null): Readonly<ViewerState> {
    if (tracking.status === "tracked" && validPose(pose)) {
      this.effectivePositionMm = pose.positionMm;
      return this.state(nowMs, tracking, pose.positionMm, pose.positionMm, pose.velocityMmPerSec, pose.confidence, "tracked");
    }
    this.beginLossPending(nowMs, "normal");
    return this.updateLossPending(nowMs, tracking, pose);
  }

  private updateLossPending(nowMs: MonotonicMs, tracking: Readonly<TrackingHealth>, pose: FilteredViewerPose | null): Readonly<ViewerState> {
    const elapsedMs = nowMs - this.lossPendingSinceMs!;
    if (tracking.status === "tracked" && validPose(pose)) {
      if (elapsedMs >= LOSS_CONFIRMATION_MS) {
        this.confirmLoss(nowMs);
        this.beginReacquisition(nowMs);
        return this.state(nowMs, tracking, pose.positionMm, this.effectivePositionMm!, pose.velocityMmPerSec, pose.confidence, "tracked");
      }
      if (this.lossPendingOrigin === "reacquiring") {
        this.beginReacquisition(nowMs);
        return this.state(nowMs, tracking, pose.positionMm, this.effectivePositionMm!, pose.velocityMmPerSec, pose.confidence, "tracked");
      }
      this.phase = "normal";
      this.effectivePositionMm = pose.positionMm;
      return this.state(nowMs, tracking, pose.positionMm, pose.positionMm, pose.velocityMmPerSec, pose.confidence, "tracked");
    }
    if (validPose(pose) && tracking.status === "degraded" && elapsedMs < LOSS_CONFIRMATION_MS) {
      this.effectivePositionMm = pose.positionMm;
      return this.state(nowMs, tracking, pose.positionMm, pose.positionMm, pose.velocityMmPerSec, pose.confidence, "degraded");
    }
    if (elapsedMs >= LOSS_CONFIRMATION_MS) {
      this.confirmLoss(nowMs);
      return this.state(nowMs, tracking, null, this.effectivePositionMm!, zeroVelocity(), null, "lost");
    }
    return this.state(nowMs, tracking, null, this.effectivePositionMm!, zeroVelocity(), null, "degraded");
  }

  private updateNeutralReturn(nowMs: MonotonicMs, tracking: Readonly<TrackingHealth>, pose: FilteredViewerPose | null): Readonly<ViewerState> {
    if (tracking.status === "tracked" && validPose(pose)) {
      this.beginReacquisition(nowMs);
      return this.state(nowMs, tracking, pose.positionMm, this.effectivePositionMm!, pose.velocityMmPerSec, pose.confidence, "tracked");
    }
    const effective = lerp(this.neutralReturnStartPositionMm!, this.neutralPositionMm!, smoothstep(nowMs - this.neutralReturnStartedAtMs!, NEUTRAL_RETURN_MS));
    this.effectivePositionMm = effective;
    return this.state(nowMs, tracking, null, effective, zeroVelocity(), null, "lost");
  }

  private updateReacquiring(nowMs: MonotonicMs, tracking: Readonly<TrackingHealth>, pose: FilteredViewerPose | null): Readonly<ViewerState> {
    if (!(tracking.status === "tracked" && validPose(pose))) {
      this.beginLossPending(nowMs, "reacquiring");
      return this.updateLossPending(nowMs, tracking, pose);
    }
    const effective = lerp(this.reacquisitionStartPositionMm!, pose.positionMm, smoothstep(nowMs - this.reacquisitionStartedAtMs!, REACQUISITION_MS));
    this.effectivePositionMm = effective;
    if (nowMs - this.reacquisitionStartedAtMs! >= REACQUISITION_MS) this.phase = "normal";
    return this.state(nowMs, tracking, pose.positionMm, effective, pose.velocityMmPerSec, pose.confidence, "tracked");
  }

  private beginLossPending(nowMs: MonotonicMs, origin: LossPendingOrigin): void {
    this.phase = "loss-pending";
    this.lossPendingOrigin = origin;
    this.lossPendingSinceMs = nowMs;
  }

  private confirmLoss(nowMs: MonotonicMs): void {
    this.phase = "neutral-return";
    this.neutralReturnStartPositionMm = this.effectivePositionMm!;
    this.neutralReturnStartedAtMs = nowMs;
    this.reacquisitionStartPositionMm = null;
    this.reacquisitionStartedAtMs = null;
    this.lossPendingSinceMs = null;
  }

  private beginReacquisition(nowMs: MonotonicMs): void {
    this.phase = "reacquiring";
    this.reacquisitionStartPositionMm = this.effectivePositionMm!;
    this.reacquisitionStartedAtMs = nowMs;
    this.lossPendingSinceMs = null;
    this.neutralReturnStartPositionMm = null;
    this.neutralReturnStartedAtMs = null;
    this.effectivePositionMm = this.reacquisitionStartPositionMm;
  }

  private state(
    timestampMs: MonotonicMs,
    tracking: Readonly<TrackingHealth>,
    trackedPositionMm: Vec3Mm | null,
    effectivePositionMm: Vec3Mm,
    velocityMmPerSec: Vec3MmPerSec,
    confidence: number | null,
    status: TrackingStatus = tracking.status,
  ): Readonly<ViewerState> {
    return Object.freeze({
      timestampMs,
      tracking: copyTracking(tracking, status),
      trackedPositionMm: trackedPositionMm === null ? null : copyVec3(trackedPositionMm, "trackedPositionMm"),
      effectivePositionMm: copyVec3(effectivePositionMm, "effectivePositionMm"),
      neutralPositionMm: copyVec3(this.neutralPositionMm!, "neutralPositionMm"),
      velocityMmPerSec: copyVelocity(velocityMmPerSec),
      confidence,
    });
  }
}

export type { FilteredViewerPose, ViewerStateControllerContract, ViewerStateControllerInput } from "./contracts";
