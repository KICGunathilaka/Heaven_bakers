import { Pool } from 'pg';

export let pool: Pool;

export function ensurePool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    pool = new Pool({ connectionString: url });
  }
  return pool;
}