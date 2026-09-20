export type Point3Mm = readonly [number, number, number];
export type ScreenNdcXY = readonly [number, number];

export function physicalApertureNdcXY(
  screenMm: readonly [number, number],
  eyeMm: Point3Mm,
  worldMm: Point3Mm,
): ScreenNdcXY {
  const [widthMm, heightMm] = screenMm;
  const [ex, ey, ez] = eyeMm;
  const [qx, qy, qz] = worldMm;
  const u = ez / (ez - qz);
  const screenX = ex + u * (qx - ex);
  const screenY = ey + u * (qy - ey);
  return [2 * screenX / widthMm, 2 * screenY / heightMm];
}
