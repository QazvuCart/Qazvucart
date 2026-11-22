// Minimal forward-only migration runner: applies migrations/*.sql in filename order, once each.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './client.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');

const client = await pool.connect();
try {
  await client.query('CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await client.query('SELECT name FROM _migrations')).rows.map((r) => r.name));
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    await client.query('BEGIN');
    try {
      await client.query(await readFile(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log('applied', file);
    } catch (e) { await client.query('ROLLBACK'); throw e; }
  }
  console.log('migrations up to date');
} finally { client.release(); await pool.end(); }
