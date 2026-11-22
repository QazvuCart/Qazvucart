import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const browserDist = resolve(dirname(fileURLToPath(import.meta.url)), '../browser');
const apiOrigin = process.env['API_ORIGIN'] || 'http://localhost:4000';
const siteUrl = (process.env['PUBLIC_SITE_URL'] || 'http://localhost:4200').replace(/\/$/, '');
const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));

const app = express();
app.set('trust proxy', 1);

// Angular SSR only renders for hosts on this allow-list (protection against forged Host headers).
// Render sets RENDER_EXTERNAL_HOSTNAME itself; PUBLIC_SITE_URL's host and extra ALLOWED_HOSTS (comma separated) are added.
const hostOf = (u: string) => { try { return new URL(u).hostname; } catch { return ''; } };
const allowedHosts = [...new Set([
  'localhost', '127.0.0.1', hostOf(siteUrl), process.env['RENDER_EXTERNAL_HOSTNAME'] ?? '',
  ...(process.env['ALLOWED_HOSTS'] ?? '').split(','),
].map((h) => h.trim()).filter(Boolean))];
const angular = new AngularNodeAppEngine({ allowedHosts });

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

// The browser calls /api on this origin (same-origin cookies, no CORS). Forward those calls to the API service.
app.use('/api', express.raw({ type: () => true, limit: '1mb' }), async (req, res, next) => {
  try {
    const headers: Record<string, string> = { 'x-forwarded-for': req.ip ?? '' };
    for (const h of ['cookie', 'content-type', 'x-csrf-token', 'accept']) { const v = req.get(h); if (v) headers[h] = v; }
    const hasBody = !['GET', 'HEAD'].includes(req.method) && Buffer.isBuffer(req.body) && req.body.length > 0;
    const r = await fetch(apiOrigin + req.originalUrl, { method: req.method, headers, body: hasBody ? new Uint8Array(req.body) : undefined, redirect: 'manual' });
    res.status(r.status);
    for (const [k, v] of r.headers) if (!['set-cookie', 'content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k)) res.setHeader(k, v);
    const cookies = r.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) { next(e); }
});

app.use(express.static(browserDist, { maxAge: '1y', index: false, redirect: false }));
app.use((req, res, next) => {
  angular.handle(req).then((r) => (r ? writeResponseToNodeResponse(r, res) : next())).catch(next);
});

if (isMainModule(import.meta.url)) {
  const port = Number(process.env['WEB_PORT'] || process.env['PORT']) || 4200;
  app.listen(port, () => console.log(`Web (SSR) listening on :${port}`));
}
export const reqHandler = createNodeRequestHandler(app);
