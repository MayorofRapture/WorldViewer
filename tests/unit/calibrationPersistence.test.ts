import { describe, expect, it } from "vitest";
import { createDefaultCalibrationProfile, createDefaultDisplayProfile } from "../../src/shared/contracts/calibration";
import { MemoryCalibrationRepository } from "../../src/engine/calibration/persistence";

describe("M0E profile persistence boundary", () => {
  it("round-trips a paired display/calibration state by stable ID", async () => {
    const repository = new MemoryCalibrationRepository();
    const display = createDefaultDisplayProfile();
    const calibration = createDefaultCalibrationProfile();
    await repository.savePair({ displayProfiles: [display], calibrationProfiles: [calibration] });
    const loaded = await repository.load();
    expect(loaded.displayProfiles[0]?.id).toBe(display.id);
    expect(loaded.calibrationProfiles[0]?.id).toBe(calibration.id);
  });

  it("rejects an orphan update before admission", async () => {
    const repository = new MemoryCalibrationRepository();
    await expect(repository.saveCalibrationProfile(createDefaultCalibrationProfile("orphan", "missing-display"))).rejects.toThrow(/missing display/);
  });
});
