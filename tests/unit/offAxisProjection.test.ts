import { describe, expect, it } from "vitest";
import { createScreenGeometry, type Vec3Mm } from "../../src/engine/geometry/screenGeometry";
import { computeOffAxisFrustum, createOffAxisProjectionMatrix } from "../../src/engine/projection/offAxisProjection";
import { PROJECTION_REFERENCE_CASES } from "../fixtures/projectionReferenceCases";

const FRUSTUM_ABS_EPS_MM = 1e-9;
const MATRIX_ABS_EPS = 1e-9;

function expectClose(actual: number, expected: number, epsilon: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(epsilon);
}

describe("M0B fixed-screen off-axis projection adapter", () => {
  it("matches the frozen frusta and Three.js matrices for all 12 reference cases", () => {
    for (const reference of PROJECTION_REFERENCE_CASES) {
      const screenGeometry = createScreenGeometry(reference.screenMm[0], reference.screenMm[1]);
      const eyeMm: Vec3Mm = Object.freeze({
        x: reference.eyeMm[0],
        y: reference.eyeMm[1],
        z: reference.eyeMm[2],
      });

      const frustum = computeOffAxisFrustum(screenGeometry, eyeMm, reference.nearMm, reference.farMm);
      expectClose(frustum.left, reference.frustumMm.left, FRUSTUM_ABS_EPS_MM);
      expectClose(frustum.right, reference.frustumMm.right, FRUSTUM_ABS_EPS_MM);
      expectClose(frustum.top, reference.frustumMm.top, FRUSTUM_ABS_EPS_MM);
      expectClose(frustum.bottom, reference.frustumMm.bottom, FRUSTUM_ABS_EPS_MM);

      const matrix = createOffAxisProjectionMatrix(screenGeometry, eyeMm, reference.nearMm, reference.farMm);
      reference.projectionElements.forEach((expected, index) => {
        expectClose(matrix.elements[index]!, expected, MATRIX_ABS_EPS);
      });

      expect(screenGeometry).toEqual(createScreenGeometry(reference.screenMm[0], reference.screenMm[1]));
      expect(eyeMm).toEqual({ x: reference.eyeMm[0], y: reference.eyeMm[1], z: reference.eyeMm[2] });
    }
  });

  it("rejects invalid eyes and clipping values without a fallback eye", () => {
    const screenGeometry = createScreenGeometry(600, 400);
    const validEye: Vec3Mm = Object.freeze({ x: 0, y: 0, z: 600 });

    expect(() => computeOffAxisFrustum(screenGeometry, { x: Number.NaN, y: 0, z: 600 }, 50, 5000)).toThrow(RangeError);
    expect(() => computeOffAxisFrustum(screenGeometry, { x: 0, y: Number.POSITIVE_INFINITY, z: 600 }, 50, 5000)).toThrow(RangeError);
    expect(() => computeOffAxisFrustum(screenGeometry, validEye, 0, 5000)).toThrow(RangeError);
    expect(() => computeOffAxisFrustum(screenGeometry, validEye, 50, 50)).toThrow(RangeError);
    expect(() => computeOffAxisFrustum(screenGeometry, { x: 0, y: 0, z: 50 }, 50, 5000)).toThrow(RangeError);
  });
});
