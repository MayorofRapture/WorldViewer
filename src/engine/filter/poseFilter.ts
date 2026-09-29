import { OneEuroFilter } from "1eurofilter";
import type { CalibratedViewerPose, CalibrationTransformContract, CalibrationProfile } from "../../shared/contracts/calibration";
import type { MonotonicMs, Vec3Mm, Vec3MmPerSec } from "../../shared/contracts/primitives";
import type { FilteredViewerPose } from "../viewer/contracts";

export const ONE_EURO_FILTER_ID = "1eurofilter@1.3.0" as const;

export interface OneEuroFilterConfiguration {
  readonly minCutoffHz: number;
  readonly beta: number;
  readonly dCutoffHz: number;
  readonly initialFrequencyHz: number;
}

export const REFERENCE_TEST_ONE_EURO_CONFIGURATION: OneEuroFilterConfiguration = Object.freeze({
  minCutoffHz: 1,
  beta: 0,
  dCutoffHz: 1,
  initialFrequencyHz: 60,
});

export class PoseFilterInputError extends Error {
  readonly code: "invalid-sample" | "non-monotonic-timestamp" | "non-finite-output";

  constructor(code: PoseFilterInputError["code"], message: string) {
    super(message);
    this.name = "PoseFilterInputError";
    this.code = code;
  }
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function validPosition(positionMm: Vec3Mm): boolean {
  return finite(positionMm.x) && finite(positionMm.y) && finite(positionMm.z);
}

function validSample(sample: CalibratedViewerPose): void {
  if (!finite(sample.timestampMs) || sample.timestampMs < 0 || !validPosition(sample.positionMm) || !finite(sample.confidence) || sample.confidence < 0 || sample.confidence > 1 || sample.estimatorId.trim().length === 0) {
    throw new PoseFilterInputError("invalid-sample", "calibrated pose must contain finite timestamp, position, confidence, and estimator identity");
  }
}

function validateConfiguration(configuration: OneEuroFilterConfiguration): OneEuroFilterConfiguration {
  if (!finite(configuration.minCutoffHz) || !(configuration.minCutoffHz > 0)) throw new RangeError("minCutoffHz must be finite and greater than zero");
  if (!finite(configuration.beta) || configuration.beta < 0) throw new RangeError("beta must be finite and non-negative");
  if (!finite(configuration.dCutoffHz) || !(configuration.dCutoffHz > 0)) throw new RangeError("dCutoffHz must be finite and greater than zero");
  if (!finite(configuration.initialFrequencyHz) || !(configuration.initialFrequencyHz > 0)) throw new RangeError("initialFrequencyHz must be finite and greater than zero");
  return Object.freeze({ ...configuration });
}

export class OneEuroPoseFilter {
  readonly id = ONE_EURO_FILTER_ID;
  private readonly configuration: OneEuroFilterConfiguration;
  private readonly x: OneEuroFilter;
  private readonly y: OneEuroFilter;
  private readonly z: OneEuroFilter;
  private previousTimestampMs: MonotonicMs | null = null;
  private previousPositionMm: Vec3Mm | null = null;

  constructor(configuration: OneEuroFilterConfiguration) {
    this.configuration = validateConfiguration(configuration);
    this.x = this.createUpstreamFilter();
    this.y = this.createUpstreamFilter();
    this.z = this.createUpstreamFilter();
  }

  private createUpstreamFilter(): OneEuroFilter {
    return new OneEuroFilter(this.configuration.initialFrequencyHz, this.configuration.minCutoffHz, this.configuration.beta, this.configuration.dCutoffHz);
  }

  private resetUpstream(): void {
    this.x.reset();
    this.y.reset();
    this.z.reset();
  }

  reset(initial?: CalibratedViewerPose): void {
    this.resetUpstream();
    this.previousTimestampMs = null;
    this.previousPositionMm = null;
    if (initial !== undefined) {
      validSample(initial);
      const positionMm = this.filterPosition(initial);
      this.previousTimestampMs = initial.timestampMs;
      this.previousPositionMm = positionMm;
    }
  }

  private filterPosition(sample: CalibratedViewerPose): Vec3Mm {
    const timestampSeconds = sample.timestampMs / 1000;
    const positionMm = Object.freeze({
      x: this.x.filter(sample.positionMm.x, timestampSeconds),
      y: this.y.filter(sample.positionMm.y, timestampSeconds),
      z: this.z.filter(sample.positionMm.z, timestampSeconds),
    });
    if (!validPosition(positionMm)) throw new PoseFilterInputError("non-finite-output", "One Euro filter produced a non-finite position");
    return positionMm;
  }

  update(sample: CalibratedViewerPose): FilteredViewerPose {
    validSample(sample);
    if (this.previousTimestampMs !== null && sample.timestampMs <= this.previousTimestampMs) {
      throw new PoseFilterInputError("non-monotonic-timestamp", "pose filter timestamps must be strictly increasing");
    }

    const positionMm = this.filterPosition(sample);
    const velocityMmPerSec: Vec3MmPerSec = this.previousPositionMm === null || this.previousTimestampMs === null
      ? Object.freeze({ x: 0, y: 0, z: 0 })
      : (() => {
          const deltaSeconds = (sample.timestampMs - this.previousTimestampMs) / 1000;
          if (!(deltaSeconds > 0) || !finite(deltaSeconds)) throw new PoseFilterInputError("non-monotonic-timestamp", "pose filter timestamp delta must be positive");
          const velocity = Object.freeze({
            x: (positionMm.x - this.previousPositionMm.x) / deltaSeconds,
            y: (positionMm.y - this.previousPositionMm.y) / deltaSeconds,
            z: (positionMm.z - this.previousPositionMm.z) / deltaSeconds,
          });
          if (!validPosition(velocity)) throw new PoseFilterInputError("non-finite-output", "pose filter velocity must be finite");
          return velocity;
        })();

    this.previousTimestampMs = sample.timestampMs;
    this.previousPositionMm = positionMm;
    return Object.freeze({ timestampMs: sample.timestampMs, positionMm, velocityMmPerSec, confidence: sample.confidence });
  }
}

export function applyCalibrationAndFilter(
  sample: Parameters<CalibrationTransformContract["apply"]>[0],
  profile: CalibrationProfile,
  transform: CalibrationTransformContract,
  filter: OneEuroPoseFilter,
): FilteredViewerPose {
  return filter.update(transform.apply(sample, profile));
}
