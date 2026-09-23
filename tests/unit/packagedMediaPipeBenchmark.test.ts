import { describe, expect, it } from "vitest";
import { getMediaPipeCameraConfig } from "../../src/mediapipe/packagedMediaPipeBenchmark";

describe("packaged MediaPipe benchmark camera modes", () => {
  it("requests the new 480x270 20 FPS condition directly", () => {
    expect(getMediaPipeCameraConfig("mediapipe-480x270-20hz")).toEqual({ width: 480, height: 270, frameRate: 20 });
  });

  it("preserves the existing active and idle conditions", () => {
    expect(getMediaPipeCameraConfig("mediapipe-24hz")).toEqual({ width: 640, height: 360, frameRate: 24 });
    expect(getMediaPipeCameraConfig("mediapipe-20hz")).toEqual({ width: 640, height: 360, frameRate: 24 });
    expect(getMediaPipeCameraConfig("mediapipe-idle")).toBeNull();
  });
});
