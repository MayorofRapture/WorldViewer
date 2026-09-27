export interface ClosableTrackingFrame {
  close(): void;
}

export interface TrackingFrameEnvelope<TFrame extends ClosableTrackingFrame = ClosableTrackingFrame> {
  readonly frame: TFrame;
  readonly timestampMs: number;
  readonly widthPx: number;
  readonly heightPx: number;
}

export type TrackingFrameDispatch<TFrame extends ClosableTrackingFrame> = (envelope: TrackingFrameEnvelope<TFrame>) => void;

export class LatestFrameBackpressure<TFrame extends ClosableTrackingFrame> {
  private active = false;
  private pending: TrackingFrameEnvelope<TFrame> | undefined;

  public constructor(private readonly dispatch: TrackingFrameDispatch<TFrame>) {}

  public submit(envelope: TrackingFrameEnvelope<TFrame>): void {
    if (!this.active) {
      this.send(envelope);
      return;
    }
    this.pending?.frame.close();
    this.pending = envelope;
  }

  public complete(): void {
    this.active = false;
    if (this.pending === undefined) return;
    const next = this.pending;
    this.pending = undefined;
    this.send(next);
  }

  public shutdown(): void {
    this.pending?.frame.close();
    this.pending = undefined;
    this.active = false;
  }

  public get activeFrameCount(): 0 | 1 {
    return this.active ? 1 : 0;
  }

  public get pendingFrameCount(): 0 | 1 {
    return this.pending === undefined ? 0 : 1;
  }

  private send(envelope: TrackingFrameEnvelope<TFrame>): void {
    this.active = true;
    try {
      this.dispatch(envelope);
    } catch (error) {
      this.active = false;
      envelope.frame.close();
      throw error;
    }
  }
}
