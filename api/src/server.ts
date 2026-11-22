import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import { env } from './env.js';
import { HttpError } from './http-error.js';
import { adminAuthRouter } from './routes/admin-auth.js';
import { adminRouter } from './routes/admin.js';
import { publicRouter } from './routes/public.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/admin', adminAuthRouter);
app.use('/api/admin', adminRouter);
app.use('/api', publicRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if ((err as { code?: string })?.code === '23505') return res.status(409).json({ error: 'That slug, product ID or variant already exists' });
  console.error(err instanceof Error ? err.message : 'Unknown error'); // no stack or secrets to clients
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
