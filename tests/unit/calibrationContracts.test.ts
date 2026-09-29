import { describe, expect, it } from "vitest";
import { createDefaultCalibrationProfile, createDefaultDisplayProfile, identityCalibrationTransform, validateCalibrationDocuments, validateCalibrationProfile, validateDisplayProfile } from "../../src/shared/contracts/calibration";

const raw = { timestampMs: 100, positionMm: { x: 10, y: -20, z: 600 }, confidence: 0.8, estimatorId: "mediapipe-facial-transform-v1" } as const;

describe("M0E calibration contracts", () => {
  it("creates the reviewed identity defaults and preserves transform metadata", () => {
    const display = createDefaultDisplayProfile();
    const calibration = createDefaultCalibrationProfile();
    const transformed = identityCalibrationTransform.apply(raw, calibration);
    expect(display.perspectiveStrength).toBe(1);
    expect(calibration.poseCorrection).toEqual({ scale: { x: 1, y: 1, z: 1 }, offsetMm: { x: 0, y: 0, z: 0 } });
    expect(transformed).toEqual({ timestampMs: 100, positionMm: { x: 10, y: -20, z: 600 }, confidence: 0.8, estimatorId: raw.estimatorId });
  });

  it("applies independent mixed-axis scale and offset without mutation", () => {
    const calibration = validateCalibrationProfile({
      ...createDefaultCalibrationProfile(),
      poseCorrection: { scale: { x: 2, y: 1, z: 0.5 }, offsetMm: { x: 3, y: -4, z: 5 } },
    });
    expect(identityCalibrationTransform.apply(raw, calibration).positionMm).toEqual({ x: 23, y: -24, z: 305 });
    expect(raw.positionMm).toEqual({ x: 10, y: -20, z: 600 });
  });

  it("rejects unknown fields, unsupported schemas, invalid scale, and unresolved references", () => {
    expect(() => validateDisplayProfile({ ...createDefaultDisplayProfile(), extra: true })).toThrow(/unknown field/);
    expect(() => validateDisplayProfile({ ...createDefaultDisplayProfile(), schemaVersion: 2 })).toThrow(/schemaVersion/);
    expect(() => validateCalibrationProfile({ ...createDefaultCalibrationProfile(), poseCorrection: { scale: { x: 0, y: 1, z: 1 }, offsetMm: { x: 0, y: 0, z: 0 } } })).toThrow(/greater than zero/);
    expect(() => validateCalibrationDocuments({ displayProfiles: { schemaVersion: 1, profiles: [createDefaultDisplayProfile()] }, calibrationProfiles: { schemaVersion: 1, profiles: [] } })).toThrow(/missing calibration/);
  });
});
