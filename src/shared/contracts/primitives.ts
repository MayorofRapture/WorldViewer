export type Millimeters = number;
export type Seconds = number;
export type MonotonicMs = number;

export interface Vec3Mm {
  readonly x: Millimeters;
  readonly y: Millimeters;
  readonly z: Millimeters;
}

export interface Vec3MmPerSec {
  readonly x: Millimeters;
  readonly y: Millimeters;
  readonly z: Millimeters;
}
