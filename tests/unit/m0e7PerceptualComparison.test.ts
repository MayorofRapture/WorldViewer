import { describe, expect, it } from "vitest";
import { type CandidateObjective } from "../../src/m0e/analysis/filterMetrics";
import { createM0E7DevelopmentSession, getM0E7HumanFacingSession, M0E7_OBSERVATION_CATEGORIES, M0E7SessionValidationError, recordM0E7Observation, serializeM0E7DevelopmentSession, serializeM0E7HumanFacingSession, setM0E7ComparativeNotes, type M0E7DevelopmentSession } from "../../src/m0e/perceptual/m0e7PerceptualComparison";
import { M0E6_REQUIRED_NEUTRAL_TRIAL_IDS, runM0E6DevelopmentSweep, type M0E6DevelopmentResult, type M0E6PreparedSample } from "../../src/m0e/runner/m0e6SweepRunner";

const sample = (timestampMs: number, x: number, y = 0, z = 0): M0E6PreparedSample => ({ timestampMs, positionMm: { x, y, z } });
const stationaryTrials = M0E6_REQUIRED_NEUTRAL_TRIAL_IDS.map((trialId) => ({ trialId, settle: [sample(0, 0), sample(10, 0)], capture: Array.from({ length: 20 }, (_, index) => sample(20 + index * 10, index % 2 === 0 ? -1 : 1)) }));
const transitionInputs = (["x", "y", "z"] as const).map((axis) => ({ transitionId: `transition-${axis}`, axis, start: 0, final: 100, samples: Array.from({ length: 80 }, (_, index) => { const value = index < 3 ? 0 : 100; return { timestampMs: index * 10, input: value, positionMm: { x: axis === "x" ? value : 0, y: axis === "y" ? value : 0, z: axis === "z" ? value : 0 } }; }) }));

function runnerResult(): M0E6DevelopmentResult {
  return runM0E6DevelopmentSweep({ authority: "fixture", stationaryTrials, transitions: transitionInputs });
}

const genuineResult = runnerResult();

function result(): M0E6DevelopmentResult {
  return JSON.parse(JSON.stringify(genuineResult)) as M0E6DevelopmentResult;
}

function withCandidate(value: M0E6DevelopmentResult, index: number, change: (candidate: CandidateObjective) => CandidateObjective): M0E6DevelopmentResult {
  return { ...value, candidates: value.candidates.map((candidate, candidateIndex) => candidateIndex === index ? change(candidate) : candidate) };
}

