import { ObservableAdapter, isControl } from './adapter';
import { keyboardCode } from './keyboardLayout';

export interface KeyboardSnapshot {
  held: ReadonlyMap<string, number>; tested: ReadonlySet<string>; last: string | null;
  holdMs: number | null; repeatMs: number | null;
}
export class KeyboardAdapter extends ObservableAdapter<KeyboardSnapshot> {
  private active = false;
  private held = new Map<string, number>();
  private tested = new Set<string>();
  private repeats = new Map<string, number>();
  private last: string | null = null;
  private holdMs: number | null = null;
  private repeatMs: number | null = null;
  constructor(private readonly browser: Window = window) { super(); }
  supported(): boolean { return true; }
  enter(): void {
    if (this.active) return;
    this.active = true; this.reset();
    this.browser.addEventListener('keydown', this.down); this.browser.addEventListener('keyup', this.up);
    this.browser.addEventListener('blur', this.clearHeld);
  }
  exit(): void {
    this.active = false;
    this.browser.removeEventListener('keydown', this.down); this.browser.removeEventListener('keyup', this.up);
    this.browser.removeEventListener('blur', this.clearHeld); this.reset();
  }
  reset(): void { this.held.clear(); this.tested.clear(); this.repeats.clear(); this.last = null; this.holdMs = null; this.repeatMs = null; this.publish(); }
  snapshot(): KeyboardSnapshot { return { held: new Map(this.held), tested: new Set(this.tested), last: this.last, holdMs: this.holdMs, repeatMs: this.repeatMs }; }
  private clearHeld = (): void => { this.held.clear(); this.repeats.clear(); this.publish(); };
  private down = (event: KeyboardEvent): void => {
    if (isControl(event.target)) return;
    const code = keyboardCode(event); if (!code || code === 'Unidentified') return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', 'Backspace'].includes(code) && !event.metaKey && !event.ctrlKey && !event.altKey) event.preventDefault();
    if (!this.held.has(code)) { this.held.set(code, event.timeStamp); this.tested.add(code); this.repeatMs = null; }
    else if (event.repeat) this.repeatMs = event.timeStamp - (this.repeats.get(code) ?? this.held.get(code)!);
    this.repeats.set(code, event.timeStamp); this.last = code; this.publish();
  };
  private up = (event: KeyboardEvent): void => {
    const code = keyboardCode(event); const start = this.held.get(code);
    if (start !== undefined) { this.holdMs = Math.round(event.timeStamp - start); this.held.delete(code); this.repeats.delete(code); this.last = code; this.publish(); }
  };
}
