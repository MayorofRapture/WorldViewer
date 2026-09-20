import type { MonotonicClock } from "./contracts";

export type { MonotonicClock } from "./contracts";

export const performanceMonotonicClock: MonotonicClock = {
  nowMs: () => performance.now(),
};
