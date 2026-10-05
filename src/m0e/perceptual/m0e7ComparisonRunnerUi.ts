import {
  getM0E7HumanFacingSession,
  M0E7_OBSERVATION_CATEGORIES,
  M0E7_OBSERVATION_PROMPTS,
  recordM0E7Observation,
  setM0E7ComparativeNotes,
  type M0E7DevelopmentSession,
  type M0E7HumanFacingSession,
  type M0E7ObservationCategory,
} from "./m0e7PerceptualComparison";

export interface M0E7ComparisonRuntimeControl {
  activateCandidate(alias: string): void;
  start(): Promise<void>;
  dispose(): Promise<void>;
  getActiveCandidateAlias(): string | null;
}

export type M0E7ComparisonWorkflowState = "active" | "completed" | "cancelled";

export interface M0E7ComparisonWorkflowOptions {
  readonly session: M0E7DevelopmentSession;
  readonly runtime: M0E7ComparisonRuntimeControl;
  readonly onSessionChange?: (session: M0E7DevelopmentSession) => void;
  readonly onComplete?: (session: M0E7DevelopmentSession) => void;
}

export interface M0E7ComparisonProgress {
  readonly alias: string;
  readonly recorded: number;
  readonly total: number;
}

export interface M0E7ComparisonViewModel {
  readonly session: M0E7HumanFacingSession;
  readonly workflowState: M0E7ComparisonWorkflowState;
  readonly activeCandidateAlias: string | null;
  readonly runtimeStarted: boolean;
  readonly operationalError: string | null;
  readonly progress: readonly M0E7ComparisonProgress[];
}

const requiredCategoryCount = M0E7_OBSERVATION_CATEGORIES.length;
const errorText = (error: unknown): string => error instanceof Error ? error.message : String(error);

export class M0E7ComparisonWorkflow {
  private session: M0E7DevelopmentSession;
  private readonly runtime: M0E7ComparisonRuntimeControl;
  private readonly onSessionChange: ((session: M0E7DevelopmentSession) => void) | undefined;
  private readonly onComplete: ((session: M0E7DevelopmentSession) => void) | undefined;
  private activeCandidateAlias: string | null = null;
  private runtimeStarted = false;
  private operationalError: string | null = null;
  private startPromise: Promise<void> | undefined;
  private disposePromise: Promise<void> | undefined;
  private cancelPromise: Promise<M0E7DevelopmentSession> | undefined;
  private workflowState: M0E7ComparisonWorkflowState = "active";

  constructor(options: M0E7ComparisonWorkflowOptions) {
    this.session = options.session;
    this.runtime = options.runtime;
    this.onSessionChange = options.onSessionChange;
    this.onComplete = options.onComplete;
  }

  getViewModel(): M0E7ComparisonViewModel {
    const session = getM0E7HumanFacingSession(this.session);
    return Object.freeze({
      session,
      workflowState: this.workflowState,
      activeCandidateAlias: this.activeCandidateAlias,
      runtimeStarted: this.runtimeStarted,
      operationalError: this.operationalError,
      progress: Object.freeze(session.candidates.map((candidate) => Object.freeze({
        alias: candidate.alias,
        recorded: M0E7_OBSERVATION_CATEGORIES.filter((category) => candidate.observations[category].status !== "unobserved").length,
        total: requiredCategoryCount,
      }))),
    });
  }

  getSession(): M0E7DevelopmentSession {
    return this.session;
  }

  private assertActive(): void {
    if (this.workflowState !== "active") throw new Error(`M0E7 comparison workflow is ${this.workflowState}`);
  }

  selectCandidate(alias: string): void {
    this.assertActive();
    try {
      this.runtime.activateCandidate(alias);
      this.activeCandidateAlias = alias;
      this.operationalError = null;
    } catch (error) {
      this.operationalError = `Candidate activation failed: ${errorText(error)}`;
      throw error;
    }
  }

  start(): Promise<void> {
    this.assertActive();
    if (this.startPromise !== undefined) return this.startPromise;
    this.operationalError = null;
    this.startPromise = this.runtime.start().then(() => {
      this.runtimeStarted = true;
    }).catch((error: unknown) => {
      this.operationalError = `Comparison startup failed: ${errorText(error)}`;
      throw error;
    }).finally(() => {
      this.startPromise = undefined;
    });
    return this.startPromise;
  }

  recordObservation(category: M0E7ObservationCategory, notes = "", status: "observed" | "not-included" = "observed"): void {
    this.assertActive();
    if (this.activeCandidateAlias === null) throw new Error("select a candidate before recording an observation");
    this.session = recordM0E7Observation(this.session, this.activeCandidateAlias, category, status, notes);
    this.onSessionChange?.(this.session);
  }

  setComparativeNotes(notes: string): void {
    this.assertActive();
    this.session = setM0E7ComparativeNotes(this.session, notes);
    this.onSessionChange?.(this.session);
  }

