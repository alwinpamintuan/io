export interface FrameTime {
  readonly nowMs: number;
  readonly deltaSeconds: number;
}

// The application's sole RAF owner. Adapters and controllers receive this clock.
export class RenderLoop {
  private requestId: number | null = null;
  private previousMs: number | null = null;
  private running = false;

  constructor(private readonly update: (time: FrameTime) => void) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.onVisibilityChange();
  }

  stop(): void {
    this.running = false;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.cancelFrame();
  }

  private cancelFrame(): void {
    if (this.requestId !== null) cancelAnimationFrame(this.requestId);
    this.requestId = null;
    this.previousMs = null;
  }

  private readonly onVisibilityChange = (): void => {
    this.cancelFrame();
    if (this.running && !document.hidden) this.requestId = requestAnimationFrame(this.frame);
  };

  private readonly frame = (nowMs: number): void => {
    this.requestId = null;
    const deltaSeconds = this.previousMs === null ? 0 : Math.max(0, (nowMs - this.previousMs) / 1000);
    this.previousMs = nowMs;
    this.update({ nowMs, deltaSeconds });
    if (this.running && !document.hidden) this.requestId = requestAnimationFrame(this.frame);
  };
}
