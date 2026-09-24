import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyColumnMajorMatrix, asymmetricMatrix, identityMatrix, reviewedWorldViewerConversion, translationMatrix, zRotationMatrix } from "../fixtures/m0d/matrixConvention";

describe("M0D oracle fixtures", () => {
  it("locks the reviewed expected column-major convention and X/Y/Z conversion", () => {
    expect(applyColumnMajorMatrix(identityMatrix, [1, 2, 3])).toEqual([1, 2, 3, 1]);
    expect(applyColumnMajorMatrix(translationMatrix, [1, 2, 3])).toEqual([11, 22, 33, 1]);
    expect(applyColumnMajorMatrix(zRotationMatrix, [1, 2, 3])).toEqual([-2, 1, 3, 1]);
    expect(applyColumnMajorMatrix(asymmetricMatrix, [1, 2, 3])).toEqual([134, 159, 179, 209]);
    expect(reviewedWorldViewerConversion([1, 2, 3, 1])).toEqual([-10, 20, -30]);
  });

  it("re-derives canonical constants from the pinned task artifact", () => {
    const directory = mkdtempSync(join(tmpdir(), "worldviewer-m0d-canonical-"));
    const output = join(directory, "canonical.json");
    try {
      execFileSync("node", ["scripts/derive-mediapipe-canonical-face-model.mjs", "--output", output], { stdio: "pipe" });
      const derived = JSON.parse(readFileSync(output, "utf8"));
      expect(derived.taskAsset.sha256).toBe("64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF");
      expect(derived.embeddedMetadata.sha256).toBe("BDBCDA96DFCB7DA883DA124AAA2C55DEE49770D934F0FCC71747F8C21BDC75B4");
      expect(derived.vertices[33]).toHaveLength(3);
      expect(derived.vertices[133]).toHaveLength(3);
      expect(derived.vertices[362]).toHaveLength(3);
      expect(derived.vertices[263]).toHaveLength(3);
      expect(derived.CC).toEqual([0, 2.6246179342269897, 3.4656630754470825]);
      expect(derived.DcanonMm).toBeCloseTo(63.02290916442871, 12);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
