import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  // Optional public contact defaults. Admin settings (site_settings) override them.
  WHATSAPP_NUMBER: z.string().optional(),
  INSTAGRAM_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().regex(/^[A-Za-z0-9_\/-]{1,60}$/).default('qazvucart/products'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Print variable names only, never their values.
  console.error('Invalid environment:', Object.keys(parsed.error.flatten().fieldErrors).join(', '));
  process.exit(1);
}
export const env = parsed.data;
