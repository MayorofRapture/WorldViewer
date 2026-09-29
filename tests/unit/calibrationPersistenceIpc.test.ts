import { describe, expect, it, vi } from "vitest";
const invoke = vi.fn().mockResolvedValue(undefined);
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

describe("Tauri calibration write request boundary", () => {
  it("nests both v1 documents under the native documents argument", async () => {
    const { TauriCalibrationRepository } = await import("../../src/engine/calibration/persistence");
    const { createDefaultCalibrationProfile, createDefaultDisplayProfile } = await import("../../src/shared/contracts/calibration");
    const display = createDefaultDisplayProfile();
    const calibration = createDefaultCalibrationProfile();
    await new TauriCalibrationRepository().savePair({ displayProfiles: [display], calibrationProfiles: [calibration] });
    expect(invoke).toHaveBeenCalledWith("write_calibration_documents", { documents: { displayProfiles: { schemaVersion: 1, profiles: [display] }, calibrationProfiles: { schemaVersion: 1, profiles: [calibration] } } });
  });
});
