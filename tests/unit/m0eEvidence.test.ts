import { describe, expect, it } from "vitest";
import { createM0EManifest } from "../../src/m0e/evidence/m0eSerialization";
import { M0E_REQUIRED_FILES } from "../../src/m0e/evidence/m0eEvidenceContracts";
import { validateM0EEvidenceBundle } from "../../src/m0e/evidence/m0eEvidenceValidator";
import { enumerateOneEuroGrid } from "../../src/m0e/analysis/filterMetrics";

describe("M0E evidence contracts", () => {
  it("pins the four frozen versions and exact grid", () => {
    const manifest = createM0EManifest({ sourceCommit: "fixture", sourceM0DRunId: "run-1790638307359", sourceM0DPath: "evidence/m0d/estimator-experiment-v3/run-1790638307359", estimatorId: "mediapipe-facial-transform-v1", estimatorVersion: "v1", estimatorConfigHash: "fnv1a64-825a99daebb20f6c", traceIds: ["trace"], traceContentHashes: ["hash"], calibrationModel: "independent-per-axis-scale-offset", filterPackage: "1eurofilter", filterPackageVersion: "1.3.0" });
    expect(manifest).toMatchObject({ draftVersion: "0.2", experimentProcedureVersion: 1, evidenceSchemaVersion: 1, validatorVersion: 1, metricVersion: 1 });
    expect(manifest.candidateGrid).toEqual(enumerateOneEuroGrid());
  });

  it("rejects missing files, invalid versions, and incomplete candidates deterministically", () => {
    const result = validateM0EEvidenceBundle({ manifest: { schemaVersion: 1, draftVersion: "0.1" }, filesIncluded: M0E_REQUIRED_FILES.slice(0, 1) });
    expect(result.passed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain("invalid-procedure-identity");
    expect(result.failures.map((failure) => failure.code)).toContain("missing-filtering-evidence");
  });

  it("accepts a complete synthetic harness bundle without creating real evidence", () => {
    const grid = enumerateOneEuroGrid();
    const stationaryTrials = Array.from({ length: 5 }, (_, index) => ({ trialId: `trial-${index + 1}`, rms: { x: 1, y: 1, z: 2 }, eligible: true }));
    const candidates = grid.map((candidate, index) => ({ candidate, stationaryTrials, p95LagMs: index < 6 ? 100 - index : 200, invalidOutputCount: 0, eligible: true, jitterObjective: index < 6 ? 1 + index * 0.1 : 2 }));
    const shortlistCandidateIds = candidates.slice(0, 6).map((candidate) => candidate.candidate.candidateId);
    const manifest = createM0EManifest({ sourceCommit: "fixture", sourceM0DRunId: "run-1790638307359", sourceM0DPath: "evidence/m0d/estimator-experiment-v3/run-1790638307359", estimatorId: "mediapipe-facial-transform-v1", estimatorVersion: "v1", estimatorConfigHash: "fnv1a64-825a99daebb20f6c", traceIds: ["trace"], traceContentHashes: ["hash"], calibrationModel: "independent-per-axis-scale-offset", filterPackage: "1eurofilter", filterPackageVersion: "1.3.0" });
    const fit = { axis: "x" as const, scale: 1, offset: 0, residual: { signed: [0], absolute: [0], medianSigned: 0, maxAbsolute: 0 }, repeatability: { center: 0, rms: 0 }, decision: "identity-adequate" as const };
    const result = validateM0EEvidenceBundle({ manifest, filesIncluded: M0E_REQUIRED_FILES, calibration: { axes: { x: fit, y: { ...fit, axis: "y" }, z: { ...fit, axis: "z" } }, decisions: { x: "identity-adequate", y: "identity-adequate", z: "identity-adequate" } }, filtering: { stationaryTrials, transitions: [{ transitionId: "x-1", axis: "x", lagMs: 10, overshootMm: 0, discontinuityMm: [0] }], candidates, shortlistCandidateIds }, m0e7CandidateIds: shortlistCandidateIds });
    expect(result).toMatchObject({ passed: true, failures: [] });
  });
});
