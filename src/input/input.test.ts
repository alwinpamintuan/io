import { describe, expect, it, vi } from 'vitest';
import { TimingWindow, median } from '../utils/statistics';
import { KEY_LAYOUT, keyboardCode } from './keyboardLayout';
import { KeyboardAdapter } from './KeyboardAdapter';

describe('browser-observed measurements', () => {
  it('uses the median, rejects duplicate timestamps, expires samples and resets after gaps', () => {
    expect(median([8, 8, 100, 8])).toBe(8);
    const timing = new TimingWindow();
    for (let t = 0; t <= 500; t += 10) { timing.add(t); timing.add(t); }
    expect(timing.estimate(500)?.hz).toBe(100);
    expect(timing.estimate(2000)).toBeNull();
    timing.add(3000); expect(timing.estimate(3000)).toBeNull();
  });
  it('maps physical codes first, falls back by character/location and has unique full-size keys', () => {
    expect(keyboardCode({ code: 'KeyQ', key: 'a', location: 0 })).toBe('KeyQ');
    expect(keyboardCode({ code: '', key: 'a', location: 0 })).toBe('KeyA');
    expect(keyboardCode({ code: '', key: '1', location: 3 })).toBe('Numpad1');
    expect(keyboardCode({ code: '', key: 'Shift', location: 2 })).toBe('ShiftRight');
    expect(new Set(KEY_LAYOUT.map((key) => key.code)).size).toBe(KEY_LAYOUT.length);
    expect(KEY_LAYOUT.length).toBe(104);
  });
  it('scopes listeners to focus and clears held keys on blur and exit', () => {
    const browser = new EventTarget();
    const adapter = new KeyboardAdapter(browser as unknown as Window);
    vi.stubGlobal('Element', class {});
    const event = (type: string, code: string) => Object.assign(new Event(type), { code, key: code, location: 0, repeat: false, metaKey: false, ctrlKey: false, altKey: false });
    browser.dispatchEvent(event('keydown', 'KeyA')); expect(adapter.snapshot().held.size).toBe(0);
    adapter.enter(); browser.dispatchEvent(event('keydown', 'KeyA')); browser.dispatchEvent(event('keydown', 'KeyS'));
    expect(adapter.snapshot().held.size).toBe(2); expect(adapter.snapshot().tested.size).toBe(2);
    browser.dispatchEvent(new Event('blur')); expect(adapter.snapshot().held.size).toBe(0);
    adapter.exit(); browser.dispatchEvent(event('keydown', 'KeyD')); expect(adapter.snapshot().tested.size).toBe(0);
    vi.unstubAllGlobals();
  });
});
