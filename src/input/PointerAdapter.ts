import { TimingWindow } from '../utils/statistics';
import { ObservableAdapter } from './adapter';

export interface PointerSnapshot {
  buttons: number; clickMs: number | null; wheel: { x: number; y: number; mode: number; angle: number };
  trail: readonly { x: number; y: number; time: number }[];
}
export class PointerAdapter extends ObservableAdapter<PointerSnapshot> {
  readonly timing = new TimingWindow();
  private active = false;
  private buttons = 0;
  private presses = new Map<number, number>();
  private clickMs: number | null = null;
  private wheel = { x: 0, y: 0, mode: 0, angle: 0 };
  private trail: { x: number; y: number; time: number }[] = [];
  constructor(private readonly surface: HTMLElement, private readonly browser: Window = window) { super(); }
  supported(): boolean { return 'PointerEvent' in this.browser; }
  enter(): void {
    if (this.active) return; this.active = true; this.reset();
    this.surface.addEventListener('pointermove', this.move);
    this.surface.addEventListener('pointerdown', this.down);
    this.browser.addEventListener('pointerup', this.up);
    this.surface.addEventListener('wheel', this.scroll, { passive: false });
    this.surface.addEventListener('contextmenu', this.context);
    this.surface.addEventListener('pointercancel', this.clear);
    this.browser.addEventListener('blur', this.clear);
  }
  exit(): void {
    this.active = false;
    this.surface.removeEventListener('pointermove', this.move); this.surface.removeEventListener('pointerdown', this.down);
    this.browser.removeEventListener('pointerup', this.up); this.surface.removeEventListener('wheel', this.scroll);
    this.surface.removeEventListener('contextmenu', this.context); this.surface.removeEventListener('pointercancel', this.clear);
    this.browser.removeEventListener('blur', this.clear); this.reset();
  }
  reset(): void { this.buttons = 0; this.presses.clear(); this.clickMs = null; this.wheel = { x: 0, y: 0, mode: 0, angle: 0 }; this.trail = []; this.timing.reset(); this.publish(); }
  snapshot(): PointerSnapshot { return { buttons: this.buttons, clickMs: this.clickMs, wheel: { ...this.wheel }, trail: [...this.trail] }; }
  prune(now: number): void { this.trail = this.trail.filter((sample) => now - sample.time < 650); }
  private clear = (): void => { this.buttons = 0; this.trail = []; this.timing.reset(); this.publish(); };
  private move = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    let samples: PointerEvent[] = [];
    try { samples = event.getCoalescedEvents?.() ?? []; } catch { /* Event remains usable. */ }
    if (!samples.length) samples = [event];
    for (const sample of samples) {
      this.timing.add(sample.timeStamp); this.trail.push({ x: sample.clientX, y: sample.clientY, time: sample.timeStamp });
    }
    this.transitions(event); this.trail = this.trail.slice(-128); this.prune(event.timeStamp); this.publish();
  };
  private down = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    this.transitions(event);
    if (event.button === 1 || event.button >= 3) event.preventDefault();
    this.publish();
  };
  private transitions(event: PointerEvent): void {
    const newlyPressed = event.buttons & ~this.buttons;
    for (const [bit, button] of [[1, 0], [2, 2], [4, 1], [8, 3], [16, 4]] as const) {
      if (!(newlyPressed & bit)) continue;
      const previous = this.presses.get(button);
      this.clickMs = previous === undefined ? null : Math.round(event.timeStamp - previous);
      this.presses.set(button, event.timeStamp);
    }
    this.buttons = event.buttons;
  }
  private up = (event: PointerEvent): void => { if (event.pointerType === 'mouse') { this.transitions(event); this.publish(); } };
  private scroll = (event: WheelEvent): void => {
    event.preventDefault();
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.surface.clientHeight : 1);
    this.wheel = { x: event.deltaX, y: event.deltaY, mode: event.deltaMode, angle: this.wheel.angle + pixels * 0.015 }; this.publish();
  };
  private context = (event: MouseEvent): void => { event.preventDefault(); };
}
