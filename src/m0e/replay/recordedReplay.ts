import type { RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";
import { identityCalibrationTransform, type CalibrationProfile, type CalibratedViewerPose } from "../../shared/contracts/calibration";
import { OneEuroPoseFilter, type OneEuroFilterConfiguration } from "../../engine/filter/poseFilter";
import type { FilteredViewerPose } from "../../engine/viewer/contracts";
import { SELECTED_ESTIMATOR_CONFIG_HASH, SELECTED_ESTIMATOR_VERSION, selectedEstimatorIdentity as selectedEstimatorHandoffIdentity } from "../selectedEstimatorHandoff";

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
  readonly invalidReason?: string;
}

export type SelectedEstimatorReplayRecord = Readonly<
  | (SelectedEstimatorTraceRecord & { readonly valid: true; readonly positionMm: { readonly x: number; readonly y: number; readonly z: number } })
  | (SelectedEstimatorTraceRecord & { readonly valid: false; readonly positionMm: null; readonly invalidReason: string })
>;

const SELECTED_ESTIMATOR_ID = selectedEstimatorHandoffIdentity().id;

function validPosition(value: unknown): value is { readonly x: number; readonly y: number; readonly z: number } {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Number.isFinite((value as { x?: unknown }).x) && Number.isFinite((value as { y?: unknown }).y) && Number.isFinite((value as { z?: unknown }).z);
}

export function parseSelectedEstimatorReplayRecords(text: string): readonly SelectedEstimatorReplayRecord[] {
  const records: SelectedEstimatorReplayRecord[] = [];
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
    const valid = record.valid === true;
    const validRecord = valid && validPosition(positionMm);
    const invalidRecord = !valid && positionMm === null && typeof record.invalidReason === "string" && record.invalidReason.length > 0;
    if (record.schemaVersion !== 1 || record.estimatorId !== SELECTED_ESTIMATOR_ID || record.estimatorConfigHash !== SELECTED_ESTIMATOR_CONFIG_HASH || typeof record.observationTraceId !== "string" || typeof timestampMs !== "number" || !Number.isFinite(timestampMs) || timestampMs <= previousTimestamp || (!validRecord && !invalidRecord)) throw new RangeError(`selected estimator replay line ${index + 1} does not match the frozen M0D output contract`);
    previousTimestamp = timestampMs;
    if (validRecord) records.push(Object.freeze({ schemaVersion: 1, timestampMs, observationTraceId: record.observationTraceId!, estimatorId: SELECTED_ESTIMATOR_ID, estimatorConfigHash: SELECTED_ESTIMATOR_CONFIG_HASH, valid: true, positionMm: Object.freeze({ x: positionMm!.x, y: positionMm!.y, z: positionMm!.z }) }));
    else records.push(Object.freeze({ schemaVersion: 1, timestampMs, observationTraceId: record.observationTraceId!, estimatorId: SELECTED_ESTIMATOR_ID, estimatorConfigHash: SELECTED_ESTIMATOR_CONFIG_HASH, valid: false, positionMm: null, invalidReason: record.invalidReason! }));
  }
  return Object.freeze(records);
}

export function parseSelectedEstimatorReplayJsonl(text: string): readonly RawViewerPose[] {
  return Object.freeze(parseSelectedEstimatorReplayRecords(text).filter((record): record is SelectedEstimatorReplayRecord & { readonly valid: true } => record.valid).map((record) => Object.freeze({ timestampMs: record.timestampMs, positionMm: record.positionMm, confidence: 1, estimatorId: SELECTED_ESTIMATOR_ID })));
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
  return selectedEstimatorHandoffIdentity();
}
