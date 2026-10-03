import { describe, expect, it } from "vitest";
import { allowedM0E5InvalidationReasons, normalizeM0E5InvalidationReason } from "../../src/m0e/runner/m0e5RunnerUi";
import { buildM0E5ProcedureSteps } from "../../src/m0e/runner/m0e5Procedure";

const external = "external-interruption" as const;
const moved = "operator-moved-after-settling-during-stationary-capture" as const;
const step = (scenarioId: "neutral-stationary" | "lateral-movement" | "vertical-movement", kind: "settle" | "capture" | "hold") => buildM0E5ProcedureSteps().find((candidate) => candidate.scenarioId === scenarioId && candidate.kind === kind)!;

describe("M0E5 invalidation reason selection", () => {
  it("allows both reasons only during neutral capture and passes either unchanged", () => {
    const capture = step("neutral-stationary", "capture");
    expect(allowedM0E5InvalidationReasons(capture)).toEqual([external, moved]);
    expect(normalizeM0E5InvalidationReason(capture, external)).toBe(external);
    expect(normalizeM0E5InvalidationReason(capture, moved)).toBe(moved);
  });

  it.each([
    [step("neutral-stationary", "settle"), "neutral settle"],
    [step("lateral-movement", "hold"), "lateral movement"],
    [step("vertical-movement", "hold"), "vertical movement"],
  ])("allows only external interruption during %s", (...args) => {
    const [currentStep] = args;
    expect(allowedM0E5InvalidationReasons(currentStep)).toEqual([external]);
    expect(normalizeM0E5InvalidationReason(currentStep, moved)).toBe(external);
  });

  it("resets a capture-movement selection when switching away from neutral capture", () => {
    const capture = step("neutral-stationary", "capture");
    const settle = step("neutral-stationary", "settle");
    expect(normalizeM0E5InvalidationReason(capture, moved)).toBe(moved);
    expect(normalizeM0E5InvalidationReason(settle, moved)).toBe(external);
  });
});
