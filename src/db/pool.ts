import { Pool } from 'pg';
import { env } from '../config.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: env.PG_POOL_MAX,
});

pool.on('connect', (client) => {
  void client.query('SET search_path TO wpp_finance, public');
});

export async function closePool() {
  await pool.end();
}
