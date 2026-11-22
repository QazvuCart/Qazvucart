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
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Print variable names only, never their values.
  console.error('Invalid environment:', Object.keys(parsed.error.flatten().fieldErrors).join(', '));
  process.exit(1);
}
export const env = parsed.data;
