import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { SEO_PAGES, SITE_URL } from '../src/seo/pages.ts';
import type { SeoPage } from '../src/seo/pages.ts';
import { pageFromPath } from '../src/seo/routes.ts';
import { renderGuide, renderMetadata, renderSitemap } from '../src/seo/render.ts';

function replaceRegion(html: string, name: string, content: string): string {
  return html.replace(new RegExp(`(<!-- io:${name}:start -->)[\\s\\S]*?(<!-- io:${name}:end -->)`), `$1\n${content}\n$2`);
}
function renderPage(html: string, page: SeoPage, base: string): string {
  return replaceRegion(replaceRegion(html, 'metadata', renderMetadata(page)), 'guide', renderGuide(page, base));
}

export function seoPlugin(): Plugin {
  let output = '';
  return {
    name: 'io-static-seo', enforce: 'post',
    configResolved(config) { output = resolve(config.root, config.build.outDir); },
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const pathname = new URL(context.originalUrl ?? context.path, 'http://localhost').pathname;
        const page = pageFromPath(pathname);
        return renderPage(html, page, page.slug ? '../' : './');
      },
    },
    async writeBundle() {
      const template = await readFile(resolve(output, 'index.html'), 'utf8');
      for (const page of SEO_PAGES.filter(page => page.slug)) {
        const directory = resolve(output, page.slug);
        await mkdir(directory, { recursive: true });
        const html = renderPage(template, page, '../').replace(/(["'])\.\/assets\//g, '$1../assets/');
        await writeFile(resolve(directory, 'index.html'), html);
      }
      await writeFile(resolve(output, 'sitemap.xml'), renderSitemap());
      await writeFile(resolve(output, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`);
    },
  };
}
