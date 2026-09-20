import { describe, expect, it } from "vitest";
import { applyPerspectiveStrength } from "../../src/engine/projection/perspectiveStrength";
import type { Vec3Mm } from "../../src/shared/contracts/primitives";

describe("perspective strength", () => {
  it.each([
    [0, { x: 0, y: 0, z: 600 }],
    [0.5, { x: 50, y: -25, z: 650 }],
    [1, { x: 100, y: -50, z: 700 }],
    [1.5, { x: 150, y: -75, z: 750 }],
  ])("maps strength %s according to the neutral displacement formula", (strength, expected) => {
    const neutralEyeMm: Vec3Mm = Object.freeze({ x: 0, y: 0, z: 600 });
    const effectiveEyeMm: Vec3Mm = Object.freeze({ x: 100, y: -50, z: 700 });

    expect(applyPerspectiveStrength(neutralEyeMm, effectiveEyeMm, strength)).toEqual(expected);
    expect(neutralEyeMm).toEqual({ x: 0, y: 0, z: 600 });
    expect(effectiveEyeMm).toEqual({ x: 100, y: -50, z: 700 });
  });

  it("rejects non-finite strength and non-finite resulting coordinates", () => {
    const neutralEyeMm: Vec3Mm = Object.freeze({ x: 0, y: 0, z: 600 });
    const effectiveEyeMm: Vec3Mm = Object.freeze({ x: 100, y: -50, z: 700 });

    expect(() => applyPerspectiveStrength(neutralEyeMm, effectiveEyeMm, Number.NaN)).toThrow(RangeError);
    expect(() => applyPerspectiveStrength(neutralEyeMm, effectiveEyeMm, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => applyPerspectiveStrength(neutralEyeMm, { x: Number.MAX_VALUE, y: 0, z: 600 }, Number.MAX_VALUE)).toThrow(RangeError);
  });
});
