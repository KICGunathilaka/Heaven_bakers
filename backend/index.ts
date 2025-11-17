import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './src/db';
import { Pool } from 'pg';
import authRouter from './src/routes/auth';
import bcrypt from 'bcryptjs';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

async function init() {
  const targetUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/Heaven_bakers';
  const urlObj = new URL(targetUrl);
  const dbName = urlObj.pathname.slice(1);
  const adminUrl = new URL(targetUrl);
  adminUrl.pathname = '/postgres';

  try {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
    `);
  } catch (e: any) {
    if (e?.message && /does not exist/i.test(e.message)) {
      const adminPool = new Pool({ connectionString: adminUrl.toString() });
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      await adminPool.end();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          user_id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password TEXT NOT NULL
        )
      `);
    } else {
      throw e;
    }
  }

  const username = 'admin';
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (username, password) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
    [username, hash]
  );
}

init().then(() => {
  app.listen(port, () => { console.log(`Server listening on ${port}`); });
}).catch((e) => {
  console.error('Init error', e);
  app.listen(port, () => { console.log(`Server listening on ${port}`); });
});