import type { Vec3Mm } from "../../shared/contracts/primitives";

export interface M0DPercentileSummary {
  readonly count: number;
  readonly median: number;
  readonly p95: number;
  readonly p99: number;
  readonly maximum: number;
}

export interface M0DOutlierSummary {
  readonly count: number;
  readonly median: number;
  readonly mad: number;
  readonly robustSigma: number;
  readonly threshold: number;
  readonly outlierIndices: readonly number[];
  readonly outlierRate: number;
  readonly valuesRetained: boolean;
}

export interface M0DStationaryOutlierSummary {
  readonly count: number;
  readonly outlierCount: number;
  readonly outlierRate: number;
  readonly outlierIndices: readonly number[];
  readonly axisFlags: Readonly<{ x: number; y: number; z: number }>;
  readonly valuesRetained: boolean;
}

export interface M0DDiscontinuitySummary {
  readonly sampleCount: number;
  readonly median: number;
  readonly p95: number;
  readonly p99: number;
  readonly maximum: number;
}

export interface M0DProcessingSummary extends M0DPercentileSummary {}

export interface M0DMetricVectorSummary {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface M0DAxisMetricSummary {
  readonly x: number | null;
  readonly y: number | null;
  readonly z: number | null;
}

export interface M0DReferenceErrorSummary {
  readonly signedMm: M0DMetricVectorSummary | null;
  readonly absoluteMm: M0DMetricVectorSummary | null;
}

export interface M0DRelativeMovementErrorSummary {
  readonly signedMm: M0DMetricVectorSummary | null;
  readonly absoluteMm: M0DMetricVectorSummary | null;
  readonly normalizedByCommandedDisplacement: number | null;
}

export interface M0DCrossAxisDriftSummary {
  readonly movementAxis: "x" | "y" | "z";
  readonly offAxisRmsByAxis: M0DAxisMetricSummary;
  readonly offAxisMaximumByAxis: M0DAxisMetricSummary;
  readonly offAxisRmsMm: number | null;
  readonly offAxisMaximumMm: number | null;
}

export interface M0DCadenceSummary {
  readonly sourceCount: number;
  readonly faceCount: number;
  readonly validCount: number;
  readonly sourceRateHz: number | null;
  readonly faceRateHz: number | null;
  readonly validRateHz: number | null;
  readonly validRateOfSource: number | null;
  readonly validRateOfFace: number | null;
  readonly status: "Verified" | "Structural failure" | "Unverified / insufficient attribution to estimator" | "Unverified / insufficient to judge";
}

export interface M0DCalibrationBurdenSummary {
  readonly manualMeasurementCount: number;
  readonly calibrationCaptureCount: number;
  readonly calibrationDurationSeconds: number | null;
  readonly candidateCalibrationStepCount: number;
  readonly description: string;
}

export interface M0DMetricPoseSample {
  readonly sequenceNumber: number;
  readonly timestampMs: number;
  readonly positionMm: Vec3Mm | null;
  readonly processingMs: number | null;
}

export interface M0DCandidateMetricInput {
  readonly stationaryPositionsMm?: readonly Vec3Mm[];
  readonly trialPositionsMm?: readonly Vec3Mm[];
  readonly referencePositionMm?: Vec3Mm | null;
  readonly estimatedMovementPositionMm?: Vec3Mm | null;
  readonly referenceMovementPositionMm?: Vec3Mm | null;
  readonly neutralMovementPositionMm?: Vec3Mm | null;
  readonly commandedDisplacementMm?: number | null;
  readonly commandedAxis?: "x" | "y" | "z" | null;
  readonly sourceTimestampsMs: readonly number[];
  readonly faceTimestampsMs: readonly number[];
  readonly validTimestampsMs: readonly number[];
  readonly faceDetectedCount: number;
  readonly poseSamples: readonly M0DMetricPoseSample[];
  readonly calibrationBurden: M0DCalibrationBurdenSummary;
}

export interface M0DCandidateMetricSummary {
  readonly stationaryAxisRmsMm: M0DAxisMetricSummary | null;
  readonly trialMedianPoseMm: Vec3Mm | null;
  readonly repeatabilityRmsMm: number | null;
  readonly referenceError: M0DReferenceErrorSummary;
  readonly relativeMovementError: M0DRelativeMovementErrorSummary;
  readonly crossAxisDrift: M0DCrossAxisDriftSummary | null;
  readonly faceDetectedRate: number | null;
  readonly validOutputRate: number | null;
  readonly nullOutputRate: number | null;
  readonly robustOutliers: M0DStationaryOutlierSummary | null;
  readonly discontinuity: M0DDiscontinuitySummary | null;
  readonly processing: M0DProcessingSummary | null;
  readonly cadence: M0DCadenceSummary;
  readonly calibrationBurden: M0DCalibrationBurdenSummary;
}

export interface M0DOrderingCycle {
  readonly first: number | null;
  readonly neutral: number | null;
  readonly last: number | null;
}

export interface M0DStructuralFailureSummary {
  readonly hardFailures: readonly string[];
  readonly directional: Readonly<{ x: M0DStructuralStatus | "Structural failure"; y: M0DStructuralStatus | "Structural failure"; z: M0DStructuralStatus | "Structural failure" }>;
  readonly status: M0DStructuralStatus | "Structural failure";
}

export type M0DStructuralStatus = "Verified" | "Unverified";

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validVector(value: unknown): value is Vec3Mm {
  return typeof value === "object" && value !== null && finite((value as Vec3Mm).x) && finite((value as Vec3Mm).y) && finite((value as Vec3Mm).z);
}

function vector(x: number, y: number, z: number): M0DMetricVectorSummary {
  return Object.freeze({ x, y, z });
}

function difference(left: Vec3Mm, right: Vec3Mm): M0DMetricVectorSummary {
  return vector(left.x - right.x, left.y - right.y, left.z - right.z);
}

function absolute(value: Vec3Mm): M0DMetricVectorSummary {
  return vector(Math.abs(value.x), Math.abs(value.y), Math.abs(value.z));
}

function magnitude(value: Vec3Mm): number {
  return Math.hypot(value.x, value.y, value.z);
}

function validNumbers(values: readonly number[]): number[] {
  return values.filter(finite);
}

export function mean(values: readonly number[]): number | null {
  const usable = validNumbers(values);
  return usable.length === 0 ? null : usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

export function median(values: readonly number[]): number | null {
  const usable = validNumbers(values).sort((left, right) => left - right);
  if (usable.length === 0) return null;
  const middle = Math.floor(usable.length / 2);
  return usable.length % 2 === 0 ? (usable[middle - 1]! + usable[middle]!) / 2 : usable[middle]!;
}

/** Nearest-rank percentile: rank = ceil(p * n), with p=0 selecting the minimum. */
export function percentileNearestRank(values: readonly number[], percentile: number): number | null {
  const usable = validNumbers(values).sort((left, right) => left - right);
  if (usable.length === 0 || !finite(percentile) || percentile < 0 || percentile > 1) return null;
  const index = percentile === 0 ? 0 : Math.ceil(percentile * usable.length) - 1;
  return usable[Math.max(0, Math.min(index, usable.length - 1))]!;
}

export function rms(values: readonly number[]): number | null {
  const usable = validNumbers(values);
  return usable.length === 0 ? null : Math.sqrt(usable.reduce((sum, value) => sum + value * value, 0) / usable.length);
}

export function stationaryAxisRms(positions: readonly Vec3Mm[]): M0DAxisMetricSummary | null {
  const usable = positions.filter(validVector);
  if (usable.length === 0) return null;
  const centers = {
    x: mean(usable.map((position) => position.x))!,
    y: mean(usable.map((position) => position.y))!,
    z: mean(usable.map((position) => position.z))!,
  };
  return Object.freeze({
    x: rms(usable.map((position) => position.x - centers.x)),
    y: rms(usable.map((position) => position.y - centers.y)),
    z: rms(usable.map((position) => position.z - centers.z)),
  });
}

export function trialMedianPose(positions: readonly Vec3Mm[]): Vec3Mm | null {
  const usable = positions.filter(validVector);
  if (usable.length === 0) return null;
  const result = { x: median(usable.map((position) => position.x))!, y: median(usable.map((position) => position.y))!, z: median(usable.map((position) => position.z))! };
  return Object.freeze(result);
}

export function repeatabilityRms(positions: readonly Vec3Mm[]): number | null {
  const center = trialMedianPose(positions);
  const usable = positions.filter(validVector);
  return center === null || usable.length === 0 ? null : rms(usable.map((position) => magnitude(difference(position, center))));
}

export function referenceError(estimate: Vec3Mm | null | undefined, reference: Vec3Mm | null | undefined): M0DReferenceErrorSummary {
  if (!validVector(estimate) || !validVector(reference)) return { signedMm: null, absoluteMm: null };
  const signedMm = difference(estimate, reference);
  return { signedMm, absoluteMm: absolute(signedMm) };
}

export function relativeMovementError(
  estimate: Vec3Mm | null | undefined,
  reference: Vec3Mm | null | undefined,
  neutral: Vec3Mm | null | undefined,
  commandedDisplacementMm: number | null | undefined,
): M0DRelativeMovementErrorSummary {
  if (!validVector(estimate) || !validVector(reference) || !validVector(neutral)) return { signedMm: null, absoluteMm: null, normalizedByCommandedDisplacement: null };
  const signedMm = difference(difference(estimate, neutral), difference(reference, neutral));
  return {
    signedMm,
    absoluteMm: absolute(signedMm),
    normalizedByCommandedDisplacement: finite(commandedDisplacementMm) && commandedDisplacementMm > 0 ? magnitude(signedMm) / commandedDisplacementMm : null,
  };
}

export function crossAxisDrift(
  positions: readonly Vec3Mm[],
  neutral: Vec3Mm | null | undefined,
  movementAxis: "x" | "y" | "z" | null | undefined,
): M0DCrossAxisDriftSummary | null {
  if (!validVector(neutral) || movementAxis === null || movementAxis === undefined) return null;
  const axes = (["x", "y", "z"] as const).filter((axis) => axis !== movementAxis);
  const usable = positions.filter(validVector);
  if (usable.length === 0) return { movementAxis, offAxisRmsByAxis: { x: null, y: null, z: null }, offAxisMaximumByAxis: { x: null, y: null, z: null }, offAxisRmsMm: null, offAxisMaximumMm: null };
  const axisValues = Object.fromEntries((["x", "y", "z"] as const).map((axis) => [axis, usable.map((position) => position[axis] - neutral[axis])])) as Record<"x" | "y" | "z", number[]>;
  const offAxisRmsByAxis = { x: movementAxis === "x" ? null : rms(axisValues.x), y: movementAxis === "y" ? null : rms(axisValues.y), z: movementAxis === "z" ? null : rms(axisValues.z) };
  const offAxisMaximumByAxis = { x: movementAxis === "x" ? null : Math.max(...axisValues.x.map(Math.abs)), y: movementAxis === "y" ? null : Math.max(...axisValues.y.map(Math.abs)), z: movementAxis === "z" ? null : Math.max(...axisValues.z.map(Math.abs)) };
  const magnitudes = usable.map((position) => Math.hypot(...axes.map((axis) => position[axis] - neutral[axis])));
  return { movementAxis, offAxisRmsByAxis, offAxisMaximumByAxis, offAxisRmsMm: rms(magnitudes), offAxisMaximumMm: Math.max(...magnitudes) };
}

export function faceDetectedRate(faceDetectedCount: number, sourceCount: number): number | null {
  return Number.isInteger(faceDetectedCount) && faceDetectedCount >= 0 && Number.isInteger(sourceCount) && sourceCount > 0 && faceDetectedCount <= sourceCount ? faceDetectedCount / sourceCount : null;
}

export function validAndNullOutputRates(validCount: number, nullCount: number): { readonly validRate: number | null; readonly nullRate: number | null } {
  const denominator = validCount + nullCount;
  if (!Number.isInteger(validCount) || !Number.isInteger(nullCount) || validCount < 0 || nullCount < 0 || denominator === 0) return { validRate: null, nullRate: null };
  return { validRate: validCount / denominator, nullRate: nullCount / denominator };
}

export function robustOutlierSummary(values: readonly number[]): M0DOutlierSummary | null {
  const usable = validNumbers(values);
  const center = median(usable);
  if (center === null) return null;
  const deviations = usable.map((value) => Math.abs(value - center));
  const mad = median(deviations)!;
  const robustSigma = 1.4826 * mad;
  const threshold = 6 * robustSigma;
  const outlierIndices = usable.map((value, index) => Math.abs(value - center) > threshold ? index : -1).filter((index) => index >= 0);
  return { count: usable.length, median: center, mad, robustSigma, threshold, outlierIndices, outlierRate: outlierIndices.length / usable.length, valuesRetained: true };
}

function axisOutlierFlags(values: readonly number[]): { readonly center: number; readonly mad: number; readonly sigma: number; readonly threshold: number; readonly indices: readonly number[] } | null {
  const usable = validNumbers(values);
  const center = median(usable);
  if (center === null) return null;
  const mad = median(usable.map((value) => Math.abs(value - center)))!;
  const sigma = 1.4826 * mad;
  const threshold = 6 * sigma;
  return { center, mad, sigma, threshold, indices: usable.map((value, index) => Math.abs(value - center) > threshold ? index : -1).filter((index) => index >= 0) };
}

export function robustStationaryOutlierSummary(positions: readonly Vec3Mm[]): M0DStationaryOutlierSummary | null {
  const usable = positions.filter(validVector);
  if (usable.length === 0) return null;
  const axes = {
    x: axisOutlierFlags(usable.map((position) => position.x)),
    y: axisOutlierFlags(usable.map((position) => position.y)),
    z: axisOutlierFlags(usable.map((position) => position.z)),
  };
  const outlierIndices = usable.map((_, index) => axes.x!.indices.includes(index) || axes.y!.indices.includes(index) || axes.z!.indices.includes(index) ? index : -1).filter((index) => index >= 0);
  return { count: usable.length, outlierCount: outlierIndices.length, outlierRate: outlierIndices.length / usable.length, outlierIndices, axisFlags: { x: axes.x!.indices.length, y: axes.y!.indices.length, z: axes.z!.indices.length }, valuesRetained: true };
}

export function directionalStructuralStatus(cycles: readonly M0DOrderingCycle[]): M0DStructuralStatus | "Structural failure" {
  const evaluable = cycles.filter((cycle) => finite(cycle.first) && finite(cycle.neutral) && finite(cycle.last));
  if (evaluable.length < 2) return "Unverified";
  const contradictions = evaluable.filter((cycle) => !(cycle.first! < cycle.neutral! && cycle.neutral! < cycle.last!)).length;
  return contradictions >= 2 ? "Structural failure" : "Verified";
}

export function calculateStructuralFailureSummary(input: {
  readonly replayOutputs: readonly { readonly valid: boolean; readonly positionMm: unknown }[];
  readonly calibrationValid: boolean;
  readonly replayable: boolean;
  readonly xCycles?: readonly M0DOrderingCycle[];
  readonly yCycles?: readonly M0DOrderingCycle[];
  readonly zCycles?: readonly M0DOrderingCycle[];
}): M0DStructuralFailureSummary {
  const hardFailures: string[] = [];
  for (const output of input.replayOutputs) if (output.valid && !validVector(output.positionMm)) hardFailures.push("valid-output-nonfinite-position");
  if (!input.calibrationValid) hardFailures.push("invalid-calibration");
  if (!input.replayable) hardFailures.push("replay-not-possible");
  const directional = { x: directionalStructuralStatus(input.xCycles ?? []), y: directionalStructuralStatus(input.yCycles ?? []), z: directionalStructuralStatus(input.zCycles ?? []) };
  const status = hardFailures.length > 0 || Object.values(directional).includes("Structural failure") ? "Structural failure" : "Verified";
  return { hardFailures: [...new Set(hardFailures)], directional, status };
}

function percentileSummary(values: readonly number[]): M0DPercentileSummary | null {
  const usable = validNumbers(values);
  const medianValue = median(usable);
  if (medianValue === null) return null;
  return { count: usable.length, median: medianValue, p95: percentileNearestRank(usable, 0.95)!, p99: percentileNearestRank(usable, 0.99)!, maximum: percentileNearestRank(usable, 1)! };
}

export function discontinuitySummary(samples: readonly M0DMetricPoseSample[]): M0DDiscontinuitySummary | null {
  const distances: number[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]!;
    const current = samples[index]!;
    if (validVector(previous.positionMm) && validVector(current.positionMm)) distances.push(magnitude(difference(current.positionMm, previous.positionMm)));
  }
  const summary = percentileSummary(distances);
  return summary === null ? null : { sampleCount: summary.count, median: summary.median, p95: summary.p95, p99: summary.p99, maximum: summary.maximum };
}

export function processingSummary(samples: readonly M0DMetricPoseSample[]): M0DProcessingSummary | null {
  return percentileSummary(samples.map((sample) => sample.processingMs).filter((value): value is number => finite(value)));
}

export function cadenceStructuralStatus(sourceCount: number, faceCount: number, validCount: number): M0DCadenceSummary["status"] {
  if (sourceCount < 15) return "Unverified / insufficient to judge";
  if (faceCount < 15) return "Unverified / insufficient attribution to estimator";
  if (validCount < 15) return "Structural failure";
  return "Verified";
}

export function cadenceSummary(
  sourceTimestampsMs: readonly number[],
  faceTimestampsMs: readonly number[],
  validTimestampsMs: readonly number[],
): M0DCadenceSummary {
  const source = validNumbers(sourceTimestampsMs);
  const face = validNumbers(faceTimestampsMs);
  const valid = validNumbers(validTimestampsMs);
  const durationSeconds = (timestamps: readonly number[]): number | null => timestamps.length < 2 ? null : (timestamps[timestamps.length - 1]! - timestamps[0]!) / 1000;
  const rate = (timestamps: readonly number[]): number | null => {
    const duration = durationSeconds(timestamps);
    return duration !== null && duration > 0 ? (timestamps.length - 1) / duration : null;
  };
  return {
    sourceCount: source.length,
    faceCount: face.length,
    validCount: valid.length,
    sourceRateHz: rate(source),
    faceRateHz: rate(face),
    validRateHz: rate(valid),
    validRateOfSource: source.length === 0 ? null : valid.length / source.length,
    validRateOfFace: face.length === 0 ? null : valid.length / face.length,
    status: cadenceStructuralStatus(source.length, face.length, valid.length),
  };
}

export function calculateCandidateMetricSummary(input: M0DCandidateMetricInput): M0DCandidateMetricSummary {
  const validCount = input.poseSamples.filter((sample) => validVector(sample.positionMm)).length;
  const nullCount = Math.max(0, input.faceDetectedCount - validCount);
  const rates = validCount > input.faceDetectedCount ? { validRate: null, nullRate: null } : validAndNullOutputRates(validCount, nullCount);
  return {
    stationaryAxisRmsMm: input.stationaryPositionsMm === undefined ? null : stationaryAxisRms(input.stationaryPositionsMm),
    trialMedianPoseMm: input.trialPositionsMm === undefined ? null : trialMedianPose(input.trialPositionsMm),
    repeatabilityRmsMm: input.trialPositionsMm === undefined ? null : repeatabilityRms(input.trialPositionsMm),
    referenceError: referenceError(input.estimatedMovementPositionMm, input.referenceMovementPositionMm),
    relativeMovementError: relativeMovementError(input.estimatedMovementPositionMm, input.referenceMovementPositionMm, input.neutralMovementPositionMm, input.commandedDisplacementMm),
    crossAxisDrift: crossAxisDrift(input.poseSamples.map((sample) => sample.positionMm).filter((position): position is Vec3Mm => validVector(position)), input.neutralMovementPositionMm, input.commandedAxis),
    faceDetectedRate: faceDetectedRate(input.faceDetectedCount, input.sourceTimestampsMs.length),
    validOutputRate: rates.validRate,
    nullOutputRate: rates.nullRate,
    robustOutliers: robustStationaryOutlierSummary(input.poseSamples.map((sample) => sample.positionMm).filter((position): position is Vec3Mm => validVector(position))),
    discontinuity: discontinuitySummary(input.poseSamples),
    processing: processingSummary(input.poseSamples),
    cadence: cadenceSummary(input.sourceTimestampsMs, input.faceTimestampsMs, input.validTimestampsMs),
    calibrationBurden: input.calibrationBurden,
  };
}
