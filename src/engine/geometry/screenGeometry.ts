import type { Millimeters, Vec3Mm } from "../../shared/contracts/primitives";

export type { Millimeters, Vec3Mm } from "../../shared/contracts/primitives";

export interface ScreenGeometry {
  readonly widthMm: Millimeters;
  readonly heightMm: Millimeters;
  readonly centerMm: Vec3Mm;
  readonly lowerLeftMm: Vec3Mm;
  readonly lowerRightMm: Vec3Mm;
  readonly upperLeftMm: Vec3Mm;
  readonly upperRightMm: Vec3Mm;
}

function requireFinite(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
  return value;
}

function requirePositiveDimension(value: Millimeters, name: string): Millimeters {
  requireFinite(value, name);
  if (value <= 0) {
    throw new RangeError(`${name} must be greater than zero`);
  }
  return value;
}

export function createVec3Mm(x: Millimeters, y: Millimeters, z: Millimeters): Vec3Mm {
  return Object.freeze({
    x: requireFinite(x, "x"),
    y: requireFinite(y, "y"),
    z: requireFinite(z, "z"),
  });
}

export function createScreenGeometry(
  widthMm: Millimeters,
  heightMm: Millimeters,
): ScreenGeometry {
  const validWidthMm = requirePositiveDimension(widthMm, "widthMm");
  const validHeightMm = requirePositiveDimension(heightMm, "heightMm");
  const halfWidthMm = validWidthMm / 2;
  const halfHeightMm = validHeightMm / 2;

  return Object.freeze({
    widthMm: validWidthMm,
    heightMm: validHeightMm,
    centerMm: createVec3Mm(0, 0, 0),
    lowerLeftMm: createVec3Mm(-halfWidthMm, -halfHeightMm, 0),
    lowerRightMm: createVec3Mm(halfWidthMm, -halfHeightMm, 0),
    upperLeftMm: createVec3Mm(-halfWidthMm, halfHeightMm, 0),
    upperRightMm: createVec3Mm(halfWidthMm, halfHeightMm, 0),
  });
}
