import { Matrix4, WebGLCoordinateSystem } from "three";
import type { Millimeters, Vec3Mm } from "../../shared/contracts/primitives";
import type { ScreenGeometry } from "../geometry/screenGeometry";

export interface OffAxisFrustum {
  readonly left: Millimeters;
  readonly right: Millimeters;
  readonly top: Millimeters;
  readonly bottom: Millimeters;
  readonly near: Millimeters;
  readonly far: Millimeters;
}

function requireFinite(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
  return value;
}

function validateEye(eyeMm: Vec3Mm): Vec3Mm {
  requireFinite(eyeMm.x, "eyeMm.x");
  requireFinite(eyeMm.y, "eyeMm.y");
  requireFinite(eyeMm.z, "eyeMm.z");
  return eyeMm;
}

function validateClipping(nearMm: Millimeters, farMm: Millimeters, eyeZMm: Millimeters): void {
  requireFinite(nearMm, "nearMm");
  requireFinite(farMm, "farMm");
  if (nearMm <= 0) {
    throw new RangeError("nearMm must be greater than zero");
  }
  if (farMm <= nearMm) {
    throw new RangeError("farMm must be greater than nearMm");
  }
  if (eyeZMm <= nearMm) {
    throw new RangeError("eyeMm.z must be greater than nearMm");
  }
}

export function computeOffAxisFrustum(
  screenGeometry: ScreenGeometry,
  eyeMm: Vec3Mm,
  nearMm: Millimeters,
  farMm: Millimeters,
): OffAxisFrustum {
  const validEyeMm = validateEye(eyeMm);
  validateClipping(nearMm, farMm, validEyeMm.z);

  const halfWidthMm = screenGeometry.widthMm / 2;
  const halfHeightMm = screenGeometry.heightMm / 2;

  return Object.freeze({
    left: nearMm * (-halfWidthMm - validEyeMm.x) / validEyeMm.z,
    right: nearMm * (halfWidthMm - validEyeMm.x) / validEyeMm.z,
    bottom: nearMm * (-halfHeightMm - validEyeMm.y) / validEyeMm.z,
    top: nearMm * (halfHeightMm - validEyeMm.y) / validEyeMm.z,
    near: nearMm,
    far: farMm,
  });
}

export function createOffAxisProjectionMatrix(
  screenGeometry: ScreenGeometry,
  eyeMm: Vec3Mm,
  nearMm: Millimeters,
  farMm: Millimeters,
): Matrix4 {
  const frustum = computeOffAxisFrustum(screenGeometry, eyeMm, nearMm, farMm);
  return new Matrix4().makePerspective(
    frustum.left,
    frustum.right,
    frustum.top,
    frustum.bottom,
    frustum.near,
    frustum.far,
    WebGLCoordinateSystem,
    false,
  );
}
