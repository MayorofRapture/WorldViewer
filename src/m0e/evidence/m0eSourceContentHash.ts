import { createHash } from "node:crypto";
import { stableM0DJsonStringify } from "../../m0d/evidence/m0dSerialization";

export interface M0EAuthoritativeSourceArtifacts {
  readonly observationTrace: readonly unknown[];
  readonly selectedEstimatorReplay: readonly unknown[];
}

export interface M0ESourceArtifactValidationFailure {
  readonly code: "invalid-observation-source-content" | "invalid-replay-source-content" | "source-trace-identity-mismatch" | "invalid-authoritative-source-content";
  readonly path: string;
  readonly message: string;
}

export type M0EValidatedSourceArtifacts =
  | { readonly ok: true; readonly artifacts: M0EAuthoritativeSourceArtifacts; readonly traceIds: readonly string[] }
  | { readonly ok: false; readonly failure: M0ESourceArtifactValidationFailure };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(code: M0ESourceArtifactValidationFailure["code"], path: string, message: string): M0EValidatedSourceArtifacts {
  return { ok: false, failure: Object.freeze({ code, path, message }) };
}

export function validateM0EAuthoritativeSourceArtifacts(artifacts: M0EAuthoritativeSourceArtifacts): M0EValidatedSourceArtifacts {
  const observationTraceIds = new Set<string>();
  for (const [index, row] of artifacts.observationTrace.entries()) {
    if (!record(row)) return failure("invalid-observation-source-content", `observationTrace[${index}]`, "observation source row must be a plain record");
    if (!record(row.envelope)) return failure("invalid-observation-source-content", `observationTrace[${index}].envelope`, "observation source envelope must be a plain record");
    if (typeof row.envelope.traceId !== "string" || row.envelope.traceId.trim().length === 0) return failure("invalid-observation-source-content", `observationTrace[${index}].envelope.traceId`, "observation source traceId must be a non-empty string");
    observationTraceIds.add(row.envelope.traceId);
  }
  const replayTraceIds = new Set<string>();
  for (const [index, row] of artifacts.selectedEstimatorReplay.entries()) {
    if (!record(row)) return failure("invalid-replay-source-content", `selectedEstimatorReplay[${index}]`, "selected estimator replay row must be a plain record");
    if (typeof row.observationTraceId !== "string" || row.observationTraceId.trim().length === 0) return failure("invalid-replay-source-content", `selectedEstimatorReplay[${index}].observationTraceId`, "selected estimator replay observationTraceId must be a non-empty string");
    replayTraceIds.add(row.observationTraceId);
  }
  if (observationTraceIds.size !== replayTraceIds.size || [...observationTraceIds].some((traceId) => !replayTraceIds.has(traceId))) return failure("source-trace-identity-mismatch", "authoritativeSourceArtifacts", "observation and replay source trace ID sets must match exactly");
  try {
    stableM0DJsonStringify(artifacts.observationTrace);
    stableM0DJsonStringify(artifacts.selectedEstimatorReplay);
  } catch (error) {
    return failure("invalid-authoritative-source-content", "authoritativeSourceArtifacts", `authoritative source records must be canonical plain JSON data: ${String(error)}`);
  }
  return Object.freeze({ ok: true, artifacts, traceIds: Object.freeze([...observationTraceIds]) });
}

function requireValidated(artifacts: M0EAuthoritativeSourceArtifacts): Extract<M0EValidatedSourceArtifacts, { readonly ok: true }> {
  const result = validateM0EAuthoritativeSourceArtifacts(artifacts);
  if (!result.ok) throw new TypeError(`${result.failure.code} at ${result.failure.path}: ${result.failure.message}`);
  return result;
}

export function computeM0ETraceContentHashFromValidated(validated: Extract<M0EValidatedSourceArtifacts, { readonly ok: true }>, traceId: string): string {
  if (!validated.traceIds.includes(traceId)) throw new TypeError(`source-trace-identity-mismatch at traceId: trace ID ${traceId} is absent from the authoritative source set`);
  const observationTrace = validated.artifacts.observationTrace.filter((row) => ((row as Record<string, unknown>).envelope as Record<string, unknown>).traceId === traceId);
  const selectedEstimatorReplay = validated.artifacts.selectedEstimatorReplay.filter((row) => (row as Record<string, unknown>).observationTraceId === traceId);
  const payload = { domain: "worldviewer-m0e-source-trace-v1", traceId, observationTrace, selectedEstimatorReplay };
  return `sha256:${createHash("sha256").update(Buffer.from(stableM0DJsonStringify(payload), "utf8")).digest("hex")}`;
}

export function sourceTraceIds(artifacts: M0EAuthoritativeSourceArtifacts): readonly string[] {
  return requireValidated(artifacts).traceIds;
}

export function computeM0ETraceContentHash(traceId: string, artifacts: M0EAuthoritativeSourceArtifacts): string {
  return computeM0ETraceContentHashFromValidated(requireValidated(artifacts), traceId);
}

export function computeM0ETraceContentHashesFromValidated(validated: Extract<M0EValidatedSourceArtifacts, { readonly ok: true }>): readonly string[] {
  return Object.freeze(validated.traceIds.map((traceId) => computeM0ETraceContentHashFromValidated(validated, traceId)));
}

export function computeM0ETraceContentHashes(artifacts: M0EAuthoritativeSourceArtifacts): readonly string[] {
  return computeM0ETraceContentHashesFromValidated(requireValidated(artifacts));
}

export function sourceArtifactsEqual(left: M0EAuthoritativeSourceArtifacts, right: M0EAuthoritativeSourceArtifacts): boolean {
  return stableM0DJsonStringify(left.observationTrace) === stableM0DJsonStringify(right.observationTrace)
    && stableM0DJsonStringify(left.selectedEstimatorReplay) === stableM0DJsonStringify(right.selectedEstimatorReplay);
}
