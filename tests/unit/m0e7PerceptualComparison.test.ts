import { describe, expect, it } from "vitest";
import { enumerateOneEuroGrid, objectiveForCandidate, type CandidateObjective } from "../../src/m0e/analysis/filterMetrics";
import { createM0E7DevelopmentSession, getM0E7HumanFacingSession, M0E7_OBSERVATION_CATEGORIES, M0E7SessionValidationError, recordM0E7Observation, serializeM0E7DevelopmentSession, serializeM0E7HumanFacingSession, setM0E7ComparativeNotes, type M0E7DevelopmentSession } from "../../src/m0e/perceptual/m0e7PerceptualComparison";
import type { M0E6DevelopmentResult } from "../../src/m0e/runner/m0e6SweepRunner";

const trials = (jitter: number) => Array.from({ length: 5 }, (_, index) => ({ trialId: String(index + 1), rms: { x: jitter * 3, y: 0, z: 0 }, eligible: true }));

function result(frontierCount = 2): M0E6DevelopmentResult {
  const candidateConfigurations = enumerateOneEuroGrid();
  const candidates = candidateConfigurations.map((candidate, index) => objectiveForCandidate(candidate, trials(index < frontierCount ? index + 1 : 10), index < frontierCount ? frontierCount - index : 10));
  return { authority: "fixture", claimBearing: false, finalFilterSelection: "not-performed", m0e7: "not-started", m0e8: "not-started", candidateConfigurations, stationaryReplayInputs: [], transitionReplayInputs: [], candidates, paretoFrontier: candidates.slice(0, frontierCount), frontierStatus: frontierCount > 6 ? "requires-stronger-review" : "shortlist" };
}

function withCandidate(value: M0E6DevelopmentResult, index: number, change: (candidate: CandidateObjective) => CandidateObjective): M0E6DevelopmentResult {
  return { ...value, candidates: value.candidates.map((candidate, candidateIndex) => candidateIndex === index ? change(candidate) : candidate) };
}

