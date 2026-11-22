// Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long passphrase' npm run create-admin
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { hashPassword } from '../auth.js';
import { db, pool } from '../db/client.js';
import { admins } from '../db/schema.js';

const email = z.string().email().parse(process.env.ADMIN_EMAIL).toLowerCase();
const password = z.string().min(12, 'Password must be at least 12 characters').max(200).parse(process.env.ADMIN_PASSWORD);
const passwordHash = await hashPassword(password);

const [existing] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email));
if (existing) { await db.update(admins).set({ passwordHash, updatedAt: new Date() }).where(eq(admins.id, existing.id)); console.log('Admin password updated'); }
else { await db.insert(admins).values({ email, passwordHash }); console.log('Admin created'); }
await pool.end();
