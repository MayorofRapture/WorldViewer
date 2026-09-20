import { Matrix4, Vector4, WebGLCoordinateSystem } from "three";
import { describe, expect, it } from "vitest";
import { physicalApertureNdcXY } from "../helpers/projectionApertureOracle";
import { PROJECTION_REFERENCE_CASES, type ProjectionReferenceCase } from "../fixtures/projectionReferenceCases";

const FRUSTUM_ABS_EPS_MM = 1e-9;
const MATRIX_ABS_EPS = 1e-9;
const NDC_ABS_EPS = 1e-10;
const DIRECTION_MARGIN = 1e-6;

function expectClose(actual: number, expected: number, epsilon: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(epsilon);
}

function matrixFor(reference: ProjectionReferenceCase): Matrix4 {
  const { left, right, top, bottom } = reference.frustumMm;
  return new Matrix4().makePerspective(
    left,
    right,
    top,
    bottom,
    reference.nearMm,
    reference.farMm,
    WebGLCoordinateSystem,
    false,
  );
}

function ndcForWorldPoint(matrix: Matrix4, eyeMm: readonly [number, number, number], worldMm: readonly [number, number, number]): [number, number, number] {
  const viewPoint = new Vector4(
    worldMm[0] - eyeMm[0],
    worldMm[1] - eyeMm[1],
    worldMm[2] - eyeMm[2],
    1,
  ).applyMatrix4(matrix);
  return [viewPoint.x / viewPoint.w, viewPoint.y / viewPoint.w, viewPoint.z / viewPoint.w];
}

const screenCorners = (reference: ProjectionReferenceCase): readonly (readonly [number, number, number, number, number])[] => {
  const [widthMm, heightMm] = reference.screenMm;
  return [
    [-widthMm / 2, -heightMm / 2, 0, -1, -1],
    [widthMm / 2, -heightMm / 2, 0, 1, -1],
    [-widthMm / 2, heightMm / 2, 0, -1, 1],
    [widthMm / 2, heightMm / 2, 0, 1, 1],
  ];
};

