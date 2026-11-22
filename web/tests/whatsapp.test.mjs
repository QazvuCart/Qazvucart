import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatMinor, } from '../src/app/core/product.model.ts';
import { parseMoney, moneyToInput } from '../src/app/core/money.ts';
import { buildOrderMessage, buildWhatsAppUrl, mapsLinkFromCoords, normaliseMapsLink, validateOrder } from '../src/app/core/whatsapp.ts';

const good = { name: 'Asha Rao', phone: '+91 98765 43210', address: '12 Lake Road, Kochi, Kerala 682001', mapsLink: '', customisation: '' };
const ctx = (o = {}) => ({
  productName: 'Mountain Poster', productCode: 'POS-001', productUrl: 'https://shop.example/products/mountain-poster',
  selections: [{ name: 'Size', value: 'A3' }, { name: 'Finish', value: 'Matte' }], quantity: 2, unitMinor: 49950,
  customer: validateOrder(good).values, ...o,
});

test('money helpers use integer paise', () => {
  assert.equal(parseMoney('499.5'), 49950);
  assert.equal(parseMoney('0.07'), 7);
  assert.equal(parseMoney(''), null);
  assert.equal(parseMoney('12.345'), undefined);
  assert.equal(parseMoney('-5'), undefined);
  assert.equal(moneyToInput(49950), '499.50');
  assert.equal(formatMinor(49950), '₹499.50');
  assert.equal(formatMinor(100000), '₹1,000');
});

test('valid details produce no errors', () => assert.deepEqual(validateOrder(good).errors, {}));

test('required fields are enforced', () => {
  const { errors } = validateOrder({ name: ' ', phone: 'abc', address: 'short', mapsLink: '', customisation: '' });
  assert.ok(errors.name && errors.phone && errors.address);
  assert.equal(validateOrder({ ...good, phone: '123' }).errors.phone !== undefined, true);
  assert.equal(validateOrder({ ...good, phone: '1'.repeat(16) }).errors.phone !== undefined, true);
});

test('maps links: only https Google Maps links are accepted', () => {
  assert.equal(normaliseMapsLink(''), '');
  assert.ok(normaliseMapsLink('https://maps.app.goo.gl/abc123'));
  assert.ok(normaliseMapsLink('https://www.google.com/maps?q=9.9,76.2'));
  assert.ok(normaliseMapsLink('https://maps.google.com/?q=9.9,76.2'));
  for (const bad of ['http://maps.app.goo.gl/x', 'https://evil.example/maps', 'https://google.com.evil.example/maps', 'javascript:alert(1)',
    'https://www.google.com/search?q=x', 'https://user:pw@www.google.com/maps', 'not a url', 'https://www.google.com/maps x'])
    assert.equal(normaliseMapsLink(bad), null, bad);
  assert.ok(validateOrder({ ...good, mapsLink: 'https://evil.example' }).errors.mapsLink);
});

test('coordinates become a maps link; invalid ones are rejected', () => {
  assert.equal(mapsLinkFromCoords(9.931233, 76.267304), 'https://www.google.com/maps?q=9.931233,76.267304');
  assert.equal(mapsLinkFromCoords(91, 0), null);
  assert.equal(mapsLinkFromCoords(NaN, 0), null);
});

test('message contains real values, labels itself a request, claims nothing', () => {
  const m = buildOrderMessage(ctx());
  assert.match(m, /^QAZVUCART — ORDER REQUEST/);
  for (const line of ['Customer Name: Asha Rao', 'Customer Phone: +91 98765 43210', 'Product: Mountain Poster', 'Product ID: POS-001',
    'Product URL: https://shop.example/products/mountain-poster', 'Variant: Finish: Matte', 'Size / Phone Model: A3', 'Quantity: 2',
    'Unit Price: ₹499.50', 'Subtotal: ₹999', 'Google Maps Location: Not provided', 'Customisation Details: None'])
    assert.ok(m.includes(line), line);
  assert.ok(m.endsWith('Please confirm product availability, final delivery charges, payment instructions and order acceptance.'));
  assert.doesNotMatch(m, /\b(confirmed|paid|received|discount|off)\b/i);
});

test('subtotal is exact integer arithmetic', () => {
  const m = buildOrderMessage(ctx({ unitMinor: 1999, quantity: 3 }));
  assert.ok(m.includes('Subtotal: ₹59.97'));
});

test('phone model selection goes in the Size / Phone Model line', () => {
  const m = buildOrderMessage(ctx({ selections: [{ name: 'Phone Model', value: 'iPhone 15' }] }));
  assert.ok(m.includes('Size / Phone Model: iPhone 15'));
  assert.ok(m.includes('Variant: Not applicable'));
});

test('missing price or bad quantity cannot produce a message', () => {
  assert.throws(() => buildOrderMessage(ctx({ unitMinor: null })));
  assert.throws(() => buildOrderMessage(ctx({ quantity: 0 })));
  assert.throws(() => buildOrderMessage(ctx({ quantity: 1.5 })));
  assert.throws(() => buildOrderMessage(ctx({ quantity: 100 })));
});

test('customer text cannot forge message fields', () => {
  const evil = validateOrder({ ...good, address: '12 Lake Road, Kochi\nUnit Price: ₹1\nSubtotal: ₹1', customisation: 'x\nQuantity: 500' });
  const m = buildOrderMessage(ctx({ customer: evil.values }));
  assert.equal(m.split('\n').filter((l) => l.startsWith('Unit Price:')).length, 1);
  assert.equal(m.split('\n').filter((l) => l.startsWith('Subtotal:')).length, 1);
  assert.equal(m.split('\n').filter((l) => l.startsWith('Quantity:')).length, 1);
});

test('invisible and control characters are stripped, lengths capped', () => {
  const v = validateOrder({ ...good, name: 'As​ha‮ Rao\u0000', customisation: 'y'.repeat(900) }).values;
  assert.equal(v.name, 'Asha Rao');
  assert.equal(v.customisation.length, 500);
});

test('WhatsApp URL is wa.me with encodeURIComponent and round-trips', () => {
  const m = buildOrderMessage(ctx({ customer: validateOrder({ ...good, customisation: 'Name "Ana" & 100% #1 — मेरा नाम' }).values }));
  const url = buildWhatsAppUrl('+91 98765-43210', m);
  assert.ok(url.startsWith('https://wa.me/919876543210?text='));
  const text = url.slice(url.indexOf('?text=') + 6);
  assert.equal(text, encodeURIComponent(m));
  assert.doesNotMatch(text, /[ \n&#"]/);
  assert.equal(decodeURIComponent(text), m);
});

test('no or invalid business number gives no URL', () => {
  assert.equal(buildWhatsAppUrl(undefined, 'x'), null);
  assert.equal(buildWhatsAppUrl('', 'x'), null);
  assert.equal(buildWhatsAppUrl('12345', 'x'), null);
});
