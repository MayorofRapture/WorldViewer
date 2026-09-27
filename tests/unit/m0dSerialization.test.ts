import { describe, expect, it } from "vitest";
import {
  parseM0DJson,
  parseM0DJsonLines,
  serializeM0DJson,
  serializeM0DJsonLines,
  stableM0DJsonStringify,
} from "../../src/m0d/evidence/m0dSerialization";

describe("M0D deterministic serialization", () => {
  it("sorts object keys and normalizes negative zero", () => {
    expect(stableM0DJsonStringify({ z: -0, a: { d: 2, c: 1 } })).toBe('{"a":{"c":1,"d":2},"z":0}');
  });

  it("round-trips JSON and JSONL without media or binary fields", () => {
    const value = { id: "run", values: [1, 2, 3] };
    expect(parseM0DJson<{ id: string }>(serializeM0DJson(value))).toEqual(value);
    expect(parseM0DJsonLines<{ id: string }>(serializeM0DJsonLines([value, { id: "next" }]))).toEqual([value, { id: "next" }]);
  });

  it("rejects non-finite, undefined, and class-instance values", () => {
    expect(() => stableM0DJsonStringify(Number.NaN)).toThrow();
    expect(() => stableM0DJsonStringify({ value: undefined })).toThrow();
    expect(() => stableM0DJsonStringify(new Date(0))).toThrow();
  });
});
