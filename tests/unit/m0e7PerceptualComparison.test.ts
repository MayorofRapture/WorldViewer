import { describe, expect, it } from "vitest";
import { enumerateOneEuroGrid, objectiveForCandidate } from "../../src/m0e/analysis/filterMetrics";
import { createM0E7DevelopmentSession, getM0E7HumanFacingSession, M0E7_OBSERVATION_CATEGORIES, M0E7SessionValidationError, recordM0E7Observation, serializeM0E7DevelopmentSession, serializeM0E7HumanFacingSession, setM0E7ComparativeNotes, type M0E7DevelopmentSession } from "../../src/m0e/perceptual/m0e7PerceptualComparison";
import type { M0E6DevelopmentResult } from "../../src/m0e/runner/m0e6SweepRunner";

function result(count: number, status: M0E6DevelopmentResult["frontierStatus"] = "shortlist"): M0E6DevelopmentResult {
  const configurations = enumerateOneEuroGrid().slice(0, Math.max(count, 1));
  const candidates = configurations.map((candidate) => objectiveForCandidate(candidate, [{ trialId: "1", rms: { x: 0, y: 0, z: 0 }, eligible: true }, { trialId: "2", rms: { x: 0, y: 0, z: 0 }, eligible: true }, { trialId: "3", rms: { x: 0, y: 0, z: 0 }, eligible: true }, { trialId: "4", rms: { x: 0, y: 0, z: 0 }, eligible: true }, { trialId: "5", rms: { x: 0, y: 0, z: 0 }, eligible: true }], 1));
  return { authority: "fixture", claimBearing: false, finalFilterSelection: "not-performed", m0e7: "not-started", m0e8: "not-started", candidateConfigurations: configurations, stationaryReplayInputs: [], transitionReplayInputs: [], candidates, paretoFrontier: count === 0 ? [] : candidates, frontierStatus: status };
}

describe("M0E7 development perceptual comparison session", () => {
  it("accepts one through six candidates and rejects invalid sizes or frontier statuses", () => {
    for (const count of [1, 2, 3, 4, 5, 6]) expect(createM0E7DevelopmentSession(result(count)).candidateProvenance).toHaveLength(count);
    expect(() => createM0E7DevelopmentSession(result(0))).toThrow(M0E7SessionValidationError);
    expect(() => createM0E7DevelopmentSession(result(7))).toThrow(M0E7SessionValidationError);
    expect(() => createM0E7DevelopmentSession(result(2, "no-shortlist"))).toThrow(/shortlist/);
    expect(() => createM0E7DevelopmentSession(result(2, "requires-stronger-review"))).toThrow(/shortlist/);
  });

  it("preserves exact frontier order and internal alias-to-candidate configuration provenance", () => {
    const session = createM0E7DevelopmentSession(result(3));
    expect(session.candidateProvenance.map((entry) => entry.alias)).toEqual(["Candidate A", "Candidate B", "Candidate C"]);
    expect(session.candidateProvenance.map((entry) => [entry.alias, entry.candidateId, entry.configuration])).toEqual(result(3).paretoFrontier.map((entry, index) => [`Candidate ${String.fromCharCode(65 + index)}`, entry.candidate.candidateId, entry.candidate]));
  });

  it("rejects frontier insertion, substitution, and duplicate IDs", () => {
    const base = result(2);
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: [...base.paretoFrontier, base.paretoFrontier[0]!] })).toThrow(/duplicate/);
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: [{ ...base.paretoFrontier[0]!, candidate: { ...base.paretoFrontier[0]!.candidate, candidateId: "substitute" } }, base.paretoFrontier[1]!] })).toThrow(/exactly present/);
  });

  it("keeps parameters and IDs out of the human-facing projection", () => {
    const session = createM0E7DevelopmentSession(result(1));
    const rendered = serializeM0E7HumanFacingSession(session);
    expect(rendered).toContain("Candidate A");
    for (const token of ["candidateId", "minCutoffHz", "beta", "dCutoffHz", "jitterObjective", "p95LagMs"]) expect(rendered).not.toContain(token);
    expect(rendered).not.toContain(`Candidate ${session.candidateProvenance[0]!.candidateId}`);
    expect(session.candidateProvenance[0]).toMatchObject({ candidateId: expect.any(String), configuration: expect.objectContaining({ minCutoffHz: expect.any(Number) }) });
  });

  it("provides every frozen category once and preserves explicit human observations", () => {
    const session = createM0E7DevelopmentSession(result(2));
    expect(Object.keys(getM0E7HumanFacingSession(session).observationPrompts)).toEqual([...M0E7_OBSERVATION_CATEGORIES]);
    const updated = recordM0E7Observation(recordM0E7Observation(session, "Candidate A", "perceived-lag", "observed", "A felt immediate"), "Candidate B", "stationary-vibration-or-swimming", "observed", "B swam slightly");
    expect(getM0E7HumanFacingSession(updated).candidates[0]!.observations["perceived-lag"]).toEqual({ status: "observed", notes: "A felt immediate" });
    expect(getM0E7HumanFacingSession(updated).candidates[1]!.observations["stationary-vibration-or-swimming"]).toEqual({ status: "observed", notes: "B swam slightly" });
    const reacquisition = recordM0E7Observation(updated, "Candidate A", "reacquisition-smoothness", "not-included");
    expect(reacquisition.observations["Candidate A"]!["reacquisition-smoothness"].status).toBe("not-included");
    expect(() => recordM0E7Observation(session, "Candidate A", "depth-responsiveness", "not-included")).toThrow(/only reacquisition/);
  });

  it("has no automated preference and reaches completion only through explicit category acknowledgement", () => {
    let session: M0E7DevelopmentSession = createM0E7DevelopmentSession(result(1));
    for (const category of M0E7_OBSERVATION_CATEGORIES) session = recordM0E7Observation(session, "Candidate A", category, category === "reacquisition-smoothness" ? "not-included" : "observed");
    expect(session.completion).toBe("complete");
    expect(Object.keys(session).some((key) => /winner|recommended|score|rank|preference/i.test(key))).toBe(false);
    expect(serializeM0E7DevelopmentSession(session)).not.toMatch(/winner|recommendedCandidate|automaticPreference/);
  });

  it("serializes deterministically and does not mutate the M0E6 source", () => {
    const source = result(2);
    const before = JSON.stringify(source);
    const first = createM0E7DevelopmentSession(source);
    const second = createM0E7DevelopmentSession(JSON.parse(JSON.stringify(source)) as M0E6DevelopmentResult);
    expect(serializeM0E7DevelopmentSession(first)).toBe(serializeM0E7DevelopmentSession(second));
    expect(JSON.stringify(source)).toBe(before);
    expect(serializeM0E7DevelopmentSession(setM0E7ComparativeNotes(first, "notes"))).not.toBe(serializeM0E7DevelopmentSession(first));
  });
});
