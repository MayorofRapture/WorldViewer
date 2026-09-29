import type { M0EEvidenceBundle, M0EManifest } from "./m0eEvidenceContracts";
import { M0E_DRAFT_VERSION, M0E_EVIDENCE_SCHEMA_VERSION, M0E_EXPERIMENT_PROCEDURE_VERSION, M0E_METRIC_VERSION, M0E_VALIDATOR_VERSION, M0E_REQUIRED_SCENARIO_IDS } from "./m0eEvidenceContracts";
import { enumerateOneEuroGrid } from "../analysis/filterMetrics";
import type { M0EValidationResult } from "./m0eEvidenceValidator";
import type { M0ECalibrationEvidence, M0EFilterEvidence } from "./m0eEvidenceContracts";

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(",")}}`;
}

export function stableM0EJsonStringify(value: unknown): string {
  return stable(value);
}

export function createM0EManifest(input: Omit<M0EManifest, "schemaVersion" | "draftVersion" | "experimentProcedureVersion" | "evidenceSchemaVersion" | "validatorVersion" | "metricVersion" | "candidateGrid" | "requiredScenarioIds" | "requiredNeutralTrialIds" | "requiredTransitionAxes"> & Partial<Pick<M0EManifest, "requiredScenarioIds" | "requiredNeutralTrialIds" | "requiredTransitionAxes">>): M0EManifest {
  return Object.freeze({ ...input, schemaVersion: M0E_EVIDENCE_SCHEMA_VERSION, draftVersion: M0E_DRAFT_VERSION, experimentProcedureVersion: M0E_EXPERIMENT_PROCEDURE_VERSION, evidenceSchemaVersion: M0E_EVIDENCE_SCHEMA_VERSION, validatorVersion: M0E_VALIDATOR_VERSION, metricVersion: M0E_METRIC_VERSION, requiredScenarioIds: input.requiredScenarioIds ?? M0E_REQUIRED_SCENARIO_IDS, requiredNeutralTrialIds: input.requiredNeutralTrialIds ?? ["neutral-stationary-trial-1", "neutral-stationary-trial-2", "neutral-stationary-trial-3", "neutral-stationary-trial-4", "neutral-stationary-trial-5"], requiredTransitionAxes: input.requiredTransitionAxes ?? (["x", "y", "z"] as const), candidateGrid: enumerateOneEuroGrid() });
}

export function serializeM0EEvidenceBundle(bundle: M0EEvidenceBundle): string {
  return `${stable(bundle)}\n`;
}

export interface M0EEvidenceFile {
  readonly relativePath: string;
  readonly contents: string;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(rows: readonly (readonly unknown[])[]): string {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function calibrationCsv(calibration: M0ECalibrationEvidence | undefined): string {
  const rows: (readonly unknown[])[] = [["axis", "target", "observationId", "measuredTargetMm", "measuredCenterMm", "measuredMm"]];
  for (const axis of ["x", "y", "z"] as const) for (const observation of calibration?.observations[axis] ?? []) {
    if (axis === "z") { const value = observation as M0ECalibrationEvidence["observations"]["z"][number]; rows.push([axis, value.targetMm, value.holdId, "", "", value.measuredMm]); }
    else { const value = observation as M0ECalibrationEvidence["observations"]["x"][number]; rows.push([axis, value.targetDisplacementMm, value.cycleId, value.measuredTargetMm, value.measuredCenterMm, ""]); }
  }
  return csv(rows);
}

function stationaryCsv(filter: M0EFilterEvidence | undefined): string {
  const rows: (readonly unknown[])[] = [["trialId", "phase", "index", "x", "y", "z", "timestampMs"]];
  for (const trial of filter?.stationaryTrialInputs ?? []) {
    for (const [phase, positions] of [["settle", trial.settle], ["capture", trial.capture]] as const) for (const [index, position] of positions.entries()) rows.push([trial.trialId, phase, index, position.x, position.y, position.z, trial.rawSamples?.find((sample) => sample.phase === phase)?.raw.timestampMs ?? ""]);
  }
  return csv(rows);
}

function motionCsv(filter: M0EFilterEvidence | undefined): string {
  const rows: (readonly unknown[])[] = [["transitionId", "axis", "index", "timestampMs", "input", "output", "x", "y", "z"]];
  for (const transition of filter?.transitionInputs ?? []) for (const [index, sample] of transition.samples.entries()) rows.push([transition.transitionId, transition.axis, index, sample.timestampMs, sample.input, sample.output, sample.filteredPositionMm.x, sample.filteredPositionMm.y, sample.filteredPositionMm.z]);
  return csv(rows);
}

export function serializeM0EEvidenceFiles(bundle: M0EEvidenceBundle, validation: M0EValidationResult): readonly M0EEvidenceFile[] {
  return Object.freeze([
    { relativePath: "manifest.json", contents: `${stable(bundle.manifest)}\n` },
    { relativePath: "validation.json", contents: `${stable(validation)}\n` },
    { relativePath: "calibration/raw-samples.csv", contents: calibrationCsv(bundle.calibration) },
    { relativePath: "calibration/fit-summary.json", contents: `${stable(bundle.calibration ?? {})}\n` },
    { relativePath: "filtering/stationary-trace.csv", contents: stationaryCsv(bundle.filtering) },
    { relativePath: "filtering/motion-trace.csv", contents: motionCsv(bundle.filtering) },
    { relativePath: "filtering/sweep-results.json", contents: `${stable(bundle.filtering?.candidates ?? [])}\n` },
    { relativePath: "filtering/shortlist.json", contents: `${stable(bundle.filtering?.shortlistCandidateIds ?? [])}\n` },
    { relativePath: "perceptual-comparison.md", contents: "# M0E7 perceptual comparison\n\nNot yet collected; claim-bearing human evidence remains unexecuted.\n" },
  ]);
}