  complete(): boolean {
    if (this.workflowState !== "active") return false;
    if (this.session.completion !== "complete") return false;
    this.workflowState = "completed";
    this.onComplete?.(this.session);
    return true;
  }

  async cancel(): Promise<M0E7DevelopmentSession> {
    if (this.workflowState === "completed" || this.workflowState === "cancelled") return this.session;
    if (this.cancelPromise !== undefined) return this.cancelPromise;
    this.cancelPromise = this.dispose().then(() => {
      this.workflowState = "cancelled";
      this.onSessionChange?.(this.session);
      return this.session;
    });
    return this.cancelPromise;
  }

  dispose(): Promise<void> {
    if (this.disposePromise !== undefined) return this.disposePromise;
    this.disposePromise = this.runtime.dispose();
    return this.disposePromise;
  }
}

function button(label: string, action: () => void): HTMLButtonElement {
  const result = document.createElement("button");
  result.type = "button";
  result.textContent = label;
  result.addEventListener("click", action);
  return result;
}

export function runM0E7ComparisonRunner(host: HTMLElement, options: M0E7ComparisonWorkflowOptions): () => void {
  const workflow = new M0E7ComparisonWorkflow(options);
  const root = document.createElement("section");
  root.setAttribute("aria-label", "M0E7 perceptual comparison workflow");
  const title = document.createElement("h1");
  title.textContent = "M0E7 perceptual comparison";
  const status = document.createElement("p");
  const error = document.createElement("p");
  error.setAttribute("role", "alert");
  const candidates = document.createElement("div");
  const observations = document.createElement("div");
  const comparativeLabel = document.createElement("label");
  comparativeLabel.textContent = "Comparative notes";
  const comparativeNotes = document.createElement("textarea");
  comparativeNotes.addEventListener("input", () => { workflow.setComparativeNotes(comparativeNotes.value); render(); });
  comparativeLabel.append(comparativeNotes);
  const actions = document.createElement("div");
  const startButton = button("Start comparison", () => { void workflow.start().then(render).catch(render); });
  const completeButton = button("Complete comparison", () => { workflow.complete(); render(); });
  const cancelButton = button("Cancel comparison", () => { void workflow.cancel().then(render).catch(render); });
  actions.append(startButton, completeButton, cancelButton);
  root.append(title, status, error, candidates, observations, comparativeLabel, actions);
  host.replaceChildren(root);

  function render(): void {
    const view = workflow.getViewModel();
    status.textContent = `${view.session.completion === "complete" ? "Comparison complete" : "Comparison incomplete"}${view.activeCandidateAlias === null ? "" : ` — Currently viewing: ${view.activeCandidateAlias}`}`;
    error.textContent = view.operationalError ?? "";
    if (view.workflowState === "cancelled") status.textContent = "Comparison cancelled";
    candidates.replaceChildren(...view.session.candidates.map((candidate) => {
      const control = button(candidate.alias, () => { try { workflow.selectCandidate(candidate.alias); render(); } catch { render(); } });
      control.setAttribute("aria-pressed", String(candidate.alias === view.activeCandidateAlias));
      control.disabled = view.workflowState !== "active";
      return control;
    }));
    const active = view.activeCandidateAlias === null ? undefined : view.session.candidates.find((candidate) => candidate.alias === view.activeCandidateAlias);
    observations.replaceChildren();
    if (active !== undefined) {
      for (const category of M0E7_OBSERVATION_CATEGORIES) {
        const prompt = document.createElement("label");
        prompt.textContent = M0E7_OBSERVATION_PROMPTS[category];
        const notes = document.createElement("textarea");
        notes.value = active.observations[category].notes ?? "";
        const observed = button("Observed", () => { try { workflow.recordObservation(category, notes.value, "observed"); render(); } catch { render(); } });
        notes.disabled = view.workflowState !== "active";
        observed.disabled = view.workflowState !== "active";
        prompt.append(notes, observed);
        if (category === "reacquisition-smoothness") {
          const excluded = button("Not included", () => { try { workflow.recordObservation(category, notes.value, "not-included"); render(); } catch { render(); } });
          excluded.disabled = view.workflowState !== "active";
          prompt.append(excluded);
        }
        observations.append(prompt);
      }
    }
    comparativeNotes.value = view.session.comparativeNotes;
    comparativeNotes.disabled = view.workflowState !== "active";
    const progress = view.progress.map((entry) => `${entry.alias}: ${entry.recorded} / ${entry.total} categories recorded`).join("\n");
    status.append(document.createTextNode(progress.length === 0 ? "" : `\n${progress}`));
    startButton.disabled = view.workflowState !== "active" || view.activeCandidateAlias === null || view.runtimeStarted;
    completeButton.disabled = view.workflowState !== "active" || view.session.completion !== "complete";
    cancelButton.disabled = view.workflowState !== "active";
  }

  render();
  return () => { void workflow.dispose(); root.remove(); };
}
