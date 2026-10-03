import { describe, expect, it, vi } from 'vitest';
import { HashRouter, formatHash, parseHash } from './router';
import type { HashLocation } from './router';
import { DEVICE_IDS, SceneStore } from './state';

// Model native hash history and event delivery without installing a DOM emulator.
class BrowserHistory implements HashLocation {
  private urls: URL[];
  private index = 0;
  private readonly listeners = new Set<() => void>();
  readonly location: { hash: string };

  constructor(url = 'https://example.test/io/?test=1') {
    this.urls = [new URL(url)];
    const browser = this;
    this.location = {
      get hash() { return browser.url.hash; },
      set hash(hash: string) {
        const next = new URL(browser.url);
        next.hash = hash;
        if (next.href === browser.url.href) return;
        browser.urls = browser.urls.slice(0, browser.index + 1);
        browser.urls.push(next);
        browser.index += 1;
        browser.emitHashChange();
      },
    };
  }

  get url(): URL { return this.urls[this.index]!; }
  get length(): number { return this.urls.length; }
  addEventListener(_type: 'hashchange', listener: () => void): void { this.listeners.add(listener); }
  removeEventListener(_type: 'hashchange', listener: () => void): void { this.listeners.delete(listener); }
  emitHashChange(): void { for (const listener of this.listeners) listener(); }
  back(): void { if (this.index > 0) { this.index -= 1; this.emitHashChange(); } }
  forward(): void { if (this.index < this.urls.length - 1) { this.index += 1; this.emitHashChange(); } }
}

describe('hash serialization', () => {
  it.each(DEVICE_IDS)('round-trips the %s route', (device) => {
    expect(formatHash(device)).toBe(`#${device}`);
    expect(parseHash(formatHash(device))).toBe(device);
  });

  it.each(['', '#', '#unknown', '#Keyboard', '#keyboard/extra', '#%E0%A4%A', 'keyboard'])
    ('treats %j as overview without throwing', (hash) => expect(parseHash(hash)).toBeNull());

  it('serializes overview as an empty hash', () => expect(formatHash(null)).toBe(''));
});

describe('HashRouter', () => {
  it('emits the initial deep link on subscription', () => {
    const router = new HashRouter(new BrowserHistory('https://example.test/io/#camera'));
    const listener = vi.fn();
    router.subscribe(listener);
    expect(listener).toHaveBeenCalledExactlyOnceWith('camera');
  });

  it('preserves path and query, avoids duplicate history, and returns home', () => {
    const browser = new BrowserHistory();
    const router = new HashRouter(browser);
    const listener = vi.fn();
    router.subscribe(listener);
    router.navigate('keyboard');
    router.navigate('keyboard');
    expect(browser.length).toBe(2);
    expect(browser.url.pathname).toBe('/io/');
    expect(browser.url.search).toBe('?test=1');
    expect(listener.mock.calls).toEqual([[null], ['keyboard']]);
    router.navigate(null);
    expect(router.current()).toBeNull();
    expect(browser.length).toBe(3);
  });

  it('synchronizes browser Back/Forward with explicit scene navigation', () => {
    const browser = new BrowserHistory();
    const router = new HashRouter(browser);
    const store = new SceneStore();
    router.subscribe((device) => store.dispatch({ type: 'navigate', device }));
    router.navigate('keyboard');
    store.dispatch({ type: 'transition-completed', revision: store.getState().revision });
    router.navigate('mouse');
    browser.back();
    expect(store.getState()).toMatchObject({ mode: 'focus', device: 'keyboard', phase: 'entering' });
    browser.back();
    expect(store.getState()).toMatchObject({ mode: 'focus', device: 'keyboard', phase: 'exiting' });
    store.dispatch({ type: 'transition-completed', revision: store.getState().revision });
    expect(store.getState().mode).toBe('overview');
    browser.forward();
    expect(store.getState()).toMatchObject({ mode: 'focus', device: 'keyboard', phase: 'entering' });
  });

  it('responds to external hash edits and cleans up listeners', () => {
    const browser = new BrowserHistory();
    const router = new HashRouter(browser);
    const listener = vi.fn();
    const unsubscribe = router.subscribe(listener);
    browser.location.hash = '#controller';
    browser.location.hash = '#invalid';
    expect(listener.mock.calls).toEqual([[null], ['controller'], [null]]);
    unsubscribe();
    browser.location.hash = '#audio';
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
