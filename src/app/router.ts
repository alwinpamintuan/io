import { isDeviceId } from './state';
import type { SceneRoute } from './state';

export function parseHash(hash: string): SceneRoute {
  if (!hash.startsWith('#')) return null;
  const value = hash.slice(1);
  return isDeviceId(value) ? value : null;
}

export function formatHash(route: SceneRoute): string {
  return route === null ? '' : `#${route}`;
}

// Narrow browser port keeps routing testable without a DOM dependency.
export interface HashLocation {
  readonly location: { hash: string };
  addEventListener(type: 'hashchange', listener: () => void): void;
  removeEventListener(type: 'hashchange', listener: () => void): void;
}

export class HashRouter {
  constructor(private readonly browser: HashLocation) {}

  current(): SceneRoute {
    return parseHash(this.browser.location.hash);
  }

  navigate(route: SceneRoute): void {
    const hash = formatHash(route);
    if (this.browser.location.hash !== hash) this.browser.location.hash = hash;
  }

  subscribe(listener: (route: SceneRoute) => void): () => void {
    const onHashChange = (): void => listener(this.current());
    this.browser.addEventListener('hashchange', onHashChange);
    onHashChange(); // Deep links enter only after the application has created its scene.
    return () => this.browser.removeEventListener('hashchange', onHashChange);
  }
}
