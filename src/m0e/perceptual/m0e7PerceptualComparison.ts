import type { OneEuroCandidateConfiguration } from "../analysis/filterMetrics";
import type { M0E6DevelopmentResult } from "../runner/m0e6SweepRunner";
import { stableM0EJsonStringify } from "../evidence/m0eSerialization";

export const M0E7_OBSERVATION_CATEGORIES = Object.freeze([
  "stationary-vibration-or-swimming",
  "ordinary-head-motion-responsiveness",
  "perceived-lag",
  "reversal-or-rubber-band",
  "depth-responsiveness",
  "reacquisition-smoothness",
  "overall-fixed-window-illusion",
] as const);

export type M0E7ObservationCategory = typeof M0E7_OBSERVATION_CATEGORIES[number];
export type M0E7ObservationStatus = "unobserved" | "observed" | "not-included";
export type M0E7Authority = "fixture" | "provisional";

export const M0E7_OBSERVATION_PROMPTS: Readonly<Record<M0E7ObservationCategory, string>> = Object.freeze({
  "stationary-vibration-or-swimming": "Stationary vibration or swimming",
  "ordinary-head-motion-responsiveness": "Ordinary head-motion responsiveness",
  "perceived-lag": "Perceived lag",
  "reversal-or-rubber-band": "Reversal or rubber-band behavior",
  "depth-responsiveness": "Depth responsiveness",
  "reacquisition-smoothness": "Reacquisition smoothness, where included",
  "overall-fixed-window-illusion": "Overall fixed-window illusion",
});

interface M0E7Observation {
  readonly status: M0E7ObservationStatus;
  readonly acknowledged: boolean;
  readonly notes?: string;
}

export interface M0E7CandidateProvenance {
  readonly alias: string;
  readonly candidateId: string;
  readonly configuration: OneEuroCandidateConfiguration;
}

export interface M0E7DevelopmentSession {
  readonly authority: M0E7Authority;
  readonly claimBearing: false;
  readonly m0e8: "not-started";
  readonly candidateProvenance: readonly M0E7CandidateProvenance[];
  readonly observations: Readonly<Record<string, Readonly<Record<M0E7ObservationCategory, M0E7Observation>>>>;
  readonly comparativeNotes: string;
  readonly completion: "incomplete" | "complete";
}

export interface M0E7HumanFacingCandidate {
  readonly alias: string;
  readonly observations: Readonly<Record<M0E7ObservationCategory, { readonly status: M0E7ObservationStatus; readonly notes?: string }>>;
}

export interface M0E7HumanFacingSession {
  readonly authority: M0E7Authority;
  readonly claimBearing: false;
  readonly m0e8: "not-started";
  readonly candidates: readonly M0E7HumanFacingCandidate[];
  readonly observationPrompts: Readonly<Record<M0E7ObservationCategory, string>>;
  readonly comparativeNotes: string;
  readonly completion: "incomplete" | "complete";
}

export class M0E7SessionValidationError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = "M0E7SessionValidationError";
  }
}

const requiredCategories = M0E7_OBSERVATION_CATEGORIES.filter((category) => category !== "reacquisition-smoothness");
const aliases = (count: number): readonly string[] => Object.freeze(Array.from({ length: count }, (_, index) => `Candidate ${String.fromCharCode(65 + index)}`));
const freezeRecord = <T>(record: Record<string, T>): Readonly<Record<string, T>> => Object.freeze(record);

function validateCategory(category: M0E7ObservationCategory): void {
  if (!M0E7_OBSERVATION_CATEGORIES.includes(category)) throw new M0E7SessionValidationError(`unknown M0E7 observation category: ${category}`);
}

function calculateCompletion(observations: M0E7DevelopmentSession["observations"]): "incomplete" | "complete" {
  const complete = Object.values(observations).every((candidateObservations) => requiredCategories.every((category) => candidateObservations[category].acknowledged) && (candidateObservations["reacquisition-smoothness"].acknowledged || candidateObservations["reacquisition-smoothness"].status === "not-included"));
  return complete ? "complete" : "incomplete";
}

function cloneConfiguration(configuration: OneEuroCandidateConfiguration): OneEuroCandidateConfiguration {
  return Object.freeze({ ...configuration });
}

function cloneObservations(candidateAliases: readonly string[]): M0E7DevelopmentSession["observations"] {
  const result: Record<string, Readonly<Record<M0E7ObservationCategory, M0E7Observation>>> = {};
  for (const alias of candidateAliases) {
    const categoryValues = {} as Record<M0E7ObservationCategory, M0E7Observation>;
    for (const category of M0E7_OBSERVATION_CATEGORIES) categoryValues[category] = Object.freeze({ status: "unobserved", acknowledged: false });
    result[alias] = freezeRecord(categoryValues);
  }
  return freezeRecord(result);
}

