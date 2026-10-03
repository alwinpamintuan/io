import type { AppRouter } from '../app/router';
import { canonicalUrl, HOME_PAGE, SOCIAL_IMAGE } from './pages';
import { renderGuide, structuredData } from './render';
import { pagePath } from './routes';

export function connectSeo(router: AppRouter): () => void {
  const guide = document.querySelector<HTMLElement>('.test-guide')!;
  const unsubscribe = router.subscribe((device, page) => {
    document.title = page.title;
    const values: Record<string, string> = {
      'meta[name="description"]': page.description,
      'meta[property="og:title"]': page.title, 'meta[property="og:description"]': page.description,
      'meta[property="og:url"]': canonicalUrl(page), 'meta[property="og:image"]': SOCIAL_IMAGE,
      'meta[name="twitter:title"]': page.title, 'meta[name="twitter:description"]': page.description,
      'meta[name="twitter:image"]': SOCIAL_IMAGE,
    };
    for (const [selector, value] of Object.entries(values)) document.querySelector(selector)?.setAttribute('content', value);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl(page));
    document.querySelector('script[type="application/ld+json"]')!.textContent = structuredData(page);
    guide.innerHTML = renderGuide(page, router.base);
    guide.querySelectorAll<HTMLAnchorElement>('a[data-io-route]').forEach(anchor => { anchor.search = location.search; });
    guide.scrollTop = 0;
    document.querySelector('#view-label')!.textContent = device === 'camera' ? 'webcam' : device === 'audio' ? 'speaker' : device ?? 'overview';
    const home = document.querySelector<HTMLAnchorElement>('.overview-link')!;
    home.hidden = device === null;
    home.href = pagePath(HOME_PAGE, router.base);
    home.search = location.search;
  });
  const navigate = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-io-route]') : null;
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href);
    if (url.origin !== location.origin) return;
    const page = router.pageForUrl(url);
    if (!page) return;
    event.preventDefault();
    document.querySelector<HTMLDetailsElement>('.site-info')?.removeAttribute('open');
    router.navigatePage(page);
    document.querySelector<HTMLCanvasElement>('#scene')?.focus({ preventScroll: true });
  };
  document.addEventListener('click', navigate);
  return () => { unsubscribe(); document.removeEventListener('click', navigate); };
}
