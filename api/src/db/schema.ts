import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

export const admins = pgTable('admins', {
  id: id(), email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(), createdAt: createdAt(), updatedAt: updatedAt(),
});

export const adminSessions = pgTable('admin_sessions', {
  id: id(), adminId: uuid('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), createdAt: createdAt(),
});

export const categories = pgTable('categories', {
  id: id(), name: text('name').notNull(), slug: text('slug').notNull().unique(),
  description: text('description'), active: boolean('active').notNull().default(true),
  createdAt: createdAt(), updatedAt: updatedAt(),
});

export const products = pgTable('products', {
  id: id(), productCode: text('product_code').notNull().unique(),
  name: text('name').notNull(), slug: text('slug').notNull().unique(),
  description: text('description'),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  priceMinor: integer('price_minor'), comparisonPriceMinor: integer('comparison_price_minor'),
  customisable: boolean('customisable').notNull().default(false),
  customisationInstructions: text('customisation_instructions'),
  active: boolean('active').notNull().default(false),
  featured: boolean('featured').notNull().default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [
  index('products_category_idx').on(t.categoryId),
  check('products_price_nonneg', sql`${t.priceMinor} >= 0`),
]);

export const productImages = pgTable('product_images', {
  id: id(), productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  cloudinaryPublicId: text('cloudinary_public_id').notNull(), secureUrl: text('secure_url').notNull(),
  altText: text('alt_text').notNull().default(''),
  width: integer('width'), height: integer('height'), format: text('format'),
  sortOrder: integer('sort_order').notNull().default(0), createdAt: createdAt(),
});

export const productVariants = pgTable('product_variants', {
  id: id(), productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantName: text('variant_name').notNull(), variantValue: text('variant_value').notNull(),
  additionalPriceMinor: integer('additional_price_minor').notNull().default(0),
  active: boolean('active').notNull().default(true),
}, (t) => [unique().on(t.productId, t.variantName, t.variantValue)]);

export const siteSettings = pgTable('site_settings', {
  id: id(), settingKey: text('setting_key').notNull().unique(),
  settingValue: text('setting_value').notNull().default(''), updatedAt: updatedAt(),
});