describe("M0E7 development perceptual comparison session", () => {
  it("accepts every valid shortlist size and preserves objective-frontier order", () => {
    for (const count of [1, 2, 3, 4, 5, 6]) {
      const session = createM0E7DevelopmentSession(result(count));
      expect(session.candidateProvenance).toHaveLength(count);
      expect(session.candidateProvenance.map(({ alias }) => alias)).toEqual(Array.from({ length: count }, (_, index) => `Candidate ${String.fromCharCode(65 + index)}`));
    }
  });

  it("rejects no-shortlist and requires-stronger-review results", () => {
    const noShortlist = result();
    expect(() => createM0E7DevelopmentSession({ ...noShortlist, candidates: noShortlist.candidates.map((candidate) => ({ ...candidate, eligible: false, jitterObjective: null, p95LagMs: null })), paretoFrontier: [], frontierStatus: "no-shortlist" })).toThrow(/shortlist/);
    expect(() => createM0E7DevelopmentSession(result(7))).toThrow(/shortlist/);
  });

  it("validates the complete frozen grid, objective set, and runtime authority fields", () => {
    const base = result();
    expect(() => createM0E7DevelopmentSession({ ...base, candidateConfigurations: base.candidateConfigurations.slice(0, 24) })).toThrow(/25/);
    expect(() => createM0E7DevelopmentSession({ ...base, candidateConfigurations: [...base.candidateConfigurations, base.candidateConfigurations[0]!] })).toThrow(/25/);
    expect(() => createM0E7DevelopmentSession({ ...base, candidateConfigurations: base.candidateConfigurations.map((candidate, index) => index === 0 ? { ...candidate, minCutoffHz: 99 } : candidate) })).toThrow(/frozen ordered grid/);
    expect(() => createM0E7DevelopmentSession({ ...base, candidateConfigurations: [base.candidateConfigurations[1]!, base.candidateConfigurations[0]!, ...base.candidateConfigurations.slice(2)] })).toThrow(/frozen ordered grid/);
    expect(() => createM0E7DevelopmentSession({ ...base, candidates: base.candidates.slice(0, 24) })).toThrow(/25/);
    expect(() => createM0E7DevelopmentSession({ ...base, candidates: base.candidates.map((candidate, index) => index === 0 ? { ...candidate, candidate: { ...candidate.candidate, candidateId: base.candidates[1]!.candidate.candidateId } } : candidate) })).toThrow(/duplicate/);
    expect(() => createM0E7DevelopmentSession({ ...base, candidates: base.candidates.map((candidate, index) => index === 0 ? { ...candidate, candidate: { ...candidate.candidate, beta: 99 } } : candidate) })).toThrow(/frozen candidate configuration/);
    for (const field of ["claimBearing", "finalFilterSelection", "m0e7", "m0e8", "authority"] as const) expect(() => createM0E7DevelopmentSession({ ...base, [field]: field === "claimBearing" ? true : "invalid" } as unknown as M0E6DevelopmentResult)).toThrow(M0E7SessionValidationError);
  });

  it("requires candidate objectives and frontier to regenerate exactly", () => {
    const base = result();
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: [base.paretoFrontier[0]!, base.paretoFrontier[0]!] })).toThrow(/frontier/);
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: [...base.paretoFrontier, base.candidates[2]!] })).toThrow(/frontier/);
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: base.paretoFrontier.slice(0, 1) })).toThrow(/frontier/);
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: [base.candidates[2]!, base.candidates[1]!] })).toThrow(/frontier/);
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: [{ ...base.paretoFrontier[0]!, candidate: { ...base.paretoFrontier[0]!.candidate, candidateId: "substitute" } }, base.paretoFrontier[1]!] })).toThrow(/frontier/);
    expect(() => createM0E7DevelopmentSession({ ...base, frontierStatus: "no-shortlist" })).toThrow(/status/);
    expect(() => createM0E7DevelopmentSession({ ...base, frontierStatus: "requires-stronger-review" })).toThrow(/status/);
    expect(() => createM0E7DevelopmentSession(withCandidate(base, 1, (candidate) => ({ ...candidate, p95LagMs: 100 })))).toThrow(/frontier/);
  });

  it("uses semantic configuration equality and stable serialization", () => {
    const source = result();
    const before = JSON.stringify(source);
    const parsed = JSON.parse(JSON.stringify(source)) as M0E6DevelopmentResult;
    const reordered: M0E6DevelopmentResult = { ...parsed, candidateConfigurations: parsed.candidateConfigurations.map((candidate) => ({ candidateId: candidate.candidateId, beta: candidate.beta, dCutoffHz: candidate.dCutoffHz, minCutoffHz: candidate.minCutoffHz })), candidates: parsed.candidates.map((entry) => ({ ...entry, candidate: { candidateId: entry.candidate.candidateId, beta: entry.candidate.beta, dCutoffHz: entry.candidate.dCutoffHz, minCutoffHz: entry.candidate.minCutoffHz } })), paretoFrontier: parsed.paretoFrontier.map((entry) => ({ ...entry, candidate: { candidateId: entry.candidate.candidateId, beta: entry.candidate.beta, dCutoffHz: entry.candidate.dCutoffHz, minCutoffHz: entry.candidate.minCutoffHz } })) };
    expect(() => createM0E7DevelopmentSession(reordered)).not.toThrow();
    expect(serializeM0E7DevelopmentSession(createM0E7DevelopmentSession(source))).toBe(serializeM0E7DevelopmentSession(createM0E7DevelopmentSession(reordered)));
    expect(JSON.stringify(source)).toBe(before);
  });

  it("rejects malformed runtime observation states and preserves immutable state", () => {
    const session = createM0E7DevelopmentSession(result());
    const before = JSON.stringify(session);
    expect(() => recordM0E7Observation(session, "Candidate A", "perceived-lag", "unobserved" as never)).toThrow(/status/);
    expect(() => recordM0E7Observation(session, "Candidate A", "perceived-lag", "invalid" as never)).toThrow(/status/);
    expect(() => recordM0E7Observation(session, "Unknown", "perceived-lag", "observed")).toThrow(/alias/);
    expect(() => recordM0E7Observation(session, "Candidate A", "unknown" as never, "observed")).toThrow(/category/);
    expect(() => recordM0E7Observation(session, "Candidate A", "perceived-lag", "not-included")).toThrow(/only reacquisition/);
    expect(JSON.stringify(session)).toBe(before);
  });

  it("allows not-included only for reacquisition, preserves notes, and completes all candidates explicitly", () => {
    let session: M0E7DevelopmentSession = createM0E7DevelopmentSession(result());
    session = recordM0E7Observation(session, "Candidate A", "perceived-lag", "observed", "  exact note\nwith spacing  ");
    expect(getM0E7HumanFacingSession(session).candidates[0]!.observations["perceived-lag"]).toEqual({ status: "observed", notes: "  exact note\nwith spacing  " });
    for (const category of M0E7_OBSERVATION_CATEGORIES) session = recordM0E7Observation(session, "Candidate A", category, category === "reacquisition-smoothness" ? "not-included" : "observed");
    expect(session.completion).toBe("incomplete");
    for (const category of M0E7_OBSERVATION_CATEGORIES) session = recordM0E7Observation(session, "Candidate B", category, "observed");
    expect(session.completion).toBe("complete");
  });

  it("keeps human projection neutral and excludes preference fields", () => {
    const session = createM0E7DevelopmentSession(result(3));
    const rendered = serializeM0E7HumanFacingSession(session);
    expect(rendered).toContain("Candidate A");
    for (const token of ["candidateId", "minCutoffHz", "beta", "dCutoffHz", "jitterObjective", "p95LagMs", "winner", "recommendedCandidate", "automaticPreference"]) expect(rendered).not.toContain(token);
    expect(setM0E7ComparativeNotes(session, "notes").comparativeNotes).toBe("notes");
  });
});
