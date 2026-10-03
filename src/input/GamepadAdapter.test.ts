import { afterEach, expect, it, vi } from 'vitest';
import { GamepadAdapter } from './GamepadAdapter';
afterEach(() => vi.unstubAllGlobals());
it('distinguishes absent exposure from a previously exposed disconnect and preserves raw indexed controls', () => {
  let pads: Gamepad[] = []; vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('navigator', { getGamepads: () => pads });
  const adapter = new GamepadAdapter(); adapter.enter(); adapter.poll(); expect(adapter.connection).toBe('unobserved');
  pads = [{ id: 'Fixture', index: 0, connected: true, mapping: '', axes: [0.001, -0.003], buttons: [{ value: 0.42, pressed: false }], timestamp: 1 } as unknown as Gamepad];
  adapter.poll(); expect(adapter.connection).toBe('exposed'); expect(adapter.snapshot()?.axes).toEqual([0.001, -0.003]);
  pads = []; adapter.poll(); expect(adapter.connection).toBe('disconnected'); expect(adapter.snapshot()).toBeNull(); adapter.exit();
});
