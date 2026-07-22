import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';
import { env } from '../config.js';
import { logger } from '../logger.js';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: env.PG_POOL_MAX,
});

await pool.query('CREATE SCHEMA IF NOT EXISTS wpp_finance');
await pool.query(`
  CREATE TABLE IF NOT EXISTS wpp_finance.tbl_migration (
    cn_migration BIGSERIAL PRIMARY KEY,
    nm_arquivo VARCHAR(255) NOT NULL UNIQUE,
    dt_aplicacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const migrationsDir = join(process.cwd(), 'migrations');
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

for (const file of files) {
  const applied = await pool.query('SELECT 1 FROM wpp_finance.tbl_migration WHERE nm_arquivo = $1', [file]);

  if ((applied.rowCount ?? 0) > 0) {
    logger.info({ file }, 'Migration já aplicada');
    continue;
  }

  const sql = await readFile(join(migrationsDir, file), 'utf8');

  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO wpp_finance.tbl_migration (nm_arquivo) VALUES ($1)', [file]);
    await pool.query('COMMIT');
    logger.info({ file }, 'Migration aplicada');
  } catch (error) {
    await pool.query('ROLLBACK');
    logger.error({ error, file }, 'Falha ao aplicar migration');
    throw error;
  }
}

await pool.end();
