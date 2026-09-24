import type { NormalizedLandmark, TrackingObservation } from "./trackingObservationNormalizer";

export const MATRIX_DIAGNOSTIC_VERSION = "m0d3b-v1";
export const MATRIX_DIAGNOSTIC_REQUIRED_SAMPLES = 3;
export const MATRIX_DIAGNOSTIC_SETTLE_MS = 750;
export const MATRIX_DIAGNOSTIC_CAPTURE_TIMEOUT_MS = 15_000;

export type MatrixDiagnosticPhaseId = "neutral" | "left-asymmetric" | "right-asymmetric" | "near";

export const MATRIX_DIAGNOSTIC_PHASES: readonly MatrixDiagnosticPhaseId[] = [
  "neutral",
  "left-asymmetric",
  "right-asymmetric",
  "near",
];

export type DisplacementBasis = "measured" | "estimated" | "not-provided";

export type MatrixDiagnosticOperatorDeclaration = {
  readonly lateralDirection?: "left" | "right";
  readonly lateralDisplacementMm?: number | null;
  readonly lateralDisplacementBasis?: DisplacementBasis;
  readonly depthDisplacementMm?: number | null;
  readonly depthDisplacementBasis?: DisplacementBasis;
};

export type MatrixDiagnosticSample = {
  readonly phase: MatrixDiagnosticPhaseId;
  readonly sequenceNumber: number;
  readonly timestampMs: number;
  readonly frame: Readonly<{ widthPx: number; heightPx: number }>;
  readonly matrix: Readonly<{ rows: number; columns: number; data: readonly number[] }>;
  readonly landmarks: Readonly<{
    "33": NormalizedLandmark;
    "133": NormalizedLandmark;
    "362": NormalizedLandmark;
    "263": NormalizedLandmark;
    "1"?: NormalizedLandmark;
  }>;
};

export type MatrixDiagnosticPhaseCapture = {
  readonly phase: MatrixDiagnosticPhaseId;
  readonly operatorDeclaration: MatrixDiagnosticOperatorDeclaration;
  readonly samples: readonly MatrixDiagnosticSample[];
  readonly missingFaceCount: number;
  readonly missingMatrixCount: number;
  readonly invalidObservationCount: number;
  readonly validationFailures: readonly MatrixDiagnosticValidationFailure[];
};

export type MatrixDiagnosticValidationFailure = {
  readonly code: string;
  readonly path: string;
  readonly message: string;
};

export type MatrixDiagnosticCaptureStatus = "ready" | "settling" | "capturing" | "complete" | "cancelled" | "incomplete";

export type MatrixDiagnosticCaptureState = {
  readonly status: MatrixDiagnosticCaptureStatus;
  readonly phaseIndex: number;
  readonly phase: MatrixDiagnosticPhaseId | null;
  readonly phaseStartedAtMs: number | null;
  readonly settlingUntilMs: number | null;
  readonly captureDeadlineMs: number | null;
  readonly operatorDeclaration: MatrixDiagnosticOperatorDeclaration | null;
  readonly currentSamples: readonly MatrixDiagnosticSample[];
  readonly missingFaceCount: number;
  readonly missingMatrixCount: number;
  readonly invalidObservationCount: number;
  readonly validationFailures: readonly MatrixDiagnosticValidationFailure[];
  readonly captures: readonly MatrixDiagnosticPhaseCapture[];
  readonly lastTimestampMs: number | null;
  readonly error: string | null;
};

export type MatrixDiagnosticObservation = {
  readonly timestampMs: TrackingObservation["timestampMs"];
  readonly frame: TrackingObservation["frame"];
  readonly face?: TrackingObservation["face"];
  readonly matrixRows: number | null;
  readonly matrixColumns: number | null;
  readonly validationFailure?: MatrixDiagnosticValidationFailure;
};

export type CaptureObservationResult = {
  readonly state: MatrixDiagnosticCaptureState;
  readonly accepted: boolean;
};

function currentPhase(phaseIndex: number): MatrixDiagnosticPhaseId | null {
  return MATRIX_DIAGNOSTIC_PHASES[phaseIndex] ?? null;
}

export function createMatrixDiagnosticCapture(): MatrixDiagnosticCaptureState {
  return {
    status: "ready",
    phaseIndex: 0,
    phase: currentPhase(0),
    phaseStartedAtMs: null,
    settlingUntilMs: null,
    captureDeadlineMs: null,
    operatorDeclaration: null,
    currentSamples: [],
    missingFaceCount: 0,
    missingMatrixCount: 0,
    invalidObservationCount: 0,
    validationFailures: [],
    captures: [],
    lastTimestampMs: null,
    error: null,
  };
}

export function startMatrixDiagnosticCapture(
  state: MatrixDiagnosticCaptureState,
  nowMs: number,
  operatorDeclaration: MatrixDiagnosticOperatorDeclaration,
): MatrixDiagnosticCaptureState {
  if (state.status !== "ready" || state.phase === null) return state;
  return {
    ...state,
    status: "settling",
    phaseStartedAtMs: nowMs,
    settlingUntilMs: nowMs + MATRIX_DIAGNOSTIC_SETTLE_MS,
    captureDeadlineMs: nowMs + MATRIX_DIAGNOSTIC_SETTLE_MS + MATRIX_DIAGNOSTIC_CAPTURE_TIMEOUT_MS,
    operatorDeclaration,
    currentSamples: [],
    missingFaceCount: 0,
    missingMatrixCount: 0,
    invalidObservationCount: 0,
    validationFailures: [],
    lastTimestampMs: null,
    error: null,
  };
}