describe("M0B Class C projection reference oracle", () => {
  it("contains exactly the 12 reviewed literal cases", () => {
    const ids = PROJECTION_REFERENCE_CASES.map((reference) => reference.id);
    expect(ids).toEqual([
      "C01-centered", "C02-left", "C03-right", "C04-down", "C05-up", "C06-close",
      "C07-far", "C08-asym", "C09-compound", "C10-outside", "C11-e590", "C12-near-scale",
    ]);
    expect(new Set(ids).size).toBe(12);
  });

  it("keeps all literal fixture values finite and in the valid domain", () => {
    for (const reference of PROJECTION_REFERENCE_CASES) {
      expect(reference.projectionElements).toHaveLength(16);
      expect([...reference.screenMm, ...reference.eyeMm, reference.nearMm, reference.farMm, ...Object.values(reference.frustumMm), ...reference.projectionElements, ...reference.probeWorldMm, ...reference.probeExpectedNdcXY].every(Number.isFinite)).toBe(true);
      expect(reference.screenMm[0]).toBeGreaterThan(0);
      expect(reference.screenMm[1]).toBeGreaterThan(0);
      expect(reference.nearMm).toBeGreaterThan(0);
      expect(reference.farMm).toBeGreaterThan(reference.nearMm);
      expect(reference.eyeMm[2]).toBeGreaterThan(reference.nearMm);
      expect(Object.isFrozen(reference)).toBe(true);
      expect(Object.isFrozen(reference.projectionElements)).toBe(true);
    }
  });

  it("maps every physical screen corner to its expected NDC corner", () => {
    for (const reference of PROJECTION_REFERENCE_CASES) {
      const matrix = matrixFor(reference);
      for (const [xMm, yMm, zMm, expectedX, expectedY] of screenCorners(reference)) {
        const [actualX, actualY] = ndcForWorldPoint(matrix, reference.eyeMm, [xMm, yMm, zMm]);
        expectClose(actualX, expectedX, NDC_ABS_EPS);
        expectClose(actualY, expectedY, NDC_ABS_EPS);
      }
    }
  });

  it("matches each literal probe with the independent physical-aperture oracle", () => {
    for (const reference of PROJECTION_REFERENCE_CASES) {
      const actual = physicalApertureNdcXY(reference.screenMm, reference.eyeMm, reference.probeWorldMm);
      expectClose(actual[0], reference.probeExpectedNdcXY[0], NDC_ABS_EPS);
      expectClose(actual[1], reference.probeExpectedNdcXY[1], NDC_ABS_EPS);
    }
  });

  it("matches Three r186 makePerspective using literal frustum values", () => {
    for (const reference of PROJECTION_REFERENCE_CASES) {
      const actual = matrixFor(reference).elements;
      reference.projectionElements.forEach((expected, index) => expectClose(actual[index]!, expected, MATRIX_ABS_EPS));
    }
  });

  it("agrees with the independent aperture oracle for transformed probes", () => {
    for (const reference of PROJECTION_REFERENCE_CASES) {
      const [actualX, actualY] = ndcForWorldPoint(matrixFor(reference), reference.eyeMm, reference.probeWorldMm);
      const expected = physicalApertureNdcXY(reference.screenMm, reference.eyeMm, reference.probeWorldMm);
      expectClose(actualX, expected[0], NDC_ABS_EPS);
      expectClose(actualY, expected[1], NDC_ABS_EPS);
    }
  });

  it("matches the WebGL depth convention at near and far for every literal matrix", () => {
    for (const reference of PROJECTION_REFERENCE_CASES) {
      const matrix = matrixFor(reference);
      const nearNdc = ndcForWorldPoint(matrix, reference.eyeMm, [reference.eyeMm[0], reference.eyeMm[1], reference.eyeMm[2] - reference.nearMm])[2];
      const farNdc = ndcForWorldPoint(matrix, reference.eyeMm, [reference.eyeMm[0], reference.eyeMm[1], reference.eyeMm[2] - reference.farMm])[2];
      expectClose(nearNdc, -1, NDC_ABS_EPS);
      expectClose(farNdc, 1, NDC_ABS_EPS);
    }
  });

  it("preserves the reviewed cross-case invariants", () => {
    const byId = new Map(PROJECTION_REFERENCE_CASES.map((reference) => [reference.id, reference]));
    const c01 = byId.get("C01-centered")!;
    const c02 = byId.get("C02-left")!;
    const c03 = byId.get("C03-right")!;
    const c04 = byId.get("C04-down")!;
    const c05 = byId.get("C05-up")!;
    const c06 = byId.get("C06-close")!;
    const c07 = byId.get("C07-far")!;
    const c09 = byId.get("C09-compound")!;
    const c10 = byId.get("C10-outside")!;
    const c12 = byId.get("C12-near-scale")!;

    expectClose(c01.frustumMm.left, -c01.frustumMm.right, FRUSTUM_ABS_EPS_MM);
    expectClose(c01.frustumMm.bottom, -c01.frustumMm.top, FRUSTUM_ABS_EPS_MM);
    expect(c01.projectionElements[8]).toBe(0);
    expect(c01.projectionElements[9]).toBe(0);
    expect(physicalApertureNdcXY(c01.screenMm, c01.eyeMm, [0, 0, -600])).toEqual([0, 0]);

    expect(c02.probeExpectedNdcXY[0]).toBeLessThan(-DIRECTION_MARGIN);
    expect(c03.probeExpectedNdcXY[0]).toBeGreaterThan(DIRECTION_MARGIN);
    expectClose(Math.abs(c02.probeExpectedNdcXY[0]), Math.abs(c03.probeExpectedNdcXY[0]), NDC_ABS_EPS);
    expect(c04.probeExpectedNdcXY[1]).toBeLessThan(-DIRECTION_MARGIN);
    expect(c05.probeExpectedNdcXY[1]).toBeGreaterThan(DIRECTION_MARGIN);
    expect(c06.probeExpectedNdcXY[0]).toBeLessThan(c01.probeExpectedNdcXY[0]);
    expect(c01.probeExpectedNdcXY[0]).toBeLessThan(c07.probeExpectedNdcXY[0]);

    expect(c10.frustumMm.left).toBeLessThan(0);
    expect(c10.frustumMm.right).toBeLessThan(0);
    expect(c10.frustumMm.bottom).toBeLessThan(0);
    expect(c10.frustumMm.top).toBeLessThan(0);

    for (const index of [0, 5, 8, 9]) expectClose(c09.projectionElements[index]!, c12.projectionElements[index]!, MATRIX_ABS_EPS);
    for (const key of ["left", "right", "top", "bottom"] as const) {
      expectClose(c12.frustumMm[key], c09.frustumMm[key] * 2.5, FRUSTUM_ABS_EPS_MM);
    }
    expect(c12.probeExpectedNdcXY).toEqual(c09.probeExpectedNdcXY);
    expect(c12.projectionElements[10]).not.toBe(c09.projectionElements[10]);
    expect(c12.projectionElements[14]).not.toBe(c09.projectionElements[14]);
  });
});
