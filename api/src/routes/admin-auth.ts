import { eq } from 'drizzle-orm';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { COOKIE, DUMMY_HASH, csrfFor, endSession, requireAdmin, startSession, verifyPassword } from '../auth.js';
import { db } from '../db/client.js';
import { adminSessions, admins } from '../db/schema.js';
import { lt } from 'drizzle-orm';

export const adminAuthRouter = Router();
adminAuthRouter.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' } });

adminAuthRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) }).parse(req.body);
    const [a] = await db.select().from(admins).where(eq(admins.email, email.toLowerCase())).limit(1);
    const ok = await verifyPassword(a?.passwordHash ?? DUMMY_HASH, password);
    if (!a || !ok) return res.status(401).json({ error: 'Email or password is incorrect' });
    await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
    res.json({ email: a.email, csrf: await startSession(a.id, res) });
  } catch (e) { next(e); }
});

adminAuthRouter.get('/me', requireAdmin, (req, res) => res.json({ email: req.admin!.email, csrf: csrfFor(req.sessionToken!) }));

adminAuthRouter.post('/logout', requireAdmin, async (req, res, next) => {
  try { await endSession(req.cookies?.[COOKIE], res); res.json({ ok: true }); } catch (e) { next(e); }
});
