import { describe, expect, it, vi } from "vitest";
import { M0E7_OBSERVATION_CATEGORIES, createM0E7DevelopmentSession, type M0E7DevelopmentSession } from "../../src/m0e/perceptual/m0e7PerceptualComparison";
import { M0E7ComparisonWorkflow, type M0E7ComparisonRuntimeControl } from "../../src/m0e/perceptual/m0e7ComparisonRunnerUi";
import { M0E6_REQUIRED_NEUTRAL_TRIAL_IDS, runM0E6DevelopmentSweep, type M0E6DevelopmentResult, type M0E6PreparedSample } from "../../src/m0e/runner/m0e6SweepRunner";

const sample = (timestampMs: number, x: number): M0E6PreparedSample => ({ timestampMs, positionMm: { x, y: 0, z: 0 } });
const stationaryTrials = M0E6_REQUIRED_NEUTRAL_TRIAL_IDS.map((trialId) => ({ trialId, settle: [sample(0, 0), sample(10, 0)], capture: Array.from({ length: 20 }, (_, index) => sample(20 + index * 10, index % 2 === 0 ? -1 : 1)) }));
const transitions = (["x", "y", "z"] as const).map((axis) => ({ transitionId: `transition-${axis}`, axis, start: 0, final: 100, samples: Array.from({ length: 80 }, (_, index) => { const value = index < 3 ? 0 : 100; return { timestampMs: index * 10, input: value, positionMm: { x: axis === "x" ? value : 0, y: axis === "y" ? value : 0, z: axis === "z" ? value : 0 } }; }) }));
const fixtureResult: M0E6DevelopmentResult = runM0E6DevelopmentSweep({ authority: "fixture", stationaryTrials, transitions });

function workflowFixture(overrides: Partial<M0E7ComparisonRuntimeControl> = {}, onComplete = vi.fn()) {
  const session = createM0E7DevelopmentSession(fixtureResult);
  const runtime: M0E7ComparisonRuntimeControl = { activateCandidate: vi.fn(), start: vi.fn(async () => undefined), dispose: vi.fn(async () => undefined), getActiveCandidateAlias: vi.fn(() => null), ...overrides };
  const changes: M0E7DevelopmentSession[] = [];
  const workflow = new M0E7ComparisonWorkflow({ session, runtime, onSessionChange: (value) => changes.push(value), onComplete });
  return { workflow, runtime, changes, onComplete };
}

