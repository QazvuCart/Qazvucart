import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const browserDist = resolve(dirname(fileURLToPath(import.meta.url)), '../browser');
const apiOrigin = process.env['API_ORIGIN'] || 'http://localhost:4000';
const siteUrl = (process.env['PUBLIC_SITE_URL'] || 'http://localhost:4200').replace(/\/$/, '');
const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));

const app = express();
const angular = new AngularNodeAppEngine();

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${siteUrl}/sitemap.xml\n`);
});

// Built from real, visible products only.
app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const r = await fetch(`${apiOrigin}/api/products?limit=200`);
    const items = r.ok ? ((await r.json()) as { slug: string }[]) : [];
    const paths = ['/', '/products', '/about', '/contact', '/policies/shipping', '/policies/returns', '/policies/privacy', '/policies/terms',
      ...items.map((i) => `/products/${encodeURIComponent(i.slug)}`)];
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      paths.map((p) => `  <url><loc>${xml(siteUrl + p)}</loc></url>`).join('\n') + `\n</urlset>\n`);
  } catch (e) { next(e); }
});

app.use(express.static(browserDist, { maxAge: '1y', index: false, redirect: false }));
app.use((req, res, next) => {
  angular.handle(req).then((r) => (r ? writeResponseToNodeResponse(r, res) : next())).catch(next);
});

if (isMainModule(import.meta.url)) {
  const port = Number(process.env['WEB_PORT']) || 4200;
  app.listen(port, () => console.log(`Web (SSR) listening on :${port}`));
}
export const reqHandler = createNodeRequestHandler(app);
