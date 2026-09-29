export type CalibrationAxis = "x" | "y" | "z";
export type CalibrationDecision = "identity-adequate" | "fitted-correction-supported" | "inconclusive-collection-repeatability-problem" | "architecture-escalation-required";

export interface ResidualSummary {
  readonly signed: readonly number[];
  readonly absolute: readonly number[];
  readonly medianSigned: number;
  readonly maxAbsolute: number;
}

export interface RepeatabilitySummary {
  readonly center: number;
  readonly rms: number;
}

export interface AxisCalibrationFit {
  readonly axis: CalibrationAxis;
  readonly scale: number;
  readonly offset: number;
  readonly residual: ResidualSummary;
  readonly repeatability: RepeatabilitySummary;
  readonly decision: CalibrationDecision;
}

export interface XYCalibrationObservation {
  readonly cycleId: string;
  readonly targetDisplacementMm: number;
  readonly measuredTargetMm: number;
  readonly measuredCenterMm: number;
}

export interface ZCalibrationObservation {
  readonly holdId: string;
  readonly targetMm: 450 | 600 | 750;
  readonly measuredMm: number;
}

export const CALIBRATION_RESIDUAL_TOLERANCE_MM = 20;

function finite(value: number): boolean {
  return Number.isFinite(value);
}

