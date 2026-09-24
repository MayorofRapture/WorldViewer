export type HomogeneousPoint = readonly [number, number, number, number];

export const identityMatrix = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

export const translationMatrix = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  10, 20, 30, 1,
];

export const zRotationMatrix = [
  0, 1, 0, 0,
  -1, 0, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

export function applyColumnMajorMatrix(data: readonly number[], point: readonly [number, number, number]): HomogeneousPoint {
  if (data.length !== 16) throw new RangeError("matrix must contain exactly 16 values");
  const [x, y, z] = point;
  const result: HomogeneousPoint = [
    data[0]! * x + data[4]! * y + data[8]! * z + data[12]!,
    data[1]! * x + data[5]! * y + data[9]! * z + data[13]!,
    data[2]! * x + data[6]! * y + data[10]! * z + data[14]!,
    data[3]! * x + data[7]! * y + data[11]! * z + data[15]!,
  ];
  if (!result.every(Number.isFinite) || result[3] === 0) throw new RangeError("homogeneous result is invalid");
  return result;
}

export function reviewedWorldViewerConversion(point: HomogeneousPoint): readonly [number, number, number] {
  const [x, y, z, w] = point;
  if (w !== 1) throw new RangeError("fixture expects normalized homogeneous w=1");
  return [-10 * x, 10 * y, -10 * z];
}