export function advanceMatrixDiagnosticCapture(state: MatrixDiagnosticCaptureState, nowMs: number): MatrixDiagnosticCaptureState {
  if (state.status === "settling" && state.settlingUntilMs !== null && nowMs >= state.settlingUntilMs) {
    return { ...state, status: "capturing", settlingUntilMs: null };
  }
  if (state.status === "capturing" && state.captureDeadlineMs !== null && nowMs >= state.captureDeadlineMs) {
    return { ...state, status: "incomplete", error: `phase ${state.phase ?? "unknown"} did not produce three qualifying observations before timeout` };
  }
  return state;
}

function sampleFromObservation(
  state: MatrixDiagnosticCaptureState,
  observation: MatrixDiagnosticObservation,
): MatrixDiagnosticSample | null {
  const face = observation.face;
  const matrix = face?.facialTransformMatrix;
  if (face === undefined || matrix === undefined || observation.matrixRows === null || observation.matrixColumns === null) return null;
  const requiredIndices = [33, 133, 362, 263] as const;
  if (requiredIndices.some((index) => face.normalizedLandmarks[index] === undefined)) return null;
  const landmarks = Object.fromEntries(requiredIndices.map((index) => [String(index), face.normalizedLandmarks[index]!])) as MatrixDiagnosticSample["landmarks"];
  const nose = face.normalizedLandmarks[1];
  return {
    phase: state.phase!,
    sequenceNumber: state.currentSamples.length + 1,
    timestampMs: observation.timestampMs,
    frame: { widthPx: observation.frame.widthPx, heightPx: observation.frame.heightPx },
    matrix: { rows: observation.matrixRows, columns: observation.matrixColumns, data: [...matrix] },
    landmarks: nose === undefined ? landmarks : { ...landmarks, "1": nose },
  };
}

export function acceptMatrixDiagnosticObservation(
  state: MatrixDiagnosticCaptureState,
  observation: MatrixDiagnosticObservation,
): CaptureObservationResult {
  if (state.status !== "capturing" || state.phase === null) return { state, accepted: false };
  if (observation.validationFailure !== undefined) {
    return {
      state: {
        ...state,
        invalidObservationCount: state.invalidObservationCount + 1,
        validationFailures: [...state.validationFailures, observation.validationFailure],
      },
      accepted: false,
    };
  }
  if (observation.face === undefined) return { state: { ...state, missingFaceCount: state.missingFaceCount + 1 }, accepted: false };
  if (observation.face.facialTransformMatrix === undefined || observation.matrixRows === null || observation.matrixColumns === null) {
    return { state: { ...state, missingMatrixCount: state.missingMatrixCount + 1 }, accepted: false };
  }
  if (state.lastTimestampMs !== null && observation.timestampMs < state.lastTimestampMs) {
    return { state: { ...state, invalidObservationCount: state.invalidObservationCount + 1 }, accepted: false };
  }
  const sample = sampleFromObservation(state, observation);
  if (sample === null) return { state: { ...state, invalidObservationCount: state.invalidObservationCount + 1 }, accepted: false };
  const currentSamples = [...state.currentSamples, sample];
  const nextTimestamp = observation.timestampMs;
  if (currentSamples.length < MATRIX_DIAGNOSTIC_REQUIRED_SAMPLES) {
    return { state: { ...state, currentSamples, lastTimestampMs: nextTimestamp }, accepted: true };
  }
  const phaseCapture: MatrixDiagnosticPhaseCapture = {
    phase: state.phase,
    operatorDeclaration: state.operatorDeclaration ?? {},
    samples: currentSamples,
    missingFaceCount: state.missingFaceCount,
    missingMatrixCount: state.missingMatrixCount,
    invalidObservationCount: state.invalidObservationCount,
    validationFailures: state.validationFailures,
  };
  const captures = [...state.captures, phaseCapture];
  const nextPhaseIndex = state.phaseIndex + 1;
  const nextPhase = currentPhase(nextPhaseIndex);
  return {
    state: {
      ...state,
      status: nextPhase === null ? "complete" : "ready",
      phaseIndex: nextPhaseIndex,
      phase: nextPhase,
      phaseStartedAtMs: null,
      settlingUntilMs: null,
      captureDeadlineMs: null,
      operatorDeclaration: null,
      currentSamples: [],
      missingFaceCount: 0,
      missingMatrixCount: 0,
      invalidObservationCount: 0,
      validationFailures: [],
      captures,
      lastTimestampMs: nextTimestamp,
    },
    accepted: true,
  };
}

export function cancelMatrixDiagnosticCapture(state: MatrixDiagnosticCaptureState, reason = "operator cancelled capture"): MatrixDiagnosticCaptureState {
  if (state.status === "complete" || state.status === "cancelled") return state;
  return { ...state, status: "cancelled", phase: state.phase, error: reason };
}
