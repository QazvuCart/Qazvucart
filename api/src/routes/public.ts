import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { categories, productImages, productVariants, products, siteSettings } from '../db/schema.js';
import { env } from '../env.js';

export const publicRouter = Router();

// A product is public only when active and not archived.
const visible = and(eq(products.active, true), isNull(products.archivedAt));
const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');

const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).default('newest'),
  featured: z.enum(['true']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(60),
});

publicRouter.get('/products', async (req, res, next) => {
  try {
    const q = listQuery.parse(req.query);
    const term = q.q ? `%${escapeLike(q.q)}%` : null;
    const where = and(
      visible,
      q.featured ? eq(products.featured, true) : undefined,
      term ? or(ilike(products.name, term), ilike(products.description, term)) : undefined,
      q.category
        ? inArray(products.categoryId, db.select({ id: categories.id }).from(categories)
            .where(and(eq(categories.slug, q.category), eq(categories.active, true))))
        : undefined,
    );
    const order = q.sort === 'price-asc' ? sql`${products.priceMinor} asc nulls last`
      : q.sort === 'price-desc' ? sql`${products.priceMinor} desc nulls last`
      : desc(products.createdAt);

    const rows = await db.select({
      id: products.id, slug: products.slug, name: products.name,
      priceMinor: products.priceMinor, customisable: products.customisable,
    }).from(products).where(where).orderBy(order).limit(q.limit);

    const imgs = rows.length
      ? await db.select({
          productId: productImages.productId, url: productImages.secureUrl, alt: productImages.altText,
          width: productImages.width, height: productImages.height,
        }).from(productImages).where(inArray(productImages.productId, rows.map((r) => r.id))).orderBy(asc(productImages.sortOrder))
      : [];

    res.json(rows.map(({ id, ...p }) => {
      const first = imgs.find((i) => i.productId === id);
      return { ...p, image: first ? { url: first.url, alt: first.alt, width: first.width, height: first.height } : null };
    }));
  } catch (e) { next(e); }
});

publicRouter.get('/products/:slug', async (req, res, next) => {
  try {
    const slug = z.string().min(1).max(120).parse(req.params.slug);
    const [p] = await db.select({
      id: products.id, productCode: products.productCode, slug: products.slug, name: products.name,
      description: products.description, priceMinor: products.priceMinor, customisable: products.customisable,
      customisationInstructions: products.customisationInstructions,
      categoryName: categories.name, categorySlug: categories.slug,
    }).from(products).leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(visible, eq(products.slug, slug))).limit(1);
    if (!p) return res.status(404).json({ error: 'Not found' });

    const [images, variants] = await Promise.all([
      db.select({ url: productImages.secureUrl, alt: productImages.altText, width: productImages.width, height: productImages.height })
        .from(productImages).where(eq(productImages.productId, p.id)).orderBy(asc(productImages.sortOrder)),
      db.select({ id: productVariants.id, name: productVariants.variantName, value: productVariants.variantValue,
                  additionalPriceMinor: productVariants.additionalPriceMinor })
        .from(productVariants).where(and(eq(productVariants.productId, p.id), eq(productVariants.active, true)))
        .orderBy(asc(productVariants.variantName), asc(productVariants.variantValue)),
    ]);
    const { id, categoryName, categorySlug, ...rest } = p;
    res.json({ ...rest, category: categorySlug ? { name: categoryName, slug: categorySlug } : null, images, variants });
  } catch (e) { next(e); }
});

// Only categories that currently have at least one visible product.
publicRouter.get('/categories', async (_req, res, next) => {
  try {
    const rows = await db.select({ slug: categories.slug, name: categories.name, description: categories.description, n: count(products.id) })
      .from(categories)
      .innerJoin(products, and(eq(products.categoryId, categories.id), visible))
      .where(eq(categories.active, true)).groupBy(categories.id).orderBy(asc(categories.name));
    res.json(rows.map(({ n, ...c }) => c));
  } catch (e) { next(e); }
});

// Whitelisted, non-secret settings only. Never expose arbitrary keys.
const PUBLIC_KEYS = ['about_content', 'contact_email', 'contact_phone', 'contact_address', 'instagram_url', 'whatsapp_number',
  'policy_shipping', 'policy_returns', 'policy_privacy', 'policy_terms'];

publicRouter.get('/settings', async (_req, res, next) => {
  try {
    const rows = await db.select({ k: siteSettings.settingKey, v: siteSettings.settingValue }).from(siteSettings)
      .where(inArray(siteSettings.settingKey, PUBLIC_KEYS));
    const out: Record<string, string> = {};
    for (const { k, v } of rows) if (v.trim()) out[k] = v;
    if (!out['whatsapp_number'] && env.WHATSAPP_NUMBER) out['whatsapp_number'] = env.WHATSAPP_NUMBER;
    if (!out['instagram_url'] && env.INSTAGRAM_URL) out['instagram_url'] = env.INSTAGRAM_URL;
    if (out['whatsapp_number']) out['whatsapp_number'] = out['whatsapp_number'].replace(/\D/g, '');
    res.json(out);
  } catch (e) { next(e); }
});
