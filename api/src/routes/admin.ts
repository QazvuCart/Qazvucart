import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, count } from 'drizzle-orm';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAdmin } from '../auth.js';
import { Asset, destroyAssets, signUpload, verifyAsset } from '../cloudinary.js';
import { db } from '../db/client.js';
import { categories, productImages, productVariants, products, siteSettings } from '../db/schema.js';
import { HttpError } from '../http-error.js';
import { PUBLIC_KEYS } from './public.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const slug = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');
const id = z.string().uuid();
const optText = (max: number) => z.string().trim().max(max).nullable().transform((v) => (v ? v : null));
const minor = z.number().int().min(0).max(100_000_000).nullable();

// ---------- dashboard ----------
adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [s] = await db.select({
      total: count(),
      active: sql<number>`count(*) filter (where ${products.active} and ${products.archivedAt} is null)`.mapWith(Number),
      inactive: sql<number>`count(*) filter (where not ${products.active} and ${products.archivedAt} is null)`.mapWith(Number),
      archived: sql<number>`count(*) filter (where ${products.archivedAt} is not null)`.mapWith(Number),
    }).from(products);
    const [c] = await db.select({ total: count() }).from(categories);
    const recent = await db.select({ id: products.id, name: products.name, updatedAt: products.updatedAt })
      .from(products).orderBy(desc(products.updatedAt)).limit(5);
    res.json({ products: s, categories: c.total, recent });
  } catch (e) { next(e); }
});

// ---------- categories ----------
const categoryInput = z.object({ name: z.string().trim().min(1).max(80), slug, description: optText(500), active: z.boolean() });

adminRouter.get('/categories', async (_req, res, next) => {
  try {
    res.json(await db.select({
      id: categories.id, name: categories.name, slug: categories.slug, description: categories.description, active: categories.active,
      productCount: sql<number>`(select count(*) from ${products} where ${products.categoryId} = ${categories.id})`.mapWith(Number),
    }).from(categories).orderBy(asc(categories.name)));
  } catch (e) { next(e); }
});
adminRouter.post('/categories', async (req, res, next) => {
  try { const [r] = await db.insert(categories).values(categoryInput.parse(req.body)).returning({ id: categories.id }); res.status(201).json(r); }
  catch (e) { next(e); }
});
adminRouter.put('/categories/:id', async (req, res, next) => {
  try {
    const r = await db.update(categories).set({ ...categoryInput.parse(req.body), updatedAt: new Date() })
      .where(eq(categories.id, id.parse(req.params.id))).returning({ id: categories.id });
    if (!r.length) throw new HttpError(404, 'Not found');
    res.json(r[0]);
  } catch (e) { next(e); }
});
// Products in the category are kept (category_id becomes empty).
adminRouter.delete('/categories/:id', async (req, res, next) => {
  try { await db.delete(categories).where(eq(categories.id, id.parse(req.params.id))); res.json({ ok: true }); } catch (e) { next(e); }
});

// ---------- products ----------
const productInput = z.object({
  productCode: z.string().trim().regex(/^[A-Za-z0-9_-]{1,40}$/, 'Product ID: letters, numbers, - and _ only'),
  name: z.string().trim().min(1).max(120),
  slug,
  description: optText(5000),
  categoryId: id.nullable(),
  priceMinor: minor,
  comparisonPriceMinor: minor,
  customisable: z.boolean(),
  customisationInstructions: optText(1000),
  active: z.boolean(),
  featured: z.boolean(),
  variants: z.array(z.object({
    variantName: z.string().trim().min(1).max(40), variantValue: z.string().trim().min(1).max(60),
    additionalPriceMinor: z.number().int().min(0).max(100_000_000), active: z.boolean(),
  })).max(100),
  images: z.array(z.object({ publicId: z.string().min(1).max(200), altText: z.string().trim().min(1, 'Alt text is required').max(200) })).max(10),
}).refine((p) => p.comparisonPriceMinor === null || (p.priceMinor !== null && p.comparisonPriceMinor > p.priceMinor),
  { message: 'Comparison price must be higher than the price', path: ['comparisonPriceMinor'] })
  .refine((p) => new Set(p.variants.map((v) => `${v.variantName}\u0000${v.variantValue}`)).size === p.variants.length,
  { message: 'Duplicate variant', path: ['variants'] });
