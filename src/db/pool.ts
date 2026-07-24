import { Pool } from 'pg';
import { env } from '../config.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: env.PG_POOL_MAX,
  options: '-c search_path=wpp_finance,public',
});

export async function closePool() {
  await pool.end();
}