describe("M0E7 development perceptual comparison session", () => {
  it("accepts every valid shortlist size and preserves objective-frontier order", () => {
    const session = createM0E7DevelopmentSession(result());
    expect(session.candidateProvenance).toHaveLength(5);
    expect(session.candidateProvenance.map(({ alias }) => alias)).toEqual(["Candidate A", "Candidate B", "Candidate C", "Candidate D", "Candidate E"]);
  });

  it("rejects no-shortlist and requires-stronger-review results", () => {
    const noShortlist = result();
    expect(() => createM0E7DevelopmentSession({ ...noShortlist, candidates: noShortlist.candidates.map((candidate) => ({ ...candidate, eligible: false, jitterObjective: null, p95LagMs: null })), paretoFrontier: [], frontierStatus: "no-shortlist" })).toThrow(/candidates do not match/);
    expect(() => createM0E7DevelopmentSession({ ...result(), frontierStatus: "requires-stronger-review" })).toThrow(/status/);
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
    const tampered = withCandidate(base, 0, (candidate) => ({ ...candidate, eligible: false, jitterObjective: null, p95LagMs: null }));
    expect(() => createM0E7DevelopmentSession({ ...tampered, paretoFrontier: [], frontierStatus: "no-shortlist" })).toThrow(/candidates do not match/);
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: [base.paretoFrontier[0]!, base.paretoFrontier[0]!] })).toThrow(/Frontier|frontier/);
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: [...base.paretoFrontier, base.candidates[5]!] })).toThrow(/paretoFrontier/);
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: base.paretoFrontier.slice(0, 1) })).toThrow(/Frontier|frontier/);
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: [base.candidates[2]!, base.candidates[1]!] })).toThrow(/Frontier|frontier/);
    expect(() => createM0E7DevelopmentSession({ ...base, paretoFrontier: [{ ...base.paretoFrontier[0]!, candidate: { ...base.paretoFrontier[0]!.candidate, candidateId: "substitute" } }, base.paretoFrontier[1]!] })).toThrow(/Frontier|frontier/);
    expect(() => createM0E7DevelopmentSession({ ...base, frontierStatus: "no-shortlist" })).toThrow(/status/);
    expect(() => createM0E7DevelopmentSession({ ...base, frontierStatus: "requires-stronger-review" })).toThrow(/status/);
    expect(() => createM0E7DevelopmentSession(withCandidate(base, 1, (candidate) => ({ ...candidate, p95LagMs: 100 })))).toThrow(/candidates do not match/);
  });

  it("uses semantic configuration equality and stable serialization", () => {
    const source = result();
    const before = JSON.stringify(source);
    const parsed = JSON.parse(JSON.stringify(source)) as M0E6DevelopmentResult;
    const reordered: M0E6DevelopmentResult = { ...parsed, candidates: parsed.candidates.map((entry) => ({ ...entry, candidate: { candidateId: entry.candidate.candidateId, beta: entry.candidate.beta, dCutoffHz: entry.candidate.dCutoffHz, minCutoffHz: entry.candidate.minCutoffHz } })), paretoFrontier: parsed.paretoFrontier.map((entry) => ({ ...entry, candidate: { candidateId: entry.candidate.candidateId, beta: entry.candidate.beta, dCutoffHz: entry.candidate.dCutoffHz, minCutoffHz: entry.candidate.minCutoffHz } })) };
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
    expect(() => createM0E7DevelopmentSession({ ...result(), stationaryReplayInputs: [] })).toThrow(/cannot be independently regenerated/);
    const replayBase = result();
    const replayTampered: M0E6DevelopmentResult = { ...replayBase, stationaryReplayInputs: replayBase.stationaryReplayInputs.map((trial, trialIndex) => trialIndex === 0 ? { ...trial, capture: trial.capture.map((capture, captureIndex) => captureIndex === 0 ? { ...capture, positionMm: { ...capture.positionMm, x: 99 } } : capture) } : trial) };
    expect(() => createM0E7DevelopmentSession(replayTampered)).toThrow(/candidates do not match/);
  });

  it("allows not-included only for reacquisition, preserves notes, and completes all candidates explicitly", () => {
    let session: M0E7DevelopmentSession = createM0E7DevelopmentSession(result());
    session = recordM0E7Observation(session, "Candidate A", "perceived-lag", "observed", "  exact note\nwith spacing  ");
    expect(getM0E7HumanFacingSession(session).candidates[0]!.observations["perceived-lag"]).toEqual({ status: "observed", notes: "  exact note\nwith spacing  " });
    for (const category of M0E7_OBSERVATION_CATEGORIES) session = recordM0E7Observation(session, "Candidate A", category, category === "reacquisition-smoothness" ? "not-included" : "observed");
    expect(session.completion).toBe("incomplete");
    for (const alias of session.candidateProvenance.slice(1).map(({ alias }) => alias)) for (const category of M0E7_OBSERVATION_CATEGORIES) session = recordM0E7Observation(session, alias, category, "observed");
    expect(session.completion).toBe("complete");
  });

  it("keeps human projection neutral and excludes preference fields", () => {
    const session = createM0E7DevelopmentSession(result());
    const rendered = serializeM0E7HumanFacingSession(session);
    expect(rendered).toContain("Candidate A");
    for (const token of ["candidateId", "minCutoffHz", "beta", "dCutoffHz", "jitterObjective", "p95LagMs", "winner", "recommendedCandidate", "automaticPreference"]) expect(rendered).not.toContain(token);
    expect(setM0E7ComparativeNotes(session, "notes").comparativeNotes).toBe("notes");
  });
});
