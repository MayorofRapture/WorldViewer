import { createVec3Mm } from "../geometry/screenGeometry";
import type { Vec3Mm } from "../../shared/contracts/primitives";

export function applyPerspectiveStrength(
  neutralEyeMm: Vec3Mm,
  effectiveEyeMm: Vec3Mm,
  perspectiveStrength: number,
): Vec3Mm {
  if (!Number.isFinite(perspectiveStrength)) {
    throw new RangeError("perspectiveStrength must be finite");
  }

  return createVec3Mm(
    neutralEyeMm.x + perspectiveStrength * (effectiveEyeMm.x - neutralEyeMm.x),
    neutralEyeMm.y + perspectiveStrength * (effectiveEyeMm.y - neutralEyeMm.y),
    neutralEyeMm.z + perspectiveStrength * (effectiveEyeMm.z - neutralEyeMm.z),
  );
}
