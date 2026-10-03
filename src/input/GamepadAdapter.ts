import { ObservableAdapter } from './adapter';
import { normalizeCapabilityError } from '../app/capabilities';
import type { CapabilityError } from '../app/capabilities';

export interface GamepadSnapshot {
  id: string; index: number; standard: boolean; buttons: readonly number[]; pressed: readonly boolean[];
  axes: readonly number[]; timestamp: number; haptics: boolean;
}
export function normalizeGamepad(pad: Gamepad): GamepadSnapshot {
  return { id: pad.id, index: pad.index, standard: pad.mapping === 'standard',
    buttons: pad.buttons.map((button) => Math.max(0, Math.min(1, button.value))), pressed: pad.buttons.map((button) => button.pressed),
    axes: pad.axes.map((axis) => Math.max(-1, Math.min(1, axis))), timestamp: pad.timestamp,
    haptics: typeof pad.vibrationActuator?.playEffect === 'function' };
}
export class GamepadAdapter extends ObservableAdapter<GamepadSnapshot | null> {
  error: CapabilityError | null = null;
  private active = false;
  private value: GamepadSnapshot | null = null;
  private selected: number | null = null;
  private pad: Gamepad | null = null;
  supported(): boolean { return typeof navigator.getGamepads === 'function'; }
  enter(): void {
    this.active = true; window.addEventListener('gamepadconnected', this.changed); window.addEventListener('gamepaddisconnected', this.changed);
  }
  exit(): void {
    this.active = false;
    window.removeEventListener('gamepadconnected', this.changed); window.removeEventListener('gamepaddisconnected', this.changed);
    void this.pad?.vibrationActuator?.reset?.().catch(() => {});
    this.pad = null; this.value = null; this.selected = null; this.publish();
  }
  select(index: number): void { this.selected = index; }
  available(): Gamepad[] {
    if (!this.supported()) { this.error = 'unsupported'; return []; }
    try { const pads = Array.from(navigator.getGamepads()).filter((pad): pad is Gamepad => !!pad && pad.connected); this.error = null; return pads; }
    catch (error) { this.error = normalizeCapabilityError(error); return []; }
  }
  private changed = (): void => this.poll();
  poll(): void {
    if (!this.active) return;
    const pads = this.available();
    this.pad = pads.find((pad) => pad.index === this.selected) ?? pads[0] ?? null;
    this.value = this.pad ? normalizeGamepad(this.pad) : null; this.publish();
  }
  async vibrate(): Promise<boolean> {
    if (!this.active || !this.pad?.vibrationActuator?.playEffect) return false;
    try { return await this.pad.vibrationActuator.playEffect('dual-rumble', { duration: 200, startDelay: 0, weakMagnitude: 0.2, strongMagnitude: 0.2 }) === 'complete'; }
    catch { return false; }
  }
  snapshot(): GamepadSnapshot | null { return this.value; }
}
