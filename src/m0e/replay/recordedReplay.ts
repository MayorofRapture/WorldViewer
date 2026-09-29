import type { RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";
import { identityCalibrationTransform, type CalibrationProfile, type CalibratedViewerPose } from "../../shared/contracts/calibration";
import { OneEuroPoseFilter, type OneEuroFilterConfiguration } from "../../engine/filter/poseFilter";
import type { FilteredViewerPose } from "../../engine/viewer/contracts";

export interface M0EReplayFrame {
  readonly raw: RawViewerPose;
  readonly calibrated: CalibratedViewerPose;
  readonly filtered: FilteredViewerPose;
}

export interface M0EReplayResult {
  readonly frames: readonly M0EReplayFrame[];
}

export interface SelectedEstimatorTraceRecord {
  readonly schemaVersion: number;
  readonly timestampMs: number;
  readonly observationTraceId: string;
  readonly estimatorId: string;
  readonly estimatorConfigHash: string;
  readonly valid: boolean;
  readonly positionMm: { readonly x: number; readonly y: number; readonly z: number } | null;
}

const SELECTED_ESTIMATOR_ID = "mediapipe-facial-transform-v1";
const SELECTED_ESTIMATOR_VERSION = "v1";
const SELECTED_ESTIMATOR_CONFIG_HASH = "fnv1a64-825a99daebb20f6c";

function validPosition(value: unknown): value is { readonly x: number; readonly y: number; readonly z: number } {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Number.isFinite((value as { x?: unknown }).x) && Number.isFinite((value as { y?: unknown }).y) && Number.isFinite((value as { z?: unknown }).z);
}

export function parseSelectedEstimatorReplayJsonl(text: string): readonly RawViewerPose[] {
  const poses: RawViewerPose[] = [];
  let previousTimestamp = -Infinity;
  for (const [index, line] of text.split(/\r?\n/).filter((entry) => entry.trim().length > 0).entries()) {
    let value: unknown;
    try {
      value = JSON.parse(line) as unknown;
    } catch (error) {
      throw new RangeError(`selected estimator replay line ${index + 1} is not valid JSON: ${String(error)}`);
    }
    const record = value as Partial<SelectedEstimatorTraceRecord>;
    const timestampMs = record.timestampMs;
    const positionMm = record.positionMm;
    if (record.schemaVersion !== 1 || record.estimatorId !== SELECTED_ESTIMATOR_ID || record.estimatorConfigHash !== SELECTED_ESTIMATOR_CONFIG_HASH || record.valid !== true || typeof record.observationTraceId !== "string" || typeof timestampMs !== "number" || !Number.isFinite(timestampMs) || timestampMs <= previousTimestamp || !validPosition(positionMm)) throw new RangeError(`selected estimator replay line ${index + 1} does not match the frozen M0D output contract`);
    previousTimestamp = timestampMs;
    poses.push(Object.freeze({ timestampMs, positionMm: Object.freeze({ x: positionMm.x, y: positionMm.y, z: positionMm.z }), confidence: 1, estimatorId: SELECTED_ESTIMATOR_ID }));
  }
  return Object.freeze(poses);
}

export function replayRawViewerPoses(
  poses: readonly RawViewerPose[],
  profile: CalibrationProfile,
  configuration: OneEuroFilterConfiguration,
): M0EReplayResult {
  const filter = new OneEuroPoseFilter(configuration);
  const frames: M0EReplayFrame[] = [];
  for (const pose of poses) {
    const calibrated = identityCalibrationTransform.apply(pose, profile);
    const filtered = filter.update(calibrated);
    frames.push(Object.freeze({ raw: pose, calibrated, filtered }));
  }
  return Object.freeze({ frames: Object.freeze(frames) });
}

export function selectedEstimatorIdentity(): { readonly id: typeof SELECTED_ESTIMATOR_ID; readonly version: typeof SELECTED_ESTIMATOR_VERSION; readonly configHash: typeof SELECTED_ESTIMATOR_CONFIG_HASH } {
  return Object.freeze({ id: SELECTED_ESTIMATOR_ID, version: SELECTED_ESTIMATOR_VERSION, configHash: SELECTED_ESTIMATOR_CONFIG_HASH });
}
