import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { hashPassword, verifyPassword } from './auth.js';
import { db } from './db/client.js';
import { adminSessions, admins } from './db/schema.js';
import { env } from './env.js';

/**
 * For hosts without a shell (e.g. Render's free plan): creates or updates the administrator from the
 * ADMIN_EMAIL and ADMIN_PASSWORD environment variables on every start. The password is stored only as an Argon2id hash.
 * Changing ADMIN_PASSWORD changes the login and signs out that admin's existing sessions. Removing the variables stops the sync
 * but does not delete the admin.
 */
export async function ensureAdminFromEnv() {
  if (!env.ADMIN_EMAIL && !env.ADMIN_PASSWORD) return;
  const parsed = z.object({ email: z.string().email().max(200), password: z.string().min(12).max(200) })
    .safeParse({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
  if (!parsed.success) {
    console.error('Admin bootstrap skipped: ADMIN_EMAIL must be a valid email and ADMIN_PASSWORD at least 12 characters.');
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const [existing] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  if (!existing) {
    await db.insert(admins).values({ email, passwordHash: await hashPassword(parsed.data.password) });
    console.log('Admin account created from environment');
  } else if (!(await verifyPassword(existing.passwordHash, parsed.data.password))) {
    await db.update(admins).set({ passwordHash: await hashPassword(parsed.data.password), updatedAt: new Date() }).where(eq(admins.id, existing.id));
    await db.delete(adminSessions).where(eq(adminSessions.adminId, existing.id));
    console.log('Admin password updated from environment');
  }
}
