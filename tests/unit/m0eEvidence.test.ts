import { describe, expect, it } from "vitest";
import { createM0EManifest } from "../../src/m0e/evidence/m0eSerialization";
import { M0E_REQUIRED_FILES } from "../../src/m0e/evidence/m0eEvidenceContracts";
import { validateM0EEvidenceBundle } from "../../src/m0e/evidence/m0eEvidenceValidator";
import { calculateStationaryTrialMetric, calculateTransitionMetric, enumerateOneEuroGrid } from "../../src/m0e/analysis/filterMetrics";

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
    const stationaryInputs = Array.from({ length: 5 }, (_, index) => ({ trialId: `neutral-stationary-trial-${index + 1}`, settle: [{ x: 0, y: 0, z: 600 }], capture: [{ x: 0, y: 0, z: 600 }, { x: 0, y: 0, z: 600 }] }));
    const stationaryTrials = stationaryInputs.map(calculateStationaryTrialMetric);
    const transitionInput = { transitionId: "lateral-movement-1-negative-neutral", axis: "x" as const, start: 0, final: 10, samples: [{ timestampMs: 0, input: 0, output: 0, filteredPositionMm: { x: 0, y: 0, z: 600 } }, { timestampMs: 10, input: 6, output: 0, filteredPositionMm: { x: 0, y: 0, z: 600 } }, { timestampMs: 20, input: 8, output: 6, filteredPositionMm: { x: 6, y: 0, z: 600 } }, { timestampMs: 30, input: 10, output: 10, filteredPositionMm: { x: 10, y: 0, z: 600 } }, { timestampMs: 40, input: 10, output: 10, filteredPositionMm: { x: 10, y: 0, z: 600 } }, { timestampMs: 50, input: 10, output: 10, filteredPositionMm: { x: 10, y: 0, z: 600 } }] };
    const transitionMetric = calculateTransitionMetric(transitionInput);
    const candidates = grid.map((candidate, index) => ({ candidate, stationaryTrials, stationaryReplayInputs: stationaryInputs, stationaryReplayOutputs: stationaryInputs, transitionReplayInputs: [transitionInput], transitionMetrics: [transitionMetric], p95LagMs: transitionMetric.lagMs, invalidOutputCount: index === 0 ? 0 : 1, eligible: index === 0, jitterObjective: index === 0 ? 0 : null }));
    const shortlistCandidateIds = [candidates[0]!.candidate.candidateId];
    const manifest = createM0EManifest({ sourceCommit: "fixture", sourceM0DRunId: "run-1790638307359", sourceM0DPath: "evidence/m0d/estimator-experiment-v3/run-1790638307359", estimatorId: "mediapipe-facial-transform-v1", estimatorVersion: "v1", estimatorConfigHash: "fnv1a64-825a99daebb20f6c", traceIds: ["trace"], traceContentHashes: ["hash"], calibrationModel: "independent-per-axis-scale-offset", filterPackage: "1eurofilter", filterPackageVersion: "1.3.0" });
    const fit = { axis: "x" as const, scale: 1, offset: 0, residual: { signed: [0, 0, 0, 0, 0, 0], absolute: [0, 0, 0, 0, 0, 0], medianSigned: 0, maxAbsolute: 0 }, repeatability: { center: 0, rms: 0 }, decision: "identity-adequate" as const };
    const xy = [-150, -150, -150, 150, 150, 150].map((targetDisplacementMm, index) => ({ cycleId: String(index), targetDisplacementMm, measuredTargetMm: targetDisplacementMm, measuredCenterMm: 0 }));
    const z = [450, 600, 750].map((targetMm) => ({ holdId: String(targetMm), targetMm: targetMm as 450 | 600 | 750, measuredMm: targetMm }));
    const result = validateM0EEvidenceBundle({ manifest, filesIncluded: M0E_REQUIRED_FILES, calibration: { axes: { x: fit, y: { ...fit, axis: "y" }, z: { ...fit, axis: "z" } }, decisions: { x: "identity-adequate", y: "identity-adequate", z: "identity-adequate" }, observations: { x: xy, y: xy, z } }, filtering: { stationaryTrials, stationaryTrialInputs: stationaryInputs, transitions: [transitionMetric], transitionInputs: [transitionInput], candidates, shortlistCandidateIds }, m0e7CandidateIds: shortlistCandidateIds });
    expect(result).toMatchObject({ passed: true, failures: [] });
  });
});