describe("M0E7 comparison workflow", () => {
  it("presents supplied neutral aliases without internal provenance or metrics", () => {
    const { workflow } = workflowFixture();
    const view = workflow.getViewModel();
    expect(view.session.candidates.map(({ alias }) => alias)).toEqual(["Candidate A", "Candidate B", "Candidate C", "Candidate D", "Candidate E"]);
    const rendered = JSON.stringify(view);
    for (const token of ["candidateId", "minCutoffHz", "beta", "dCutoffHz", "jitterObjective", "p95LagMs", "winner", "preferredCandidate", "ranking", "score", "recommendation"]) expect(rendered).not.toContain(token);
  });

  it("requires explicit neutral activation and makes duplicate starts safe", async () => {
    const { workflow, runtime } = workflowFixture();
    workflow.selectCandidate("Candidate B");
    expect(runtime.activateCandidate).toHaveBeenCalledWith("Candidate B");
    await Promise.all([workflow.start(), workflow.start()]);
    expect(runtime.start).toHaveBeenCalledTimes(1);
    expect(workflow.getViewModel().activeCandidateAlias).toBe("Candidate B");
  });

  it("reports startup errors without recording observations", async () => {
    const startupError = new Error("camera unavailable");
    const { workflow, runtime } = workflowFixture({ start: vi.fn(async () => { throw startupError; }) });
    workflow.selectCandidate("Candidate A");
    await expect(workflow.start()).rejects.toBe(startupError);
    expect(workflow.getViewModel().operationalError).toContain("camera unavailable");
    expect(workflow.getSession().observations["Candidate A"]!["perceived-lag"].status).toBe("unobserved");
    expect(runtime.dispose).not.toHaveBeenCalled();
  });

  it("records notes through the authority and preserves them across candidate switching", () => {
    const { workflow, changes } = workflowFixture();
    workflow.selectCandidate("Candidate A");
    workflow.recordObservation("perceived-lag", "  exact note\n");
    workflow.selectCandidate("Candidate B");
    workflow.selectCandidate("Candidate A");
    expect(workflow.getViewModel().session.candidates[0]!.observations["perceived-lag"]).toEqual({ status: "observed", notes: "  exact note\n" });
    expect(changes).toHaveLength(1);
  });

  it("allows not-included only for reacquisition and preserves comparative notes", () => {
    const { workflow } = workflowFixture();
    workflow.selectCandidate("Candidate A");
    workflow.recordObservation("reacquisition-smoothness", "not run", "not-included");
    expect(workflow.getSession().observations["Candidate A"]!["reacquisition-smoothness"].status).toBe("not-included");
    expect(() => workflow.recordObservation("perceived-lag", "", "not-included")).toThrow(/only reacquisition/);
    workflow.setComparativeNotes("Candidate B felt smoother than Candidate A");
    expect(workflow.getSession().comparativeNotes).toBe("Candidate B felt smoother than Candidate A");
  });

  it("delegates completion and rejects incomplete sessions", () => {
    const incomplete = workflowFixture();
    incomplete.workflow.selectCandidate("Candidate A");
    expect(incomplete.workflow.complete()).toBe(false);
    expect(incomplete.onComplete).not.toHaveBeenCalled();

    const complete = workflowFixture();
    for (const { alias } of complete.workflow.getViewModel().session.candidates) {
      complete.workflow.selectCandidate(alias);
      for (const category of M0E7_OBSERVATION_CATEGORIES) complete.workflow.recordObservation(category, "", category === "reacquisition-smoothness" ? "not-included" : "observed");
    }
    expect(complete.workflow.getSession().completion).toBe("complete");
    expect(complete.workflow.complete()).toBe(true);
    expect(complete.workflow.complete()).toBe(false);
    expect(complete.workflow.getViewModel().workflowState).toBe("completed");
    expect(complete.onComplete).toHaveBeenCalledWith(complete.workflow.getSession());
    expect(complete.onComplete).toHaveBeenCalledTimes(1);
    expect(() => complete.workflow.selectCandidate("Candidate A")).toThrow("M0E7 comparison workflow is completed");
    expect(() => complete.workflow.recordObservation("perceived-lag")).toThrow("M0E7 comparison workflow is completed");
    expect(() => complete.workflow.setComparativeNotes("late note")).toThrow("M0E7 comparison workflow is completed");
    expect(() => complete.workflow.start()).toThrow("M0E7 comparison workflow is completed");
  });

  it("disposes on cancellation while retaining the current session", async () => {
    const { workflow, runtime, changes } = workflowFixture();
    workflow.selectCandidate("Candidate A");
    workflow.recordObservation("perceived-lag", "retained");
    const session = await workflow.cancel();
    expect(runtime.dispose).toHaveBeenCalledTimes(1);
    expect(workflow.getViewModel().workflowState).toBe("cancelled");
    expect(session.observations["Candidate A"]!["perceived-lag"].notes).toBe("retained");
    expect(session.completion).toBe("incomplete");
    expect(changes).toHaveLength(2);
    expect(() => workflow.selectCandidate("Candidate B")).toThrow("M0E7 comparison workflow is cancelled");
    expect(() => workflow.recordObservation("perceived-lag")).toThrow("M0E7 comparison workflow is cancelled");
    expect(() => workflow.setComparativeNotes("late note")).toThrow("M0E7 comparison workflow is cancelled");
    expect(() => workflow.start()).toThrow("M0E7 comparison workflow is cancelled");
    expect(workflow.complete()).toBe(false);
    expect(await workflow.cancel()).toBe(session);
    expect(runtime.dispose).toHaveBeenCalledTimes(1);
  });

  it("shares concurrent cancellation and emits one terminal session change", async () => {
    let resolveDispose!: () => void;
    const dispose = vi.fn(() => new Promise<void>((resolve) => { resolveDispose = resolve; }));
    const { workflow, runtime, changes } = workflowFixture({ dispose });
    workflow.selectCandidate("Candidate A");
    const first = workflow.cancel();
    const second = workflow.cancel();
    expect(runtime.dispose).toHaveBeenCalledTimes(1);
    let settled = false;
    void second.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    resolveDispose();
    const sessions = await Promise.all([first, second]);
    expect(sessions[0]).toBe(sessions[1]);
    expect(workflow.getViewModel().workflowState).toBe("cancelled");
    expect(changes).toHaveLength(1);
  });
});
