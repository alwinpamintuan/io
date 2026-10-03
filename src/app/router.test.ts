import { describe, expect, it, vi } from 'vitest';
import { AppRouter } from './router';
import type { RouteBrowser } from './router';
import { SceneStore } from './state';
import { SEO_PAGES, pageForDevice } from '../seo/pages';

const ENTRY_ROUTES = [
  ['', null], ['keyboard-test', 'keyboard'], ['mouse-test', 'mouse'], ['controller-test', 'controller'],
  ['webcam-test', 'camera'], ['microphone-test', 'microphone'], ['speaker-test', 'audio'],
  ['monitor-test', 'monitor'], ['refresh-rate-test', 'monitor'],
] as const;

class BrowserHistory implements RouteBrowser {
  private urls: URL[];
  private index = 0;
  private readonly listeners = new Map<string, Set<() => void>>();
  readonly location: RouteBrowser['location'];
  readonly history: RouteBrowser['history'];
  constructor(url = 'https://example.test/io/?test=1') {
    this.urls = [new URL(url)];
    const browser = this;
    this.location = {
      get pathname() { return browser.url.pathname; },
      get search() { return browser.url.search; },
      get hash() { return browser.url.hash; },
    };
    this.history = {
      pushState(_data, _unused, path) {
        browser.urls = browser.urls.slice(0, browser.index + 1);
        browser.urls.push(new URL(path, browser.url)); browser.index++;
      },
      replaceState(_data, _unused, path) { browser.urls[browser.index] = new URL(path, browser.url); },
    };
  }
  get url(): URL { return this.urls[this.index]!; }
  get length(): number { return this.urls.length; }
  addEventListener(type: string, listener: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }
  removeEventListener(type: string, listener: () => void): void { this.listeners.get(type)?.delete(listener); }
  emit(type: string): void { for (const listener of this.listeners.get(type) ?? []) listener(); }
  setHash(hash: string): void {
    const next = new URL(this.url); next.hash = hash;
    this.history.pushState(null, '', next.href); this.emit('hashchange');
  }
  back(): void { if (this.index > 0) { this.index--; this.emit('popstate'); } }
  forward(): void { if (this.index < this.urls.length - 1) { this.index++; this.emit('popstate'); } }
}

describe('AppRouter', () => {
  it('opens each public entry URL in the intended tester', () => {
    for (const [slug, device] of ENTRY_ROUTES) {
      const browser = new BrowserHistory(`https://example.test/io/${slug ? slug + '/' : ''}`);
      const router = new AppRouter(browser);
      expect(router.currentPage().slug).toBe(slug);
      expect(router.current()).toBe(device);
      expect(router.base).toBe('/io/');
    }
  });
  it('keeps legacy device links working without adding history or losing the query', () => {
    for (const [slug, device] of ENTRY_ROUTES) {
      if (!device || slug === 'refresh-rate-test') continue;
      const browser = new BrowserHistory(`https://example.test/io/?test=1#${device}`);
      const router = new AppRouter(browser);
      expect(browser.url.pathname).toBe(`/io/${slug}/`);
      expect(browser.url.search).toBe('?test=1'); expect(browser.url.hash).toBe('');
      expect(browser.length).toBe(1); expect(router.current()).toBe(device);
    }
  });
  it('returns unknown or malformed legacy links to overview without throwing', () => {
    for (const hash of ['#', '#unknown', '#Keyboard', '#keyboard/extra', '#%E0%A4%A']) {
      const browser = new BrowserHistory(`https://example.test/io/${hash}`);
      const router = new AppRouter(browser);
      expect(router.current()).toBeNull(); expect(browser.url.pathname).toBe('/io/');
    }
  });
  it('preserves base and query, avoids duplicate history, and returns home', () => {
    const browser = new BrowserHistory(); const router = new AppRouter(browser);
    const listener = vi.fn(); router.subscribe(listener);
    router.navigate('keyboard'); router.navigate('keyboard');
    expect(browser.length).toBe(2); expect(browser.url.pathname).toBe('/io/keyboard-test/');
    expect(browser.url.search).toBe('?test=1');
    expect(listener.mock.calls.map(call => call[0])).toEqual([null, 'keyboard']);
    router.navigate(null); expect(router.current()).toBeNull(); expect(browser.url.pathname).toBe('/io/');
  });
  it('synchronizes Back/Forward during scene transitions', () => {
    const browser = new BrowserHistory(); const router = new AppRouter(browser); const store = new SceneStore();
    router.subscribe(device => store.dispatch({ type: 'navigate', device }));
    router.navigate('keyboard');
    store.dispatch({ type: 'transition-completed', revision: store.getState().revision });
    router.navigate('mouse'); browser.back();
    expect(store.getState()).toMatchObject({ mode: 'focus', device: 'keyboard', phase: 'entering' });
    browser.back();
    expect(store.getState()).toMatchObject({ mode: 'focus', device: 'keyboard', phase: 'exiting' });
    store.dispatch({ type: 'transition-completed', revision: store.getState().revision });
    expect(store.getState().mode).toBe('overview'); browser.forward();
    expect(store.getState()).toMatchObject({ mode: 'focus', device: 'keyboard', phase: 'entering' });
  });
  it('distinguishes monitor and refresh timing pages sharing one device', () => {
    const browser = new BrowserHistory('https://example.test/io/monitor-test/'); const router = new AppRouter(browser);
    const listener = vi.fn(); router.subscribe(listener);
    router.navigatePage(SEO_PAGES.find(page => page.slug === 'refresh-rate-test')!);
    expect(router.current()).toBe('monitor'); expect(router.currentPage().slug).toBe('refresh-rate-test');
    browser.back(); expect(router.currentPage().slug).toBe('monitor-test');
    expect(listener).toHaveBeenCalledTimes(3);
  });
  it('handles external hash edits, invalid hashes, and subscription cleanup', () => {
    const browser = new BrowserHistory(); const router = new AppRouter(browser); const listener = vi.fn();
    const unsubscribe = router.subscribe(listener);
    browser.setHash('#controller'); browser.setHash('#invalid');
    expect(listener.mock.calls.map(call => call[0])).toEqual([null, 'controller', null]);
    unsubscribe(); browser.setHash('#audio'); expect(listener).toHaveBeenCalledTimes(3);
  });
  it('supports root deployments and explicit index.html entry URLs', () => {
    const browser = new BrowserHistory('https://example.test/mouse-test/index.html'); const router = new AppRouter(browser);
    expect(router.base).toBe('/'); expect(router.current()).toBe('mouse');
    router.navigate('keyboard'); expect(browser.url.pathname).toBe('/keyboard-test/');
  });
  it('only intercepts exact application paths with matching query and no fragment', () => {
    const router = new AppRouter(new BrowserHistory('https://example.test/io/'));
    expect(router.pageForUrl(new URL('https://example.test/io/mouse-test/'))).toBe(pageForDevice('mouse'));
    for (const url of ['https://example.test/other/mouse-test/', 'https://example.test/io/nope/', 'https://example.test/io/mouse-test/?x=1', 'https://example.test/io/#mouse']) {
      expect(router.pageForUrl(new URL(url))).toBeNull();
    }
  });
});
