import { createVec3Mm, type Vec3Mm } from "../geometry/screenGeometry";

import type { MonotonicMs } from "../../shared/contracts/primitives";

export type { MonotonicMs } from "../../shared/contracts/primitives";

export interface RawViewerPose {
  readonly timestampMs: MonotonicMs;
  readonly positionMm: Vec3Mm;
  readonly confidence: number;
  readonly estimatorId: string;
}

export interface ViewerPoseSource {
  start(): Promise<void>;
  stop(): Promise<void>;
  sample(timestampMs: MonotonicMs): RawViewerPose | null;
}

function validateTimestamp(timestampMs: MonotonicMs): void {
  if (!Number.isFinite(timestampMs) || timestampMs < 0) {
    throw new RangeError("timestampMs must be finite and non-negative");
  }
}

function validatePose(pose: RawViewerPose, previousTimestampMs: MonotonicMs | null): RawViewerPose {
  validateTimestamp(pose.timestampMs);
  if (previousTimestampMs !== null && pose.timestampMs <= previousTimestampMs) {
    throw new RangeError("synthetic pose timestamps must be strictly increasing");
  }
  if (!Number.isFinite(pose.confidence) || pose.confidence < 0 || pose.confidence > 1) {
    throw new RangeError("confidence must be finite and between zero and one");
  }
  if (pose.estimatorId.trim().length === 0) {
    throw new RangeError("estimatorId must not be empty");
  }

  return Object.freeze({
    timestampMs: pose.timestampMs,
    positionMm: createVec3Mm(pose.positionMm.x, pose.positionMm.y, pose.positionMm.z),
    confidence: pose.confidence,
    estimatorId: pose.estimatorId,
  });
}

export class SyntheticViewerPoseSource implements ViewerPoseSource {
  private readonly script: readonly RawViewerPose[];
  private cursor = 0;
  private started = false;
  private lastTimestampMs: MonotonicMs | null = null;
  private finalSampleDelivered = false;

  constructor(script: readonly RawViewerPose[]) {
    let previousTimestampMs: MonotonicMs | null = null;
    this.script = Object.freeze(script.map((pose) => {
      const validatedPose = validatePose(pose, previousTimestampMs);
      previousTimestampMs = validatedPose.timestampMs;
      return validatedPose;
    }));
  }

  async start(): Promise<void> {
    this.cursor = 0;
    this.lastTimestampMs = null;
    this.finalSampleDelivered = false;
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
    this.cursor = 0;
    this.lastTimestampMs = null;
    this.finalSampleDelivered = false;
  }

  sample(timestampMs: MonotonicMs): RawViewerPose | null {
    validateTimestamp(timestampMs);
    if (!this.started) return null;
    if (this.lastTimestampMs !== null && timestampMs < this.lastTimestampMs) {
      throw new RangeError("sample timestamps must be monotonic");
    }
    this.lastTimestampMs = timestampMs;

    while (this.cursor < this.script.length) {
      const nextSample = this.script[this.cursor];
      if (!nextSample || nextSample.timestampMs > timestampMs) break;
      this.cursor += 1;
    }

    const sampleIndex = this.cursor - 1;
    const currentSample = this.script[sampleIndex];
    if (!currentSample) return null;
    if (this.cursor === this.script.length) {
      if (this.finalSampleDelivered && timestampMs > currentSample.timestampMs) return null;
      this.finalSampleDelivered = true;
    }
    return currentSample;
  }
}
