import pg from 'pg';

// Shared Postgres pool, reused across warm serverless invocations.
// Configure with DATABASE_URL, e.g. postgresql://user:pass@host:port/dbname
// Set DATABASE_SSL=true if the server requires TLS.
let pool = globalThis.__pgPool;

export function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  pool = new pg.Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  globalThis.__pgPool = pool;
  return pool;
}
