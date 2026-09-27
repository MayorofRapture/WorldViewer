import { describe, expect, it } from "vitest";
import { LatestFrameBackpressure } from "../../src/mediapipe/latestFrameBackpressure";

class FakeFrame {
  public closeCount = 0;
  public close(): void { this.closeCount += 1; }
}

function envelope(frame: FakeFrame, timestampMs: number) {
  return { frame, timestampMs, widthPx: 640, heightPx: 360 };
}

describe("latest-frame tracking backpressure", () => {
  it("keeps one active frame and replaces the single pending frame with the newest", () => {
    const sent: FakeFrame[] = [];
    const queue = new LatestFrameBackpressure<FakeFrame>((value) => sent.push(value.frame));
    const first = new FakeFrame();
    const replaced = new FakeFrame();
    const newest = new FakeFrame();

    queue.submit(envelope(first, 1));
    queue.submit(envelope(replaced, 2));
    queue.submit(envelope(newest, 3));

    expect(sent).toEqual([first]);
    expect(queue.activeFrameCount).toBe(1);
    expect(queue.pendingFrameCount).toBe(1);
    expect(replaced.closeCount).toBe(1);

    queue.complete();
    expect(sent).toEqual([first, newest]);
    expect(queue.activeFrameCount).toBe(1);
    expect(queue.pendingFrameCount).toBe(0);
    queue.complete();
    expect(queue.activeFrameCount).toBe(0);
  });

  it("releases pending frames during shutdown and dispatch failure", () => {
    const pending = new FakeFrame();
    const queue = new LatestFrameBackpressure<FakeFrame>(() => { throw new Error("worker unavailable"); });
    expect(() => queue.submit(envelope(pending, 1))).toThrow("worker unavailable");
    expect(pending.closeCount).toBe(1);

    const active = new FakeFrame();
    const waiting = new FakeFrame();
    const second = new LatestFrameBackpressure<FakeFrame>(() => undefined);
    second.submit(envelope(active, 1));
    second.submit(envelope(waiting, 2));
    second.shutdown();
    expect(waiting.closeCount).toBe(1);
    expect(second.activeFrameCount).toBe(0);
    expect(second.pendingFrameCount).toBe(0);
  });
});
