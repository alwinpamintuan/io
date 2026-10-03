import { HOME_PAGE, SEO_PAGES } from './pages.ts';
import type { SeoPage } from './pages.ts';

export function pageFromPath(pathname: string): SeoPage {
  const path = pathname.replace(/index\.html$/, '').replace(/\/$/, '');
  return SEO_PAGES.find(page => page.slug && path.endsWith(`/${page.slug}`)) ?? HOME_PAGE;
}

export function siteBase(pathname: string): string {
  const normalized = pathname.replace(/index\.html$/, '');
  const page = pageFromPath(normalized);
  if (page.slug) return normalized.slice(0, normalized.lastIndexOf(`/${page.slug}`) + 1);
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

export function pagePath(page: SeoPage, base: string): string {
  return `${base}${page.slug ? `${page.slug}/` : ''}`;
}
