import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './src/db';
import { Pool } from 'pg';
import authRouter from './src/routes/auth';
import productsRouter from './src/routes/products';
import barcodeRouter from './src/routes/barcode';
import vendorsRouter from './src/routes/vendors';
import bcrypt from 'bcryptjs';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/barcode', barcodeRouter);
app.use('/api/vendors', vendorsRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

async function init() {
  const targetUrl = process.env.DATABASE_URL;
  if (!targetUrl) throw new Error('DATABASE_URL is required');
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
    await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      product_id SERIAL PRIMARY KEY,
      product_name VARCHAR(200) NOT NULL,
      sku VARCHAR(100),
      category VARCHAR(100)
    )
    `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS vendors (
      vendor_id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      contact_no1 VARCHAR(20),
      contact_no2 VARCHAR(20),
      email VARCHAR(200),
      address TEXT
    )
    `);
    await pool.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key`);
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
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          product_id SERIAL PRIMARY KEY,
          product_name VARCHAR(200) NOT NULL,
          sku VARCHAR(100),
          category VARCHAR(100)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS vendors (
          vendor_id SERIAL PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          contact_no1 VARCHAR(20),
          contact_no2 VARCHAR(20),
          email VARCHAR(200),
          address TEXT
        )
      `);
      await pool.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key`);
    } else {
      throw e;
    }
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (username, password) VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
      [username, hash]
    );
  }
}

init().then(() => {
  app.listen(port, () => { console.log(`Server listening on ${port}`); });
}).catch((e) => {
  console.error('Init error', e);
  app.listen(port, () => { console.log(`Server listening on ${port}`); });
});