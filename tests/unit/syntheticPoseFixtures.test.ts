import { describe, expect, it } from "vitest";
import { SYNTHETIC_POSE_FIXTURES } from "../../src/engine/pose/syntheticPoseFixtures";

describe("synthetic pose fixtures", () => {
  it("provides the required stable scenario set", () => {
    expect(SYNTHETIC_POSE_FIXTURES.map((fixture) => fixture.id)).toEqual([
      "centered",
      "left",
      "right",
      "up",
      "down",
      "near",
      "far",
      "asymmetric-x-y",
    ]);
  });

  it("uses canonical millimeter positions without projection expectations", () => {
    const byId = new Map(SYNTHETIC_POSE_FIXTURES.map((fixture) => [fixture.id, fixture.pose.positionMm]));

    expect(byId.get("centered")).toEqual({ x: 0, y: 0, z: 600 });
    expect(byId.get("left")).toEqual({ x: -50, y: 0, z: 600 });
    expect(byId.get("right")).toEqual({ x: 50, y: 0, z: 600 });
    expect(byId.get("up")).toEqual({ x: 0, y: 50, z: 600 });
    expect(byId.get("down")).toEqual({ x: 0, y: -50, z: 600 });
    expect(byId.get("near")).toEqual({ x: 0, y: 0, z: 450 });
    expect(byId.get("far")).toEqual({ x: 0, y: 0, z: 800 });
    expect(byId.get("asymmetric-x-y")).toEqual({ x: 35, y: -20, z: 600 });
  });

  it("is immutable and valid input for the synthetic source", () => {
    expect(Object.isFrozen(SYNTHETIC_POSE_FIXTURES)).toBe(true);
    for (const fixture of SYNTHETIC_POSE_FIXTURES) {
      expect(Object.isFrozen(fixture)).toBe(true);
      expect(Object.isFrozen(fixture.pose)).toBe(true);
      expect(Object.isFrozen(fixture.pose.positionMm)).toBe(true);
      expect(fixture.pose.timestampMs).toBe(0);
      expect(fixture.pose.confidence).toBe(1);
    }
  });
});
