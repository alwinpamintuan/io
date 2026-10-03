import { expect, it } from 'vitest';
import { PointerAdapter } from './PointerAdapter';
it('observes five-button chords, delivered extra indexes, both wheel axes/units, bounds trails and clears cancellation', () => {
  const surface = Object.assign(new EventTarget(), { clientHeight: 720 }); const browser = new EventTarget();
  const adapter = new PointerAdapter(surface as unknown as HTMLElement, browser as unknown as Window); adapter.enter();
  const pointer = (type: string, button: number, buttons: number) => Object.assign(new Event(type, { cancelable: true }), { pointerType: 'mouse', button, buttons, clientX: 20, clientY: 30 });
  surface.dispatchEvent(pointer('pointerdown', 0, 1)); const chord = pointer('pointerdown', 4, 31); surface.dispatchEvent(chord); expect(adapter.snapshot().buttons).toBe(31); expect(chord.defaultPrevented).toBe(true);
  surface.dispatchEvent(pointer('pointerdown', 6, 31)); expect(adapter.snapshot().extra).toEqual([{ index: 6, down: true }]);
  for (const mode of [0, 1, 2]) { const wheel = Object.assign(new Event('wheel', { cancelable: true }), { deltaX: -3, deltaY: 4, deltaMode: mode }); surface.dispatchEvent(wheel); expect(adapter.snapshot().wheel).toMatchObject({ x: -3, y: 4, mode }); expect(wheel.defaultPrevented).toBe(true); }
  for (let i = 0; i < 200; i++) surface.dispatchEvent(pointer('pointermove', -1, 31)); expect(adapter.snapshot().trail.length).toBeLessThanOrEqual(128);
  surface.dispatchEvent(new Event('pointercancel')); expect(adapter.snapshot().buttons).toBe(0); expect(adapter.snapshot().extra?.[0]?.down).toBe(false); expect(adapter.snapshot().trail).toHaveLength(0);
  adapter.exit(); surface.dispatchEvent(pointer('pointerdown', 0, 1)); expect(adapter.snapshot().buttons).toBe(0);
});
