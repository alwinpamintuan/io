import { afterEach, expect, it, vi } from 'vitest';
import { MonitorAdapter } from './MonitorAdapter';

afterEach(() => vi.unstubAllGlobals());

it('restores the authored monitor aspect on exit without waiting for fullscreenchange', () => {
  const canvas = { width: 0, height: 0, remove: vi.fn(), getContext: () => ({ fillRect: vi.fn() }) };
  const browser = Object.assign(new EventTarget(), { innerWidth: 1920, innerHeight: 1080 });
  const page = Object.assign(new EventTarget(), {
    createElement: () => canvas, fullscreenElement: null as unknown,
    exitFullscreen: vi.fn().mockResolvedValue(undefined),
  });
  vi.stubGlobal('window', browser); vi.stubGlobal('document', page);
  const adapter = new MonitorAdapter(); adapter.enter();
  page.fullscreenElement = canvas; page.dispatchEvent(new Event('fullscreenchange'));
  expect(canvas.width).toBe(1920); expect(canvas.height).toBe(1080);
  adapter.exit();
  expect(page.exitFullscreen).toHaveBeenCalledOnce();
  expect(canvas.width).toBe(1280); expect(canvas.height).toBe(Math.round(1280 * 31.2 / 57.2));
  canvas.width = 42; browser.dispatchEvent(new Event('resize'));
  expect(canvas.width).toBe(42);
  adapter.enter(); expect(canvas.width).toBe(1280); adapter.exit();
});
