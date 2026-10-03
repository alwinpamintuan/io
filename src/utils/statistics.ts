export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** Bounded, monotonic observation window. Never implies hardware configuration. */
export class TimingWindow {
  private times: number[] = [];
  constructor(private readonly windowMs = 1000, private readonly maximum = 2048) {}
  add(now: number): void {
    const last = this.times.at(-1);
    if (last !== undefined && now <= last) return;
    if (last !== undefined && now - last > this.windowMs) this.reset();
    this.times.push(now); this.prune(now);
    if (this.times.length > this.maximum) this.times.splice(0, this.times.length - this.maximum);
  }
  estimate(now: number): { hz: number; ms: number; samples: number } | null {
    this.prune(now);
    if (this.times.length < 8 || this.times.at(-1)! - this.times[0]! < 100) return null;
    const intervals = this.times.slice(1).map((time, i) => time - this.times[i]!);
    const ms = median(intervals)!;
    return { hz: Math.round(1000 / ms), ms: Math.round(ms * 10) / 10, samples: intervals.length };
  }
  private prune(now: number): void { this.times = this.times.filter((time) => time >= now - this.windowMs); }
  reset(): void { this.times = []; }
}
