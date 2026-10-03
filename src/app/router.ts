import { isDeviceId } from './state';
import type { SceneRoute } from './state';
import { HOME_PAGE, pageForDevice } from '../seo/pages';
import type { SeoPage } from '../seo/pages';
import { pageFromPath, pagePath, siteBase } from '../seo/routes';

export function parseHash(hash: string): SceneRoute {
  if (!hash.startsWith('#')) return null;
  const value = hash.slice(1);
  return isDeviceId(value) ? value : null;
}

// Narrow browser port keeps actual path/hash history testable without a DOM emulator.
export interface RouteBrowser {
  readonly location: { readonly pathname: string; readonly search: string; readonly hash: string };
  readonly history: {
    pushState(data: unknown, unused: string, url: string): void;
    replaceState(data: unknown, unused: string, url: string): void;
  };
  addEventListener(type: 'hashchange' | 'popstate', listener: () => void): void;
  removeEventListener(type: 'hashchange' | 'popstate', listener: () => void): void;
}

type RouteListener = (device: SceneRoute, page: SeoPage) => void;
export class AppRouter {
  readonly base: string;
  private readonly listeners = new Set<RouteListener>();
  constructor(private readonly browser: RouteBrowser) {
    this.base = siteBase(browser.location.pathname);
    this.normalizeHash();
  }
  currentPage(): SeoPage { return pageFromPath(this.browser.location.pathname); }
  current(): SceneRoute { return this.currentPage().device; }
  navigate(device: SceneRoute): void { this.navigatePage(pageForDevice(device)); }
  navigatePage(page: SeoPage): void {
    const pathname = pagePath(page, this.base);
    if (this.browser.location.pathname === pathname && !this.browser.location.hash) return;
    this.browser.history.pushState(null, '', pathname + this.browser.location.search);
    this.emit();
  }
  pageForUrl(url: URL): SeoPage | null {
    if (url.hash || url.search !== this.browser.location.search) return null;
    const page = pageFromPath(url.pathname);
    return url.pathname === pagePath(page, this.base) ? page : null;
  }
  subscribe(listener: RouteListener): () => void {
    if (!this.listeners.size) {
      this.browser.addEventListener('hashchange', this.changed);
      this.browser.addEventListener('popstate', this.changed);
    }
    this.listeners.add(listener);
    listener(this.current(), this.currentPage());
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.browser.removeEventListener('hashchange', this.changed);
        this.browser.removeEventListener('popstate', this.changed);
      }
    };
  }
  private normalizeHash(): void {
    if (!this.browser.location.hash) return;
    const device = parseHash(this.browser.location.hash);
    this.browser.history.replaceState(null, '', pagePath(device ? pageForDevice(device) : HOME_PAGE, this.base) + this.browser.location.search);
  }
  private changed = (): void => { this.normalizeHash(); this.emit(); };
  private emit(): void { for (const listener of this.listeners) listener(this.current(), this.currentPage()); }
}
