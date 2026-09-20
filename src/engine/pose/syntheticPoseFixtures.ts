import { createVec3Mm } from "../geometry/screenGeometry";
import type { RawViewerPose } from "./SyntheticViewerPoseSource";

export type SyntheticPoseFixtureId =
  | "centered"
  | "left"
  | "right"
  | "up"
  | "down"
  | "near"
  | "far"
  | "asymmetric-x-y";

export interface SyntheticPoseFixture {
  readonly id: SyntheticPoseFixtureId;
  readonly pose: RawViewerPose;
}

function fixture(id: SyntheticPoseFixtureId, xMm: number, yMm: number, zMm: number): SyntheticPoseFixture {
  return Object.freeze({
    id,
    pose: Object.freeze({
      timestampMs: 0,
      positionMm: createVec3Mm(xMm, yMm, zMm),
      confidence: 1,
      estimatorId: "synthetic-fixture",
    }),
  });
}

export const SYNTHETIC_POSE_FIXTURES: readonly SyntheticPoseFixture[] = Object.freeze([
  fixture("centered", 0, 0, 600),
  fixture("left", -50, 0, 600),
  fixture("right", 50, 0, 600),
  fixture("up", 0, 50, 600),
  fixture("down", 0, -50, 600),
  fixture("near", 0, 0, 450),
  fixture("far", 0, 0, 800),
  fixture("asymmetric-x-y", 35, -20, 600),
]);