export function createM0E7DevelopmentSession(m0e6Result: M0E6DevelopmentResult): M0E7DevelopmentSession {
  if (m0e6Result.frontierStatus !== "shortlist") throw new M0E7SessionValidationError(`M0E7 requires frontierStatus shortlist, received ${m0e6Result.frontierStatus}`);
  if (m0e6Result.paretoFrontier.length < 1 || m0e6Result.paretoFrontier.length > 6) throw new M0E7SessionValidationError("M0E7 requires between one and six Pareto-frontier candidates");
  const configurationById = new Map<string, OneEuroCandidateConfiguration>();
  for (const configuration of m0e6Result.candidateConfigurations) {
    if (configurationById.has(configuration.candidateId)) throw new M0E7SessionValidationError(`duplicate M0E6 candidate ID: ${configuration.candidateId}`);
    configurationById.set(configuration.candidateId, configuration);
  }
  const seenFrontierIds = new Set<string>();
  const candidateAliases = aliases(m0e6Result.paretoFrontier.length);
  const candidateProvenance = m0e6Result.paretoFrontier.map((entry, index) => {
    const candidateId = entry.candidate.candidateId;
    if (seenFrontierIds.has(candidateId)) throw new M0E7SessionValidationError(`duplicate M0E6 frontier candidate ID: ${candidateId}`);
    seenFrontierIds.add(candidateId);
    const configuration = configurationById.get(candidateId);
    if (configuration === undefined || JSON.stringify(configuration) !== JSON.stringify(entry.candidate)) throw new M0E7SessionValidationError(`frontier candidate is not exactly present in M0E6 candidateConfigurations: ${candidateId}`);
    return Object.freeze({ alias: candidateAliases[index]!, candidateId, configuration: cloneConfiguration(configuration) });
  });
  return Object.freeze({ authority: m0e6Result.authority, claimBearing: false, m0e8: "not-started", candidateProvenance: Object.freeze(candidateProvenance), observations: cloneObservations(candidateAliases), comparativeNotes: "", completion: "incomplete" });
}

export function recordM0E7Observation(session: M0E7DevelopmentSession, alias: string, category: M0E7ObservationCategory, status: Exclude<M0E7ObservationStatus, "unobserved">, notes = ""): M0E7DevelopmentSession {
  validateCategory(category);
  if (!session.candidateProvenance.some((candidate) => candidate.alias === alias)) throw new M0E7SessionValidationError(`unknown M0E7 candidate alias: ${alias}`);
  if (status === "not-included" && category !== "reacquisition-smoothness") throw new M0E7SessionValidationError("only reacquisition-smoothness may be marked not-included");
  const candidateObservations: Record<string, Readonly<Record<M0E7ObservationCategory, M0E7Observation>>> = { ...session.observations };
  candidateObservations[alias] = freezeRecord({ ...session.observations[alias]!, [category]: Object.freeze({ status, acknowledged: true, ...(notes.length === 0 ? {} : { notes }) }) });
  const observations = freezeRecord(candidateObservations);
  return Object.freeze({ ...session, observations, completion: calculateCompletion(observations) });
}

export function setM0E7ComparativeNotes(session: M0E7DevelopmentSession, comparativeNotes: string): M0E7DevelopmentSession {
  return Object.freeze({ ...session, comparativeNotes });
}

export function getM0E7HumanFacingSession(session: M0E7DevelopmentSession): M0E7HumanFacingSession {
  return Object.freeze({ authority: session.authority, claimBearing: false, m0e8: "not-started", candidates: Object.freeze(session.candidateProvenance.map(({ alias }) => Object.freeze({ alias, observations: Object.freeze(Object.fromEntries(M0E7_OBSERVATION_CATEGORIES.map((category) => { const observation = session.observations[alias]![category]; return [category, Object.freeze({ status: observation.status, ...(observation.notes === undefined ? {} : { notes: observation.notes }) })]; }))) as M0E7HumanFacingCandidate["observations"] }))), observationPrompts: M0E7_OBSERVATION_PROMPTS, comparativeNotes: session.comparativeNotes, completion: session.completion });
}

export function serializeM0E7DevelopmentSession(session: M0E7DevelopmentSession): string {
  return `${stableM0EJsonStringify(session)}\n`;
}

export function serializeM0E7HumanFacingSession(session: M0E7DevelopmentSession): string {
  return `${stableM0EJsonStringify(getM0E7HumanFacingSession(session))}\n`;
}
