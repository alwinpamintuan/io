import { afterEach, describe, expect, it, vi } from 'vitest';
import { MonitorAdapter, MONITOR_MODES } from './MonitorAdapter';

// Browser verification exercises graphic controls; these tests isolate adapter behavior.
vi.mock('../overlay/controls', () => ({ designButton: (b: HTMLButtonElement, label: string) => { b.textContent = label; b.ariaLabel = label; }, designChoice: () => {}, syncChoices: () => {} }));

class ElementMock extends EventTarget {
  width = 0; height = 0; className = ''; ariaLabel = ''; tabIndex = -1; textContent = ''; value = ''; type = '';
  dataset: Record<string, string> = {}; children: ElementMock[] = []; parent: ElementMock | null = null;
  classList = { remove: vi.fn(), toggle: vi.fn() }; focus = vi.fn(); remove = vi.fn(); requestFullscreen = vi.fn().mockResolvedValue(undefined);
  ctx = { fillRect: vi.fn(), strokeRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), imageSmoothingEnabled: true, createLinearGradient: () => ({ addColorStop: vi.fn() }) };
  constructor(readonly tag = '') { super(); }
  append(...children: ElementMock[]) { this.children.push(...children); children.forEach(c => c.parent = this); }
  replaceChildren() { this.children = []; }
  getContext() { return this.ctx; }
  setAttribute() {}
  contains(target: unknown) { return this.children.includes(target as ElementMock); }
  closest() { return ['button', 'select'].includes(this.tag) ? this : null; }
  querySelectorAll() { return this.children.filter(c => c.tag === 'select'); }
  querySelector() { return this.children.find(c => c.dataset.pause) ?? null; }
}
function fixture(dpr = 1) {
  const browser = Object.assign(new EventTarget(), { innerWidth: 1440, innerHeight: 900, devicePixelRatio: dpr });
  const app = new ElementMock(); const page = Object.assign(new EventTarget(), { createElement: (tag: string) => new ElementMock(tag), fullscreenElement: null as unknown, activeElement: null as unknown, exitFullscreen: vi.fn().mockResolvedValue(undefined), querySelector: (s: string) => s === '#app' ? app : null });
  vi.stubGlobal('window', browser); vi.stubGlobal('document', page); vi.stubGlobal('Element', ElementMock);
  const adapter = new MonitorAdapter(); const surface = new ElementMock('canvas'); adapter.enter(surface as unknown as HTMLElement);
  return { adapter, browser, page, surface };
}
afterEach(() => vi.unstubAllGlobals());
describe('monitor inspection', () => {
  it('fullscreens the controls wrapper at output size and immediately restores monitor aspect on exit', () => {
    const { adapter, browser, page } = fixture(2); const authored = adapter.canvas.width;
    page.fullscreenElement = adapter.wrapper; page.dispatchEvent(new Event('fullscreenchange'));
    expect(adapter.canvas.width).toBe(2880); expect(adapter.canvas.height).toBe(1800);
    adapter.exit(); expect(page.exitFullscreen).toHaveBeenCalledOnce(); expect(adapter.canvas.width).toBe(authored); expect(adapter.canvas.height).toBe(Math.round(authored * 31.2 / 57.2));
    adapter.canvas.width = 42; browser.dispatchEvent(new Event('resize')); expect(adapter.canvas.width).toBe(42);
  });
  it('keeps static patterns static, renders geometry as a circle and pauses functional motion', () => {
    const { adapter } = fixture(); const ctx = adapter.canvas.getContext('2d')!;
    for (const mode of MONITOR_MODES) adapter.setMode(mode);
    adapter.setMode('grid'); expect(ctx.arc).toHaveBeenLastCalledWith(adapter.canvas.width / 2, adapter.canvas.height / 2, Math.min(adapter.canvas.width, adapter.canvas.height) * 0.35, 0, Math.PI * 2);
    vi.mocked(ctx.fillRect).mockClear(); adapter.poll(10); adapter.poll(30); expect(ctx.fillRect).not.toHaveBeenCalled();
    adapter.setMode('motion'); adapter.setMotion(360, 'up', false); vi.mocked(ctx.fillRect).mockClear(); adapter.poll(50); expect(ctx.fillRect).toHaveBeenCalled();
    adapter.setMotion(360, 'up', true); vi.mocked(ctx.fillRect).mockClear(); adapter.poll(70); expect(ctx.fillRect).not.toHaveBeenCalled(); adapter.exit();
  });
  it('applies arrows and Space only on the test surface, preserving semantic controls', () => {
    const { adapter, surface } = fixture(); const key = (code: string) => Object.assign(new Event('keydown', { cancelable: true }), { code });
    const next = key('ArrowRight'); surface.dispatchEvent(next); expect(next.defaultPrevented).toBe(true); expect(adapter.snapshot().mode).toBe('black');
    adapter.setMode('motion'); surface.dispatchEvent(key('Space')); expect(adapter.snapshot().paused).toBe(true);
    const select = new ElementMock('select'); const event = key('ArrowRight'); Object.defineProperty(event, 'target', { value: select }); surface.dispatchEvent(event); expect(event.defaultPrevented).toBe(false); expect(adapter.snapshot().mode).toBe('motion'); adapter.exit();
  });
  it('rejects a late fullscreen completion after tester exit', async () => {
    const { adapter, page } = fixture(); let resolve!: () => void; const wrapper = adapter.wrapper as unknown as ElementMock;
    wrapper.requestFullscreen.mockImplementation(() => new Promise<void>(yes => { resolve = yes; }));
    const pending = adapter.fullscreen(); adapter.exit(); page.fullscreenElement = wrapper; resolve(); expect(await pending).toBe(false); expect(page.exitFullscreen).toHaveBeenCalled();
  });
});
