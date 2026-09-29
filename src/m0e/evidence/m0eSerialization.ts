import type { M0EEvidenceBundle, M0EManifest } from "./m0eEvidenceContracts";
import { M0E_DRAFT_VERSION, M0E_EVIDENCE_SCHEMA_VERSION, M0E_EXPERIMENT_PROCEDURE_VERSION, M0E_METRIC_VERSION, M0E_VALIDATOR_VERSION, M0E_REQUIRED_SCENARIO_IDS } from "./m0eEvidenceContracts";
import { enumerateOneEuroGrid } from "../analysis/filterMetrics";
import type { M0EValidationResult } from "./m0eEvidenceValidator";

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

export function serializeM0EEvidenceFiles(bundle: M0EEvidenceBundle, validation: M0EValidationResult): readonly M0EEvidenceFile[] {
  return Object.freeze([
    { relativePath: "manifest.json", contents: `${stable(bundle.manifest)}\n` },
    { relativePath: "validation.json", contents: `${stable(validation)}\n` },
    { relativePath: "calibration/raw-samples.csv", contents: "" },
    { relativePath: "calibration/fit-summary.json", contents: `${stable(bundle.calibration ?? {})}\n` },
    { relativePath: "filtering/stationary-trace.csv", contents: "" },
    { relativePath: "filtering/motion-trace.csv", contents: "" },
    { relativePath: "filtering/sweep-results.json", contents: `${stable(bundle.filtering?.candidates ?? [])}\n` },
    { relativePath: "filtering/shortlist.json", contents: `${stable(bundle.filtering?.shortlistCandidateIds ?? [])}\n` },
    { relativePath: "perceptual-comparison.md", contents: "" },
  ]);
}
