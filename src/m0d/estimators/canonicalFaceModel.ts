export interface CanonicalPointCm {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Values derived by the pinned canonical-face-model artifact in evidence/m0d/estimator-experiment-v3. */
export const PINNED_CANONICAL_FACE_MODEL = Object.freeze({
  source: "evidence/m0d/estimator-experiment-v3/canonical-face-model.json",
  taskAssetSha256: "64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF",
  embeddedMetadataSha256: "BDBCDA96DFCB7DA883DA124AAA2C55DEE49770D934F0FCC71747F8C21BDC75B4",
  cyclopeanPointCm: Object.freeze({ x: 0, y: 2.6246179342269897, z: 3.4656630754470825 }),
  interocularDistanceMm: 63.02290916442871,
} satisfies {
  readonly source: string;
  readonly taskAssetSha256: string;
  readonly embeddedMetadataSha256: string;
  readonly cyclopeanPointCm: CanonicalPointCm;
  readonly interocularDistanceMm: number;
});
