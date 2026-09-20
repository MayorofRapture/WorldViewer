import { describe, expect, it } from "vitest";
import { SyntheticViewerPoseSource } from "../../src/engine/pose/SyntheticViewerPoseSource";
import { SYNTHETIC_MOTION_SCRIPTS } from "../../src/engine/pose/syntheticMotionScripts";

describe("synthetic motion scripts", () => {
  it("provides stable deterministic script IDs", () => {
    expect(SYNTHETIC_MOTION_SCRIPTS.map((script) => script.id)).toEqual([
      "centered-hold",
      "lateral-left-to-right",
      "vertical-down-to-up",
      "approach-retreat",
      "asymmetric-x-y",
    ]);
  });

  it("uses strictly increasing finite canonical pose inputs", () => {
    for (const script of SYNTHETIC_MOTION_SCRIPTS) {
      let previousTimestamp = -1;
      for (const pose of script.samples) {
        expect(pose.timestampMs).toBeGreaterThan(previousTimestamp);
        previousTimestamp = pose.timestampMs;
        expect(Number.isFinite(pose.timestampMs)).toBe(true);
        expect(Number.isFinite(pose.positionMm.x)).toBe(true);
        expect(Number.isFinite(pose.positionMm.y)).toBe(true);
        expect(Number.isFinite(pose.positionMm.z)).toBe(true);
        expect(pose.confidence).toBeGreaterThanOrEqual(0);
        expect(pose.confidence).toBeLessThanOrEqual(1);
        expect(pose.estimatorId).toBe("synthetic-motion-script");
      }
    }
  });

  it("is accepted by SyntheticViewerPoseSource and repeats deterministically", async () => {
    for (const script of SYNTHETIC_MOTION_SCRIPTS) {
      const source = new SyntheticViewerPoseSource(script.samples);
      await source.start();
      const firstRun = script.samples.map((pose) => source.sample(pose.timestampMs));
      await source.stop();
      await source.start();
      const secondRun = script.samples.map((pose) => source.sample(pose.timestampMs));
      expect(secondRun).toEqual(firstRun);
    }
  });

  it("freezes script and pose data", () => {
    expect(Object.isFrozen(SYNTHETIC_MOTION_SCRIPTS)).toBe(true);
    for (const script of SYNTHETIC_MOTION_SCRIPTS) {
      expect(Object.isFrozen(script)).toBe(true);
      expect(Object.isFrozen(script.samples)).toBe(true);
      for (const pose of script.samples) {
        expect(Object.isFrozen(pose)).toBe(true);
        expect(Object.isFrozen(pose.positionMm)).toBe(true);
      }
    }
  });
});
