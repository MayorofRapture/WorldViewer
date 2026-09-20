import { createVec3Mm } from "../geometry/screenGeometry";
import type { RawViewerPose } from "./SyntheticViewerPoseSource";

export type SyntheticMotionScriptId =
  | "centered-hold"
  | "lateral-left-to-right"
  | "vertical-down-to-up"
  | "approach-retreat"
  | "asymmetric-x-y";

export interface SyntheticMotionScript {
  readonly id: SyntheticMotionScriptId;
  readonly samples: readonly RawViewerPose[];
}

function sample(timestampMs: number, xMm: number, yMm: number, zMm: number): RawViewerPose {
  return Object.freeze({
    timestampMs,
    positionMm: createVec3Mm(xMm, yMm, zMm),
    confidence: 1,
    estimatorId: "synthetic-motion-script",
  });
}

function script(id: SyntheticMotionScriptId, samples: readonly RawViewerPose[]): SyntheticMotionScript {
  return Object.freeze({ id, samples: Object.freeze(samples.slice()) });
}

export const SYNTHETIC_MOTION_SCRIPTS: readonly SyntheticMotionScript[] = Object.freeze([
  script("centered-hold", [
    sample(0, 0, 0, 600),
    sample(100, 0, 0, 600),
    sample(200, 0, 0, 600),
  ]),
  script("lateral-left-to-right", [
    sample(0, -50, 0, 600),
    sample(100, 0, 0, 600),
    sample(200, 50, 0, 600),
  ]),
  script("vertical-down-to-up", [
    sample(0, 0, -50, 600),
    sample(100, 0, 0, 600),
    sample(200, 0, 50, 600),
  ]),
  script("approach-retreat", [
    sample(0, 0, 0, 800),
    sample(100, 0, 0, 600),
    sample(200, 0, 0, 450),
    sample(300, 0, 0, 600),
  ]),
  script("asymmetric-x-y", [
    sample(0, -35, 20, 600),
    sample(100, 0, 0, 600),
    sample(200, 35, -20, 600),
  ]),
]);
