import { describe, expect, it } from "vitest";
import { createScreenGeometry, createVec3Mm } from "../../src/engine/geometry/screenGeometry";

describe("canonical screen geometry", () => {
  it("derives the centered screen and its four millimeter corners", () => {
    const geometry = createScreenGeometry(345.4, 194.3);

    expect(geometry.centerMm).toEqual({ x: 0, y: 0, z: 0 });
    expect(geometry.lowerLeftMm).toEqual({ x: -172.7, y: -97.15, z: 0 });
    expect(geometry.lowerRightMm).toEqual({ x: 172.7, y: -97.15, z: 0 });
    expect(geometry.upperLeftMm).toEqual({ x: -172.7, y: 97.15, z: 0 });
    expect(geometry.upperRightMm).toEqual({ x: 172.7, y: 97.15, z: 0 });
  });

  it("preserves width/height symmetry and canonical axis signs", () => {
    const geometry = createScreenGeometry(200, 100);

    expect(geometry.lowerLeftMm.x).toBe(-geometry.lowerRightMm.x);
    expect(geometry.upperLeftMm.x).toBe(-geometry.upperRightMm.x);
    expect(geometry.lowerLeftMm.y).toBe(-geometry.upperLeftMm.y);
    expect(geometry.lowerRightMm.y).toBe(-geometry.upperRightMm.y);
    expect(geometry.lowerLeftMm.z).toBe(0);
    expect(geometry.lowerRightMm.z).toBe(0);
    expect(geometry.upperLeftMm.z).toBe(0);
    expect(geometry.upperRightMm.z).toBe(0);
    expect(geometry.lowerLeftMm.x).toBeLessThan(0);
    expect(geometry.upperRightMm.x).toBeGreaterThan(0);
    expect(geometry.lowerLeftMm.y).toBeLessThan(0);
    expect(geometry.upperRightMm.y).toBeGreaterThan(0);
  });

  it("rejects zero, negative, and non-finite dimensions", () => {
    for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => createScreenGeometry(width, 100)).toThrow(RangeError);
    }
    for (const height of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => createScreenGeometry(100, height)).toThrow(RangeError);
    }
  });

  it("rejects non-finite vector components and freezes geometry values", () => {
    expect(() => createVec3Mm(Number.NaN, 0, 0)).toThrow(RangeError);
    expect(() => createVec3Mm(0, Number.POSITIVE_INFINITY, 0)).toThrow(RangeError);

    const geometry = createScreenGeometry(200, 100);
    expect(Object.isFrozen(geometry)).toBe(true);
    expect(Object.isFrozen(geometry.centerMm)).toBe(true);
    expect(Object.isFrozen(geometry.lowerLeftMm)).toBe(true);
  });
});
