import { describe, expect, it } from "vitest";
import { SyntheticViewerPoseSource, type RawViewerPose } from "../../src/engine/pose/SyntheticViewerPoseSource";

function pose(timestampMs: number, x: number, y: number, z: number): RawViewerPose {
  return { timestampMs, positionMm: { x, y, z }, confidence: 1, estimatorId: "synthetic-fixture" };
}

describe("SyntheticViewerPoseSource", () => {
  it("requires start and emits the latest scripted canonical pose at or before the timestamp", async () => {
    const source = new SyntheticViewerPoseSource([
      pose(100, 0, 0, 600),
      pose(200, 25, -10, 550),
    ]);

    expect(source.sample(100)).toBeNull();
    await source.start();
    expect(source.sample(50)).toBeNull();
    expect(source.sample(100)?.positionMm).toEqual({ x: 0, y: 0, z: 600 });
    expect(source.sample(150)?.positionMm).toEqual({ x: 0, y: 0, z: 600 });
    expect(source.sample(200)?.positionMm).toEqual({ x: 25, y: -10, z: 550 });
    expect(source.sample(201)).toBeNull();
  });

  it("resets deterministically on start and stops sampling after stop", async () => {
    const source = new SyntheticViewerPoseSource([pose(10, 5, 6, 700)]);

    await source.start();
    const first = source.sample(10);
    await source.stop();
    expect(source.sample(10)).toBeNull();
    await source.start();
    expect(source.sample(10)).toEqual(first);
  });

  it("rejects invalid fixtures and non-monotonic sample times", async () => {
    expect(() => new SyntheticViewerPoseSource([pose(20, 0, 0, 600), pose(20, 1, 0, 600)])).toThrow(RangeError);
    expect(() => new SyntheticViewerPoseSource([{ ...pose(10, 0, 0, 600), confidence: 1.1 }])).toThrow(RangeError);
    expect(() => new SyntheticViewerPoseSource([{ ...pose(10, 0, 0, 600), positionMm: { x: Number.NaN, y: 0, z: 600 } }])).toThrow(RangeError);

    const source = new SyntheticViewerPoseSource([pose(10, 0, 0, 600), pose(20, 0, 0, 600)]);
    await source.start();
    source.sample(20);
    expect(() => source.sample(19)).toThrow(RangeError);
  });

  it("returns immutable repeatable canonical pose values", async () => {
    const source = new SyntheticViewerPoseSource([pose(10, -30, 15, 800)]);
    await source.start();

    const sample = source.sample(10);
    expect(sample?.positionMm).toEqual({ x: -30, y: 15, z: 800 });
    expect(sample && Object.isFrozen(sample)).toBe(true);
    expect(sample && Object.isFrozen(sample.positionMm)).toBe(true);
    expect(source.sample(10)).toEqual(sample);
  });
});
