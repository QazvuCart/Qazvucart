import { formatMinor } from './product.model';

/** Customer-entered details. Nothing here is stored anywhere: it only goes into the WhatsApp message. */
export interface OrderInput { name: string; phone: string; address: string; mapsLink: string; customisation: string; }
export type OrderErrors = Partial<Record<'name' | 'phone' | 'address' | 'mapsLink' | 'customisation', string>>;

export const LIMITS = { name: 80, phone: 20, address: 400, mapsLink: 500, customisation: 500 } as const;

// Control characters, zero-width and bidi override characters. Newlines are handled separately.
const INVISIBLE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤﻿]/g;

/** Single-line text: invisible characters removed, whitespace collapsed, length capped. */
export function cleanLine(s: string, max: number): string {
  return s.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Multi-line text: invisible characters removed, line breaks kept (max 6 lines), length capped. */
export function cleanBlock(s: string, max: number): string {
  const lines = s.replace(/\r\n?/g, '\n').replace(INVISIBLE, '').split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).slice(0, 6);
  return lines.join('\n').slice(0, max);
}

const MAPS_HOSTS = new Set(['maps.google.com', 'maps.app.goo.gl', 'goo.gl', 'g.co']);
const isGoogleHost = (h: string) => h === 'google.com' || h.endsWith('.google.com');

/** Returns a cleaned https Google Maps link, '' when empty, or null when the text is not an acceptable Google Maps link. */
export function normaliseMapsLink(input: string): string | null {
  const t = input.replace(INVISIBLE, '').trim();
  if (!t) return '';
  if (t.length > LIMITS.mapsLink || /\s/.test(t)) return null;
  let u: URL;
  try { u = new URL(t); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  const okHost = MAPS_HOSTS.has(host) || (isGoogleHost(host) && (u.pathname.startsWith('/maps') || host === 'maps.google.com'));
  if (!okHost) return null;
  if ((host === 'goo.gl') && !u.pathname.startsWith('/maps')) return null;
  return u.toString();
}

/** Link built from device coordinates the customer chose to share. */
export function mapsLinkFromCoords(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Validates and sanitises. `values` is always safe to use; the order may only be sent when `errors` is empty. */
export function validateOrder(input: OrderInput): { values: OrderInput; errors: OrderErrors } {
  const errors: OrderErrors = {};
  const name = cleanLine(input.name, LIMITS.name);
  const phone = cleanLine(input.phone, LIMITS.phone);
  const address = cleanBlock(input.address, LIMITS.address);
  const customisation = cleanBlock(input.customisation, LIMITS.customisation);

  if (name.length < 2) errors.name = 'Enter your name.';
  const digits = phone.replace(/\D/g, '');
  if (!/^\+?[0-9 ()-]+$/.test(phone) || digits.length < 7 || digits.length > 15) errors.phone = 'Enter a valid phone number (7 to 15 digits).';
  if (address.length < 10) errors.address = 'Enter your complete delivery address.';

  const link = normaliseMapsLink(input.mapsLink);
  if (link === null) errors.mapsLink = 'Use a Google Maps link starting with https:// (or leave this empty).';

  return { values: { name, phone, address, mapsLink: link ?? '', customisation }, errors };
}

export interface Selection { name: string; value: string; }

export interface OrderContext {
  productName: string;
  productCode: string;
  productUrl: string;
  selections: Selection[];
  quantity: number;
  unitMinor: number;
  customer: OrderInput;
}

const SIZE_OR_MODEL = /size|model|phone|device/i;
/** Continuation lines are indented so customer text can never look like a field of its own. */
const field = (s: string) => s.replace(/\n/g, '\n  ');

/** Builds the order-request text. Integer paise only; throws if the price or quantity is not usable. */
export function buildOrderMessage(c: OrderContext): string {
  if (!Number.isSafeInteger(c.unitMinor) || c.unitMinor < 0) throw new Error('Price is not set');
  if (!Number.isInteger(c.quantity) || c.quantity < 1 || c.quantity > 99) throw new Error('Invalid quantity');
  const subtotal = c.unitMinor * c.quantity;

  const sel = c.selections.filter((s) => s.value);
  const sizeModel = sel.filter((s) => SIZE_OR_MODEL.test(s.name)).map((s) => s.value);
  const variants = sel.filter((s) => !SIZE_OR_MODEL.test(s.name)).map((s) => `${s.name}: ${s.value}`);

  return [
    'QAZVUCART — ORDER REQUEST',
    '',
    `Customer Name: ${field(c.customer.name)}`,
    `Customer Phone: ${c.customer.phone}`,
    '',
    `Product: ${c.productName}`,
    `Product ID: ${c.productCode}`,
    `Product URL: ${c.productUrl}`,
    `Variant: ${variants.length ? variants.join(', ') : 'Not applicable'}`,
    `Size / Phone Model: ${sizeModel.length ? sizeModel.join(', ') : 'Not applicable'}`,
    `Quantity: ${c.quantity}`,
    `Unit Price: ${formatMinor(c.unitMinor)}`,
    `Subtotal: ${formatMinor(subtotal)}`,
    '',
    `Delivery Address: ${field(c.customer.address)}`,
    `Google Maps Location: ${c.customer.mapsLink || 'Not provided'}`,
    `Customisation Details: ${c.customer.customisation ? field(c.customer.customisation) : 'None'}`,
    '',
    'Please confirm product availability, final delivery charges, payment instructions and order acceptance.',
  ].join('\n');
}

/** https://wa.me/<digits>?text=<encoded>. Returns null unless the business number looks valid. */
export function buildWhatsAppUrl(number: string | undefined, message: string): string | null {
  const digits = (number ?? '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Instagram links are only used when they are https. */
export const safeHttps = (u: string | undefined): string | null => {
  try { return u && new URL(u).protocol === 'https:' ? u : null; } catch { return null; }
};