export function median(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError("median requires at least one value");
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function average(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError("average requires at least one value");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function rms(values: readonly number[]): number {
  return Math.sqrt(average(values.map((value) => value * value)));
}

export function residualSummary(corrected: readonly number[], targets: readonly number[]): ResidualSummary {
  if (corrected.length === 0 || corrected.length !== targets.length) throw new RangeError("residual inputs must have equal non-empty lengths");
  const signed = corrected.map((value, index) => value - targets[index]!);
  const absolute = signed.map(Math.abs);
  return Object.freeze({ signed: Object.freeze(signed), absolute: Object.freeze(absolute), medianSigned: median(signed), maxAbsolute: Math.max(...absolute) });
}

export function repeatabilitySummary(corrected: readonly number[]): RepeatabilitySummary {
  const center = median(corrected);
  return Object.freeze({ center, rms: rms(corrected.map((value) => value - center)) });
}

function validFit(scale: number, offset: number): boolean {
  return finite(scale) && scale > 0 && finite(offset);
}

function groupedRepeatability(values: readonly number[], groups: readonly string[]): RepeatabilitySummary {
  const byGroup = new Map<string, number[]>();
  values.forEach((value, index) => {
    const group = groups[index];
    if (group === undefined) throw new RangeError("repeatability groups must match values");
    const entries = byGroup.get(group) ?? [];
    entries.push(value);
    byGroup.set(group, entries);
  });
  const groupSummaries = [...byGroup.values()].map((entries) => repeatabilitySummary(entries));
  return Object.freeze({ center: median(groupSummaries.map((summary) => summary.center)), rms: Math.max(...groupSummaries.map((summary) => summary.rms)) });
}

function identityPasses(residual: ResidualSummary, repeatability: RepeatabilitySummary): boolean {
  return Math.abs(residual.medianSigned) <= CALIBRATION_RESIDUAL_TOLERANCE_MM && repeatability.rms <= CALIBRATION_RESIDUAL_TOLERANCE_MM;
}

function fittedPasses(residual: ResidualSummary, repeatability: RepeatabilitySummary, scale: number, offset: number): boolean {
  return validFit(scale, offset) && residual.absolute.every((value) => value <= CALIBRATION_RESIDUAL_TOLERANCE_MM) && repeatability.rms <= CALIBRATION_RESIDUAL_TOLERANCE_MM;
}

export function fitRelativeAxis(axis: "x" | "y", observations: readonly XYCalibrationObservation[]): AxisCalibrationFit {
  if (observations.length === 0) throw new RangeError("relative calibration requires observations");
  const deltas = observations.map((observation) => observation.measuredTargetMm - observation.measuredCenterMm);
  const targets = observations.map((observation) => observation.targetDisplacementMm);
  const denominator = deltas.reduce((sum, value) => sum + value * value, 0);
  if (!(denominator > 0)) throw new RangeError(`${axis} relative calibration has no measurable movement`);
  const scale = deltas.reduce((sum, value, index) => sum + value * targets[index]!, 0) / denominator;
  const anchor = median(observations.map((observation) => observation.measuredCenterMm));
  const offset = (1 - scale) * anchor;
  const identityResidual = residualSummary(deltas, targets);
  const groups = observations.map((observation) => String(observation.targetDisplacementMm));
  const identityRepeatability = groupedRepeatability(deltas, groups);
  const fitted = observations.map((observation) => scale * (observation.measuredTargetMm - observation.measuredCenterMm));
  const fittedResidual = residualSummary(fitted, targets);
  const fittedRepeatability = groupedRepeatability(fitted, groups);
  const identityOk = identityPasses(identityResidual, identityRepeatability);
  const fittedOk = fittedPasses(fittedResidual, fittedRepeatability, scale, offset);
  return Object.freeze({
    axis,
    scale: identityOk ? 1 : scale,
    offset: identityOk ? 0 : offset,
    residual: identityOk ? identityResidual : fittedResidual,
    repeatability: identityOk ? identityRepeatability : fittedRepeatability,
    decision: identityOk ? "identity-adequate" : fittedOk ? "fitted-correction-supported" : "architecture-escalation-required",
  });
}

export function fitZAxisInitial(observations: readonly ZCalibrationObservation[]): AxisCalibrationFit {
  const outer450 = observations.filter((observation) => observation.targetMm === 450).map((observation) => observation.measuredMm);
  const outer750 = observations.filter((observation) => observation.targetMm === 750).map((observation) => observation.measuredMm);
  const center600 = observations.filter((observation) => observation.targetMm === 600).map((observation) => observation.measuredMm);
  if (outer450.length === 0 || outer750.length === 0 || center600.length === 0) throw new RangeError("Z calibration requires 450, 600, and 750 mm observations");
  const m450 = median(outer450);
  const m750 = median(outer750);
  const denominator = m750 - m450;
  if (!(denominator !== 0)) throw new RangeError("Z outer observations have no measurable depth span");
  const scale = (750 - 450) / denominator;
  const offset = 450 - scale * m450;
  const identityValues = observations.map((observation) => observation.measuredMm);
  const targets = observations.map((observation) => observation.targetMm);
  const identityResidual = residualSummary(identityValues, targets);
  const identityRepeatability = groupedRepeatability(identityValues, observations.map((observation) => String(observation.targetMm)));
  const fittedValues = observations.map((observation) => scale * observation.measuredMm + offset);
  const fittedResidual = residualSummary(fittedValues, targets);
  const fittedRepeatability = groupedRepeatability(fittedValues, observations.map((observation) => String(observation.targetMm)));
  const centerResidual = Math.abs(median(center600.map((value) => scale * value + offset)) - 600);
  const identityOk = identityPasses(identityResidual, identityRepeatability);
  const fittedOk = fittedPasses(fittedResidual, fittedRepeatability, scale, offset) && centerResidual <= CALIBRATION_RESIDUAL_TOLERANCE_MM;
  return Object.freeze({
    axis: "z",
    scale: identityOk ? 1 : scale,
    offset: identityOk ? 0 : offset,
    residual: identityOk ? identityResidual : fittedResidual,
    repeatability: identityOk ? identityRepeatability : fittedRepeatability,
    decision: identityOk ? "identity-adequate" : fittedOk ? "fitted-correction-supported" : "architecture-escalation-required",
  });
}

export function fitZAxisLeastSquares(observations: readonly ZCalibrationObservation[]): { readonly scale: number; readonly offset: number } {
  if (observations.length === 0) throw new RangeError("Z least-squares fit requires observations");
  const measuredMean = average(observations.map((observation) => observation.measuredMm));
  const targetMean = average(observations.map((observation) => observation.targetMm));
  const denominator = observations.reduce((sum, observation) => sum + (observation.measuredMm - measuredMean) ** 2, 0);
  if (!(denominator > 0)) throw new RangeError("Z least-squares fit requires measured variance");
  const scale = observations.reduce((sum, observation) => sum + (observation.measuredMm - measuredMean) * (observation.targetMm - targetMean), 0) / denominator;
  const offset = targetMean - scale * measuredMean;
  if (!validFit(scale, offset)) throw new RangeError("Z least-squares fit must be finite with positive scale");
  return Object.freeze({ scale, offset });
}

export interface PerAxisCalibrationSelection {
  readonly x: { readonly scale: number; readonly offset: number; readonly decision: CalibrationDecision };
  readonly y: { readonly scale: number; readonly offset: number; readonly decision: CalibrationDecision };
  readonly z: { readonly scale: number; readonly offset: number; readonly decision: CalibrationDecision };
}

export function selectPerAxisCalibration(fits: Readonly<Record<CalibrationAxis, AxisCalibrationFit>>): PerAxisCalibrationSelection {
  return Object.freeze({
    x: Object.freeze({ scale: fits.x.scale, offset: fits.x.offset, decision: fits.x.decision }),
    y: Object.freeze({ scale: fits.y.scale, offset: fits.y.offset, decision: fits.y.decision }),
    z: Object.freeze({ scale: fits.z.scale, offset: fits.z.offset, decision: fits.z.decision }),
  });
}
