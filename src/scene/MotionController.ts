import type { DeviceId } from '../app/state';

export const MOTION_DURATION = { navigation: 0.62, exit: 0.54, reduced: 0.15 } as const;
export type TimelineName = 'overview' | `focus:${DeviceId}`;

export interface MotionTimeline {
  readonly name: TimelineName;
  readonly durationSeconds: number;
  readonly sample: (progress: number) => void;
  readonly complete: () => void;
  readonly ease?: (progress: number) => number;
}

export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const sample = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
  return (progress: number): number => {
    if (progress <= 0 || progress >= 1) return progress;
    let low = 0; let high = 1;
    for (let i = 0; i < 16; i++) { const mid = (low + high) / 2; if (sample(mid, x1, x2) < progress) low = mid; else high = mid; }
    return sample((low + high) / 2, y1, y2);
  };
}
export const EASING = {
  CAMERA_OUT: cubicBezier(0.22, 0.74, 0.18, 1), CAMERA_IN_OUT: cubicBezier(0.65, 0, 0.22, 1),
  OBJECT_OUT: cubicBezier(0.2, 0.85, 0.25, 1), FADE_OUT: cubicBezier(0.25, 0, 0.3, 1),
};

// Orchestrates named timelines; never owns a timer or animation frame.
export class MotionController {
  private timeline: MotionTimeline | null = null;
  private elapsedSeconds = 0;
  private paused = false;
  private lastTimeline: MotionTimeline | null = null;
  get name(): TimelineName | null { return this.timeline?.name ?? null; }
  get progress(): number { return this.timeline ? Math.min(1, this.elapsedSeconds / this.timeline.durationSeconds) : 1; }

  get active(): boolean {
    return this.timeline !== null;
  }

  play(timeline: MotionTimeline): void {
    this.cancel();
    this.timeline = timeline;
    this.lastTimeline = timeline;
    timeline.sample(0);
    if (timeline.durationSeconds <= 0) this.update(0);
  }

  update(deltaSeconds: number): void {
    const timeline = this.timeline;
    if (!timeline || this.paused) return;
    this.elapsedSeconds += Math.max(0, deltaSeconds);
    const t = timeline.durationSeconds <= 0
      ? 1 : Math.min(1, this.elapsedSeconds / timeline.durationSeconds);
    timeline.sample(timeline.ease ? timeline.ease(t) : t * t * (3 - 2 * t));
    if (t === 1 && this.timeline === timeline) {
      this.timeline = null;
      timeline.complete();
    }
  }

  cancel(): void {
    this.timeline = null;
    this.elapsedSeconds = 0;
    this.paused = false;
  }

  preview(name: TimelineName, progress: number): void {
    const timeline = this.timeline ?? this.lastTimeline;
    if (!timeline || timeline.name !== name) return;
    this.timeline = timeline; this.paused = true;
    const t = Math.max(0, Math.min(1, progress)); this.elapsedSeconds = t * timeline.durationSeconds;
    timeline.sample(timeline.ease ? timeline.ease(t) : t * t * (3 - 2 * t));
  }
}
