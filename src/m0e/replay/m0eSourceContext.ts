import type { M0DObservationTraceRecord } from "../../m0d/evidence/m0dEvidenceContracts";
import type { SelectedEstimatorReplayRecord } from "./recordedReplay";

export interface M0EStationaryWindow {
  readonly trialId: string;
  readonly settleTimestampsMs: readonly number[];
  readonly captureTimestampsMs: readonly number[];
}

export interface M0EMotionTransitionWindow {
  readonly transitionId: string;
  readonly axis: "x" | "y" | "z";
  readonly scenarioId: "lateral-movement" | "vertical-movement" | "approach-retreat";
  readonly timestampsMs: readonly number[];
}

export interface M0ESourceContext {
  readonly validReplayRecords: readonly SelectedEstimatorReplayRecord[];
  readonly invalidReplayRecords: readonly SelectedEstimatorReplayRecord[];
  readonly stationaryTrials: readonly M0EStationaryWindow[];
  readonly nearFarStationaryWindows: readonly M0EStationaryWindow[];
  readonly transitions: readonly M0EMotionTransitionWindow[];
}

/** Reconstructs M0E windows from M0D envelope metadata; no timing ranges are hand-coded. */
export function reconstructM0ESourceContext(trace: readonly M0DObservationTraceRecord[], replay: readonly SelectedEstimatorReplayRecord[]): M0ESourceContext {
  const grouped = new Map<string, { scenarioId: string; trialId: string; settle: number[]; capture: number[] }>();
  for (const record of trace) {
    const scenarioId = record.envelope.scenarioId;
    if (!["neutral-stationary", "near-stationary-450", "far-stationary-750"].includes(scenarioId) || typeof record.envelope.trialId !== "string") continue;
    const key = `${scenarioId}|${record.envelope.trialId}`;
    const group = grouped.get(key) ?? { scenarioId, trialId: record.envelope.trialId, settle: [], capture: [] };
    const timestamp = record.observation.timestampMs;
    if (record.envelope.stepKind === "settle") group.settle.push(timestamp);
    if (record.envelope.stepKind === "capture") group.capture.push(timestamp);
    grouped.set(key, group);
  }
  const windows = [...grouped.values()].map((group) => Object.freeze({ trialId: group.trialId, settleTimestampsMs: Object.freeze(group.settle), captureTimestampsMs: Object.freeze(group.capture) }));
  const transitions = trace.filter((record) => record.envelope.stepKind === "transition" && ["lateral-movement", "vertical-movement", "approach-retreat"].includes(record.envelope.scenarioId) && typeof record.envelope.segmentId === "string").reduce((result, record) => {
    const axis = record.envelope.scenarioId === "lateral-movement" ? "x" : record.envelope.scenarioId === "vertical-movement" ? "y" : "z";
    const transitionId = record.envelope.segmentId!;
    const existing = result.get(transitionId) ?? { transitionId, axis, scenarioId: record.envelope.scenarioId as M0EMotionTransitionWindow["scenarioId"], timestampsMs: [] };
    existing.timestampsMs.push(record.observation.timestampMs);
    result.set(transitionId, existing);
    return result;
  }, new Map<string, { transitionId: string; axis: "x" | "y" | "z"; scenarioId: M0EMotionTransitionWindow["scenarioId"]; timestampsMs: number[] }>());
  return Object.freeze({ validReplayRecords: Object.freeze(replay.filter((record) => record.valid)), invalidReplayRecords: Object.freeze(replay.filter((record) => !record.valid)), stationaryTrials: Object.freeze(windows.filter((window) => window.trialId.startsWith("neutral-stationary-trial-"))), nearFarStationaryWindows: Object.freeze(windows.filter((window) => !window.trialId.startsWith("neutral-stationary-trial-"))), transitions: Object.freeze([...transitions.values()].map((transition) => Object.freeze({ ...transition, timestampsMs: Object.freeze(transition.timestampsMs) }))) });
}
