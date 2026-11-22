// One-process-tree start for a single free web service: migrate, then run the API (internal :4000) and the web server (public $PORT).
import { spawn, spawnSync } from 'node:child_process';

const publicPort = process.env.PORT || '10000';
const m = spawnSync('node', ['dist/db/migrate.js'], { cwd: 'api', stdio: 'inherit' });
if (m.status !== 0) { console.error('Migration failed; not starting.'); process.exit(1); }

const run = (cwd, file, extra) => spawn('node', [file], { cwd, stdio: 'inherit', env: { ...process.env, ...extra } });
const api = run('api', 'dist/server.js', { PORT: '4000' });
const web = run('web', 'dist/qazvucart/server/server.mjs', { WEB_PORT: publicPort, API_ORIGIN: process.env.API_ORIGIN || 'http://localhost:4000' });

const stop = (code) => { api.kill(); web.kill(); process.exit(code); };
for (const c of [api, web]) c.on('exit', (code) => { console.error('A service exited; stopping.'); stop(code || 1); });
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => stop(0));
