import type { PerspectiveCamera } from "three";
import type { Millimeters, Vec3Mm } from "../../shared/contracts/primitives";
import type { ScreenGeometry } from "../geometry/screenGeometry";
import { createOffAxisProjectionMatrix } from "./offAxisProjection";

export function applyOffAxisProjectionToCamera(
  camera: PerspectiveCamera,
  screenGeometry: ScreenGeometry,
  eyeMm: Vec3Mm,
  nearMm: Millimeters,
  farMm: Millimeters,
): void {
  const projectionMatrix = createOffAxisProjectionMatrix(screenGeometry, eyeMm, nearMm, farMm);

  camera.position.set(eyeMm.x, eyeMm.y, eyeMm.z);
  camera.up.set(0, 1, 0);
  camera.quaternion.identity();
  camera.near = nearMm;
  camera.far = farMm;
  camera.projectionMatrix.copy(projectionMatrix);
  camera.projectionMatrixInverse.copy(projectionMatrix).invert();
}