type ProductInput = z.infer<typeof productInput>;

adminRouter.get('/products', async (req, res, next) => {
  try {
    const q = z.object({ q: z.string().trim().max(80).optional(), status: z.enum(['all', 'active', 'inactive', 'archived']).default('all') }).parse(req.query);
    const term = q.q ? `%${q.q.replace(/[\\%_]/g, '\\$&')}%` : null;
    const where = and(
      term ? or(ilike(products.name, term), ilike(products.productCode, term)) : undefined,
      q.status === 'archived' ? isNotNull(products.archivedAt) : q.status === 'all' ? undefined : isNull(products.archivedAt),
      q.status === 'active' ? eq(products.active, true) : q.status === 'inactive' ? eq(products.active, false) : undefined,
    );
    const rows = await db.select({
      id: products.id, productCode: products.productCode, name: products.name, slug: products.slug, priceMinor: products.priceMinor,
      active: products.active, featured: products.featured, archivedAt: products.archivedAt, updatedAt: products.updatedAt,
      categoryName: categories.name,
    }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(where).orderBy(desc(products.updatedAt)).limit(200);
    const imgs = rows.length ? await db.select({ productId: productImages.productId, url: productImages.secureUrl })
      .from(productImages).where(inArray(productImages.productId, rows.map((r) => r.id))).orderBy(asc(productImages.sortOrder)) : [];
    res.json(rows.map((r) => ({ ...r, imageUrl: imgs.find((i) => i.productId === r.id)?.url ?? null })));
  } catch (e) { next(e); }
});

adminRouter.get('/products/:id', async (req, res, next) => {
  try {
    const pid = id.parse(req.params.id);
    const [p] = await db.select().from(products).where(eq(products.id, pid)).limit(1);
    if (!p) throw new HttpError(404, 'Not found');
    const [images, variants] = await Promise.all([
      db.select({ publicId: productImages.cloudinaryPublicId, url: productImages.secureUrl, altText: productImages.altText,
                  width: productImages.width, height: productImages.height }).from(productImages)
        .where(eq(productImages.productId, pid)).orderBy(asc(productImages.sortOrder)),
      db.select({ variantName: productVariants.variantName, variantValue: productVariants.variantValue,
                  additionalPriceMinor: productVariants.additionalPriceMinor, active: productVariants.active })
        .from(productVariants).where(eq(productVariants.productId, pid)).orderBy(asc(productVariants.variantName), asc(productVariants.variantValue)),
    ]);
    res.json({ ...p, images, variants });
  } catch (e) { next(e); }
});

/** Deletes Cloudinary files only when no product row references them any more. */
async function cleanupAssets(publicIds: string[]) {
  if (!publicIds.length) return;
  const still = await db.select({ p: productImages.cloudinaryPublicId }).from(productImages).where(inArray(productImages.cloudinaryPublicId, publicIds));
  const used = new Set(still.map((r) => r.p));
  await destroyAssets(publicIds.filter((p) => !used.has(p)));
}

async function saveProduct(existingId: string | null, input: ProductInput): Promise<string> {
  const current = existingId
    ? await db.select().from(productImages).where(eq(productImages.productId, existingId))
    : [];
  const known = new Set(current.map((c) => c.cloudinaryPublicId));
  const verified = new Map<string, Asset>();
  for (const img of input.images) if (!known.has(img.publicId) && !verified.has(img.publicId)) verified.set(img.publicId, await verifyAsset(img.publicId));

  const removed: string[] = [];
  const productId = await db.transaction(async (tx) => {
    const { variants, images, ...fields } = input;
    let pid = existingId;
    if (pid) {
      const r = await tx.update(products).set({ ...fields, updatedAt: new Date() }).where(eq(products.id, pid)).returning({ id: products.id });
      if (!r.length) throw new HttpError(404, 'Not found');
    } else {
      const [r] = await tx.insert(products).values(fields).returning({ id: products.id });
      pid = r.id;
    }
    await tx.delete(productVariants).where(eq(productVariants.productId, pid));
    if (variants.length) await tx.insert(productVariants).values(variants.map((v) => ({ productId: pid!, ...v })));

    const keep = new Set(images.map((i) => i.publicId));
    for (const c of current) if (!keep.has(c.cloudinaryPublicId)) { await tx.delete(productImages).where(eq(productImages.id, c.id)); removed.push(c.cloudinaryPublicId); }
    for (const [i, img] of images.entries()) {
      const a = verified.get(img.publicId);
      if (a) await tx.insert(productImages).values({ productId: pid, cloudinaryPublicId: img.publicId, secureUrl: a.secureUrl, altText: img.altText,
        width: a.width, height: a.height, format: a.format, sortOrder: i });
      else await tx.update(productImages).set({ altText: img.altText, sortOrder: i })
        .where(and(eq(productImages.productId, pid), eq(productImages.cloudinaryPublicId, img.publicId)));
    }
    return pid;
  });
  await cleanupAssets(removed);
  return productId;
}

adminRouter.post('/products', async (req, res, next) => {
  try { res.status(201).json({ id: await saveProduct(null, productInput.parse(req.body)) }); } catch (e) { next(e); }
});
adminRouter.put('/products/:id', async (req, res, next) => {
  try { res.json({ id: await saveProduct(id.parse(req.params.id), productInput.parse(req.body)) }); } catch (e) { next(e); }
});

// Quick toggles from the product list.
adminRouter.patch('/products/:id', async (req, res, next) => {
  try {
    const patch = z.object({ active: z.boolean().optional(), featured: z.boolean().optional(), archived: z.boolean().optional() }).parse(req.body);
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.active !== undefined) set.active = patch.active;
    if (patch.featured !== undefined) set.featured = patch.featured;
    if (patch.archived !== undefined) { set.archivedAt = patch.archived ? new Date() : null; if (patch.archived) { set.active = false; set.featured = false; } }
    const r = await db.update(products).set(set).where(eq(products.id, id.parse(req.params.id))).returning({ id: products.id });
    if (!r.length) throw new HttpError(404, 'Not found');
    res.json({ ok: true });
  } catch (e) { next(e); }
});

