import { createHash } from "node:crypto";
import { stableM0DJsonStringify } from "../../m0d/evidence/m0dSerialization";

export interface M0EAuthoritativeSourceArtifacts {
  readonly observationTrace: readonly unknown[];
  readonly selectedEstimatorReplay: readonly unknown[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sourceTraceIds(artifacts: M0EAuthoritativeSourceArtifacts): readonly string[] {
  return Object.freeze([...new Set(artifacts.observationTrace
    .filter(record)
    .map((row) => record(row.envelope) ? row.envelope.traceId : undefined)
    .filter((traceId): traceId is string => typeof traceId === "string"))]);
}

export function computeM0ETraceContentHash(traceId: string, artifacts: M0EAuthoritativeSourceArtifacts): string {
  const observationTrace = artifacts.observationTrace.filter((row) => record(row) && record(row.envelope) && row.envelope.traceId === traceId);
  const selectedEstimatorReplay = artifacts.selectedEstimatorReplay.filter((row) => record(row) && row.observationTraceId === traceId);
  const payload = { domain: "worldviewer-m0e-source-trace-v1", traceId, observationTrace, selectedEstimatorReplay };
  return `sha256:${createHash("sha256").update(Buffer.from(stableM0DJsonStringify(payload), "utf8")).digest("hex")}`;
}

export function computeM0ETraceContentHashes(artifacts: M0EAuthoritativeSourceArtifacts): readonly string[] {
  return Object.freeze(sourceTraceIds(artifacts).map((traceId) => computeM0ETraceContentHash(traceId, artifacts)));
}

export function sourceArtifactsEqual(left: M0EAuthoritativeSourceArtifacts, right: M0EAuthoritativeSourceArtifacts): boolean {
  return stableM0DJsonStringify(left.observationTrace) === stableM0DJsonStringify(right.observationTrace)
    && stableM0DJsonStringify(left.selectedEstimatorReplay) === stableM0DJsonStringify(right.selectedEstimatorReplay);
}
