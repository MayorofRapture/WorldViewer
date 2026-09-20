export interface ProjectionReferenceCase {
  readonly id: string;
  readonly screenMm: readonly [number, number];
  readonly eyeMm: readonly [number, number, number];
  readonly nearMm: number;
  readonly farMm: number;
  readonly frustumMm: Readonly<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  }>;
  readonly projectionElements: readonly number[];
  readonly probeWorldMm: readonly [number, number, number];
  readonly probeExpectedNdcXY: readonly [number, number];
}

function referenceCase(input: ProjectionReferenceCase): ProjectionReferenceCase {
  return Object.freeze({
    ...input,
    screenMm: Object.freeze([...input.screenMm]) as ProjectionReferenceCase["screenMm"],
    eyeMm: Object.freeze([...input.eyeMm]) as ProjectionReferenceCase["eyeMm"],
    frustumMm: Object.freeze({ ...input.frustumMm }),
    projectionElements: Object.freeze([...input.projectionElements]),
    probeWorldMm: Object.freeze([...input.probeWorldMm]) as ProjectionReferenceCase["probeWorldMm"],
    probeExpectedNdcXY: Object.freeze([...input.probeExpectedNdcXY]) as ProjectionReferenceCase["probeExpectedNdcXY"],
  });
}

export const PROJECTION_REFERENCE_CASES: readonly ProjectionReferenceCase[] = Object.freeze([
  referenceCase({
    id: "C01-centered", screenMm: [600, 400], eyeMm: [0, 0, 600], nearMm: 50, farMm: 5000,
    frustumMm: { left: -25, right: 25, top: 16.666666666667, bottom: -16.666666666667 },
    projectionElements: [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, -1.020202020202, -1, 0, 0, -101.010101010101, 0],
    probeWorldMm: [120, 60, -600], probeExpectedNdcXY: [0.2, 0.15],
  }),
  referenceCase({
    id: "C02-left", screenMm: [600, 400], eyeMm: [-50, 0, 600], nearMm: 50, farMm: 5000,
    frustumMm: { left: -20.833333333333, right: 29.166666666667, top: 16.666666666667, bottom: -16.666666666667 },
    projectionElements: [2, 0, 0, 0, 0, 3, 0, 0, 0.166666666667, 0, -1.020202020202, -1, 0, 0, -101.010101010101, 0],
    probeWorldMm: [0, 0, -600], probeExpectedNdcXY: [-0.083333333333, 0],
  }),
  referenceCase({
    id: "C03-right", screenMm: [600, 400], eyeMm: [50, 0, 600], nearMm: 50, farMm: 5000,
    frustumMm: { left: -29.166666666667, right: 20.833333333333, top: 16.666666666667, bottom: -16.666666666667 },
    projectionElements: [2, 0, 0, 0, 0, 3, 0, 0, -0.166666666667, 0, -1.020202020202, -1, 0, 0, -101.010101010101, 0],
    probeWorldMm: [0, 0, -600], probeExpectedNdcXY: [0.083333333333, 0],
  }),
  referenceCase({
    id: "C04-down", screenMm: [600, 400], eyeMm: [0, -50, 600], nearMm: 50, farMm: 5000,
    frustumMm: { left: -25, right: 25, top: 20.833333333333, bottom: -12.5 },
    projectionElements: [2, 0, 0, 0, 0, 3, 0, 0, 0, 0.25, -1.020202020202, -1, 0, 0, -101.010101010101, 0],
    probeWorldMm: [0, 0, -600], probeExpectedNdcXY: [0, -0.125],
  }),
  referenceCase({
    id: "C05-up", screenMm: [600, 400], eyeMm: [0, 50, 600], nearMm: 50, farMm: 5000,
    frustumMm: { left: -25, right: 25, top: 12.5, bottom: -20.833333333333 },
    projectionElements: [2, 0, 0, 0, 0, 3, 0, 0, 0, -0.25, -1.020202020202, -1, 0, 0, -101.010101010101, 0],
    probeWorldMm: [0, 0, -600], probeExpectedNdcXY: [0, 0.125],
  }),
  referenceCase({
    id: "C06-close", screenMm: [600, 400], eyeMm: [0, 0, 450], nearMm: 50, farMm: 5000,
    frustumMm: { left: -33.333333333333, right: 33.333333333333, top: 22.222222222222, bottom: -22.222222222222 },
    projectionElements: [1.5, 0, 0, 0, 0, 2.25, 0, 0, 0, 0, -1.020202020202, -1, 0, 0, -101.010101010101, 0],
    probeWorldMm: [120, 0, -600], probeExpectedNdcXY: [0.171428571429, 0],
  }),
  referenceCase({
    id: "C07-far", screenMm: [600, 400], eyeMm: [0, 0, 800], nearMm: 50, farMm: 5000,
    frustumMm: { left: -18.75, right: 18.75, top: 12.5, bottom: -12.5 },
    projectionElements: [2.666666666667, 0, 0, 0, 0, 4, 0, 0, 0, 0, -1.020202020202, -1, 0, 0, -101.010101010101, 0],
    probeWorldMm: [120, 0, -600], probeExpectedNdcXY: [0.228571428571, 0],
  }),
  referenceCase({
    id: "C08-asym", screenMm: [600, 400], eyeMm: [-35, 20, 600], nearMm: 50, farMm: 5000,
    frustumMm: { left: -22.083333333333, right: 27.916666666667, top: 15, bottom: -18.333333333333 },
    projectionElements: [2, 0, 0, 0, 0, 3, 0, 0, 0.116666666667, -0.1, -1.020202020202, -1, 0, 0, -101.010101010101, 0],
    probeWorldMm: [80, -40, -500], probeExpectedNdcXY: [0.092424242424, -0.063636363636],
  }),
  referenceCase({
    id: "C09-compound", screenMm: [600, 400], eyeMm: [110, -70, 550], nearMm: 50, farMm: 5000,
    frustumMm: { left: -37.272727272727, right: 17.272727272727, top: 24.545454545455, bottom: -11.818181818182 },
    projectionElements: [1.833333333333, 0, 0, 0, 0, 2.75, 0, 0, -0.366666666667, 0.35, -1.020202020202, -1, 0, 0, -101.010101010101, 0],
    probeWorldMm: [100, 70, -500], probeExpectedNdcXY: [0.349206349206, 0.016666666667],
  }),
  referenceCase({
    id: "C10-outside", screenMm: [600, 400], eyeMm: [360, 230, 600], nearMm: 50, farMm: 5000,
    frustumMm: { left: -55, right: -5, top: -2.5, bottom: -35.833333333333 },
    projectionElements: [2, 0, 0, 0, 0, 3, 0, 0, -1.2, -1.15, -1.020202020202, -1, 0, 0, -101.010101010101, 0],
    probeWorldMm: [0, 0, -600], probeExpectedNdcXY: [0.6, 0.575],
  }),
  referenceCase({
    id: "C11-e590", screenMm: [345.4, 194.3], eyeMm: [42, -27, 620], nearMm: 50, farMm: 5000,
    frustumMm: { left: -17.314516129032, right: 10.540322580645, top: 10.012096774194, bottom: -5.657258064516 },
    projectionElements: [3.590040532716, 0, 0, 0, 0, 6.381883685023, 0, 0, -0.243196294152, 0.277920741122, -1.020202020202, -1, 0, 0, -101.010101010101, 0],
    probeWorldMm: [80, -40, -700], probeExpectedNdcXY: [0.346545945851, -0.340772625899],
  }),
  referenceCase({
    id: "C12-near-scale", screenMm: [600, 400], eyeMm: [110, -70, 550], nearMm: 125, farMm: 2500,
    frustumMm: { left: -93.181818181818, right: 43.181818181818, top: 61.363636363636, bottom: -29.545454545455 },
    projectionElements: [1.833333333333, 0, 0, 0, 0, 2.75, 0, 0, -0.366666666667, 0.35, -1.105263157895, -1, 0, 0, -263.157894736842, 0],
    probeWorldMm: [100, 70, -500], probeExpectedNdcXY: [0.349206349206, 0.016666666667],
  }),
]);
