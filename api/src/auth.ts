import argon2 from 'argon2';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { RequestHandler, Response } from 'express';
import { db } from './db/client.js';
import { adminSessions, admins } from './db/schema.js';
import { env } from './env.js';

declare global {
  namespace Express {
    interface Request { admin?: { id: string; email: string }; sessionToken?: string }
  }
}

export const COOKIE = 'qz_session';
const TTL_MS = 8 * 60 * 60 * 1000;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** CSRF token is an HMAC of the session token: the browser gets it from /me, forged cross-site requests cannot. */
export const csrfFor = (sessionToken: string) => createHmac('sha256', env.SESSION_SECRET).update(sessionToken).digest('hex');

export const hashPassword = (pw: string) => argon2.hash(pw, { type: argon2.argon2id });
// Verified against when the email is unknown, so response time does not reveal which emails exist.
export const DUMMY_HASH = await hashPassword('not-a-real-password');
export const verifyPassword = (hash: string, pw: string) => argon2.verify(hash, pw).catch(() => false);

export async function startSession(adminId: string, res: Response): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db.insert(adminSessions).values({ adminId, tokenHash: sha(token), expiresAt: new Date(Date.now() + TTL_MS) });
  res.cookie(COOKIE, token, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', maxAge: TTL_MS, path: '/' });
  return csrfFor(token);
}

export async function endSession(token: string | undefined, res: Response) {
  if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, sha(token)));
  res.clearCookie(COOKIE, { path: '/' });
}

export const requireAdmin: RequestHandler = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const token = req.cookies?.[COOKIE];
    if (typeof token !== 'string' || token.length > 100) return res.status(401).json({ error: 'Unauthorized' });
    const [row] = await db.select({ id: admins.id, email: admins.email, exp: adminSessions.expiresAt })
      .from(adminSessions).innerJoin(admins, eq(admins.id, adminSessions.adminId))
      .where(eq(adminSessions.tokenHash, sha(token))).limit(1);
    if (!row || row.exp < new Date()) return res.status(401).json({ error: 'Unauthorized' });

    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const got = Buffer.from(req.get('x-csrf-token') ?? '');
      const want = Buffer.from(csrfFor(token));
      if (got.length !== want.length || !timingSafeEqual(got, want)) return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    req.admin = { id: row.id, email: row.email };
    req.sessionToken = token;
    next();
  } catch (e) { next(e); }
};
