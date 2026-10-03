import { canonicalUrl, SEO_PAGES, SOCIAL_IMAGE } from './pages.ts';
import type { SeoPage } from './pages.ts';

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function structuredData(page: SeoPage): string {
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebApplication', name: page.device ? `${page.h1} | IO` : 'IO',
    url: canonicalUrl(page), description: page.description, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any',
    browserRequirements: 'JavaScript enabled. Camera and microphone require HTTPS and explicit permission.',
    isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }).replace(/</g, '\\u003c');
}

export function renderMetadata(page: SeoPage): string {
  const title = escapeHtml(page.title), description = escapeHtml(page.description);
  return `<title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${canonicalUrl(page)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="IO" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl(page)}" />
    <meta property="og:image" content="${SOCIAL_IMAGE}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="IO illustrated workstation — Peripheral Tester" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${SOCIAL_IMAGE}" />
    <script type="application/ld+json">${structuredData(page)}</script>`;
}

export function renderGuide(page: SeoPage, base: string): string {
  return `<h1 id="test-guide-title">${escapeHtml(page.h1)}</h1>
    <p>${escapeHtml(page.intro)}</p>
    ${page.sections.map(section => `<h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.text)}</p>`).join('\n')}
    <nav aria-label="Related IO tests"><h2>Related IO tests</h2><ul>
      ${SEO_PAGES.filter(related => related !== page).map(related => `<li><a data-io-route href="${base}${related.slug ? `${related.slug}/` : ''}">${escapeHtml(related.device ? related.h1 : 'Workstation overview')}</a></li>`).join('\n')}
    </ul></nav>
    <noscript><p>The interactive tests require JavaScript. Enable JavaScript and reload to use the workstation.</p></noscript>`;
}

export function renderSitemap(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${SEO_PAGES.map(page => `  <url><loc>${canonicalUrl(page)}</loc></url>`).join('\n')}\n</urlset>\n`;
}