adminRouter.delete('/products/:id', async (req, res, next) => {
  try {
    const pid = id.parse(req.params.id);
    const imgs = await db.select({ p: productImages.cloudinaryPublicId }).from(productImages).where(eq(productImages.productId, pid));
    const r = await db.delete(products).where(eq(products.id, pid)).returning({ id: products.id });
    if (!r.length) throw new HttpError(404, 'Not found');
    await cleanupAssets(imgs.map((i) => i.p));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- uploads ----------
const signLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many upload requests. Try again shortly.' } });
adminRouter.post('/uploads/sign', signLimiter, (_req, res, next) => { try { res.json(signUpload()); } catch (e) { next(e); } });

// ---------- settings ----------
adminRouter.get('/settings', async (_req, res, next) => {
  try {
    const rows = await db.select({ k: siteSettings.settingKey, v: siteSettings.settingValue }).from(siteSettings).where(inArray(siteSettings.settingKey, PUBLIC_KEYS));
    const out: Record<string, string> = Object.fromEntries(PUBLIC_KEYS.map((k) => [k, '']));
    for (const { k, v } of rows) out[k] = v;
    res.json(out);
  } catch (e) { next(e); }
});
adminRouter.put('/settings', async (req, res, next) => {
  try {
    const body = z.record(z.string().max(10000)).parse(req.body);
    const entries = Object.entries(body).filter(([k]) => PUBLIC_KEYS.includes(k));
    for (const [k, raw] of entries) {
      const v = raw.trim();
      if (k === 'whatsapp_number' && v && !/^\d{8,15}$/.test(v)) throw new HttpError(400, 'WhatsApp number: digits only, with country code, no + or spaces');
      if (k === 'instagram_url' && v && !/^https:\/\//i.test(v)) throw new HttpError(400, 'Instagram link must start with https://');
      await db.insert(siteSettings).values({ settingKey: k, settingValue: v })
        .onConflictDoUpdate({ target: siteSettings.settingKey, set: { settingValue: v, updatedAt: new Date() } });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});


