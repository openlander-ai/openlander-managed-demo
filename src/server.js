// openlander-managed-demo — "agent attaches managed dependencies" demo.
//
// NOT a docker-compose demo. Single app (one Dockerfile, NO compose at repo
// root). It needs Postgres AND Redis — your coding agent provisions them as
// OpenLander MANAGED SERVICES over MCP and wires the env. That orchestration is
// the demo.
//
// Required env (and ONLY these — no optional env, so the scanner can't mistake
// extras for required): DATABASE_URL, REDIS_URL. (PORT is conventional.)
//   - either missing → exit 1 (crash-loop) with a clear, greppable log line
//   - both present   → /health is 200 once PG + Redis are both connected;
//                       / shows their status + a Redis-backed request counter.

const http = require('http');
const { Pool } = require('pg');
const { createClient } = require('redis');

const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;

const missing = [];
if (!DATABASE_URL || !DATABASE_URL.trim()) missing.push('DATABASE_URL');
if (!REDIS_URL || !REDIS_URL.trim()) missing.push('REDIS_URL');
if (missing.length) {
  console.error(
    `[fatal] missing required env: ${missing.join(', ')}. ` +
      'Provision managed Postgres + Redis, wire them (set_env_vars), then redeploy. Exiting.',
  );
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 8080;
const pool = new Pool({ connectionString: DATABASE_URL });
const redis = createClient({ url: REDIS_URL });
redis.on('error', (e) => console.error('[redis] error:', e.message));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pgReady = false;
let redisReady = false;

async function init() {
  for (let i = 1; i <= 30 && !pgReady; i++) {
    try {
      await pool.query('CREATE TABLE IF NOT EXISTS demo (id int PRIMARY KEY, note text)');
      await pool.query("INSERT INTO demo (id, note) VALUES (1, 'wired by your agent') ON CONFLICT (id) DO NOTHING");
      pgReady = true;
      console.log('[server] Postgres connected');
    } catch (e) {
      console.error(`[store] Postgres not ready (try ${i}): ${e.message}`);
      await sleep(2000);
    }
  }
  for (let i = 1; i <= 30 && !redisReady; i++) {
    try {
      if (!redis.isOpen) await redis.connect();
      await redis.ping();
      redisReady = true;
      console.log('[server] Redis connected');
    } catch (e) {
      console.error(`[store] Redis not ready (try ${i}): ${e.message}`);
      await sleep(2000);
    }
  }
  if (!pgReady || !redisReady) {
    console.error('[fatal] dependencies not reachable. Check DATABASE_URL / REDIS_URL. Exiting.');
    process.exit(1);
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    const ok = pgReady && redisReady;
    res.writeHead(ok ? 200 : 503, { 'content-type': 'text/plain' });
    return res.end(ok ? 'ok' : `starting up (postgres:${pgReady} redis:${redisReady})`);
  }
  try {
    const count = await redis.incr('requests');
    const { rows } = await pool.query('SELECT note FROM demo WHERE id = 1');
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(
      `openlander-managed-demo\n` +
        `Postgres connected: ${pgReady} (note: ${rows[0] ? rows[0].note : '-'})\n` +
        `Redis connected:    ${redisReady}\n` +
        `request count:      ${count}  (stored in your managed Redis)\n`,
    );
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('dependency error: ' + e.message + '\n');
  }
});

server.listen(PORT, () => console.log(`[server] openlander-managed-demo listening on :${PORT}`));
init();
