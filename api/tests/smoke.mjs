// Black-box smoke test against a RUNNING API on an EMPTY database.
// Usage: API_URL=http://localhost:4000 npm run test:smoke   (needs Node 20+, no extra packages)
import assert from 'node:assert/strict';

const base = process.env.API_URL ?? 'http://localhost:4000';
let failed = 0;
async function t(name, fn) {
  try { await fn(); console.log('ok   ', name); } catch (e) { failed++; console.log('FAIL ', name, '\n      ', e.message); }
}
const call = (path, init) => fetch(base + path, { redirect: 'manual', ...init });

await t('health', async () => assert.equal((await call('/api/health')).status, 200));

await t('empty catalogue: no products, no categories', async () => {
  assert.deepEqual(await (await call('/api/products')).json(), []);
  assert.deepEqual(await (await call('/api/categories')).json(), []);
});

await t('unknown product is 404', async () => assert.equal((await call('/api/products/does-not-exist')).status, 404));

await t('public search/sort params are validated', async () => {
  assert.equal((await call('/api/products?sort=drop-table')).status, 400);
  assert.equal((await call("/api/products?q=%25%27%3B--")).status, 200);
});

await t('settings expose only whitelisted keys, never secrets', async () => {
  const s = await (await call('/api/settings')).json();
  const allowed = ['about_content', 'contact_email', 'contact_phone', 'contact_address', 'instagram_url', 'whatsapp_number',
    'policy_shipping', 'policy_returns', 'policy_privacy', 'policy_terms'];
  for (const k of Object.keys(s)) assert.ok(allowed.includes(k), k);
});

await t('every admin endpoint rejects anonymous callers', async () => {
  const id = '00000000-0000-0000-0000-000000000000';
  const routes = [['GET', '/stats'], ['GET', '/categories'], ['POST', '/categories'], ['PUT', `/categories/${id}`], ['DELETE', `/categories/${id}`],
    ['GET', '/products'], ['GET', `/products/${id}`], ['POST', '/products'], ['PUT', `/products/${id}`], ['PATCH', `/products/${id}`],
    ['DELETE', `/products/${id}`], ['POST', '/uploads/sign'], ['GET', '/settings'], ['PUT', '/settings'], ['GET', '/me'], ['POST', '/logout']];
  for (const [method, path] of routes) {
    const r = await call('/api/admin' + path, { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
    assert.equal(r.status, 401, `${method} ${path} returned ${r.status}`);
  }
});

await t('forged session cookie is rejected', async () => {
  const r = await call('/api/admin/products', { headers: { cookie: 'qz_session=forged' } });
  assert.equal(r.status, 401);
});

await t('login rejects bad input and wrong credentials without leaking which part failed', async () => {
  const post = (b) => call('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  assert.equal((await post({})).status, 400);
  const r = await post({ email: 'nobody@example.com', password: 'wrong-password' });
  assert.equal(r.status, 401);
  assert.equal((await r.json()).error, 'Email or password is incorrect');
});

await t('security headers present, no x-powered-by', async () => {
  const r = await call('/api/health');
  assert.equal(r.headers.get('x-powered-by'), null);
  assert.ok(r.headers.get('x-content-type-options'));
});

await t('errors do not leak internals', async () => {
  const r = await call('/api/products', { method: 'POST' });
  const body = await r.text();
  assert.doesNotMatch(body, /at .*\.(ts|js):\d+|postgres|SESSION_SECRET|password_hash/i);
});

console.log(failed ? `\n${failed} test(s) failed` : '\nAll smoke tests passed');
process.exit(failed ? 1 : 0);
