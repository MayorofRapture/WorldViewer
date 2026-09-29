import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalibrationWorkflow } from "../../src/app/calibration/CalibrationWorkflow";
import { MemoryCalibrationRepository } from "../../src/engine/calibration/persistence";

describe("M0E2 calibration workflow", () => {
  it("starts with measured display fields and does not expose filter or estimator controls", () => {
    const markup = renderToStaticMarkup(<CalibrationWorkflow repository={new MemoryCalibrationRepository()} onClose={() => undefined} />);
    expect(markup).toContain("Physical width (mm)");
    expect(markup).toContain("Physical height (mm)");
    expect(markup).not.toContain("minCutoffHz");
    expect(markup).not.toContain("Estimator selection");
    expect(markup).toContain("Calibration progress");
  });
});
