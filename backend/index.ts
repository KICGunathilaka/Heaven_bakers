import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool, ensurePool } from './src/db';
import { Pool } from 'pg';
import authRouter from './src/routes/auth';
import productsRouter from './src/routes/products';
import barcodeRouter from './src/routes/barcode';
import vendorsRouter from './src/routes/vendors';
import purchasesRouter from './src/routes/purchases';
import inventoryRouter from './src/routes/inventory';
import salesRouter from './src/routes/sales';
import expensesRouter from './src/routes/expenses';
import bcrypt from 'bcryptjs';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/barcode', barcodeRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/sales', salesRouter);
app.use('/api/expenses', expensesRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

async function init() {
  ensurePool();
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
    await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      inventory_id SERIAL PRIMARY KEY,
      product_id INT REFERENCES products(product_id),
      vendor_id INT REFERENCES vendors(vendor_id),
      brand VARCHAR(100),
      qty NUMERIC(12,2) NOT NULL DEFAULT 0,
      UNIQUE(product_id, vendor_id, brand)
    )
    `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      customer_id SERIAL PRIMARY KEY,
      name VARCHAR(200),
      contact_no VARCHAR(20),
      address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
    `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      sale_id SERIAL PRIMARY KEY,
      sale_invoice_no VARCHAR(100),
      customer_id INT REFERENCES customers(customer_id),
      date TIMESTAMP DEFAULT NOW(),
      total_amount NUMERIC(12,2),
      discount NUMERIC(10,2),
      note TEXT
    )
    `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_items (
      sales_item_id SERIAL PRIMARY KEY,
      sale_id INT REFERENCES sales(sale_id) ON DELETE CASCADE,
      inventory_id INT REFERENCES inventory_items(inventory_id),
      qty NUMERIC(12,2) NOT NULL,
      brand VARCHAR(100),
      unit_price NUMERIC(10,2),
      selling_price NUMERIC(10,2),
      profit NUMERIC(12,2)
    )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        purchase_id SERIAL PRIMARY KEY,
        invoice_no VARCHAR(100),
        vendor_id INT REFERENCES vendors(vendor_id),
        date TIMESTAMP DEFAULT NOW(),
        bill_price NUMERIC(12,2) DEFAULT 0
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barcode (
        barcode_id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(product_id),
        invoice_no VARCHAR(100),
        barcode VARCHAR(200) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE barcode ADD COLUMN IF NOT EXISTS purchase_id INT`);
    await pool.query(`ALTER TABLE barcode ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100)`);
    await pool.query(`ALTER TABLE barcode DROP CONSTRAINT IF EXISTS fk_purchase`);
    await pool.query(`ALTER TABLE barcode ADD CONSTRAINT fk_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id) ON DELETE CASCADE`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        expense_id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        note TEXT
      )
    `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      purchase_item_id SERIAL PRIMARY KEY,
      purchase_id INT REFERENCES purchases(purchase_id) ON DELETE CASCADE,
      product_id INT REFERENCES products(product_id),
      qty NUMERIC(12,2) NOT NULL,
      total_price NUMERIC(12,2) NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL,
      brand VARCHAR(100)
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
      await pool.query(`
        CREATE TABLE IF NOT EXISTS inventory_items (
          inventory_id SERIAL PRIMARY KEY,
          product_id INT REFERENCES products(product_id),
          vendor_id INT REFERENCES vendors(vendor_id),
          brand VARCHAR(100),
          qty NUMERIC(12,2) NOT NULL DEFAULT 0,
          UNIQUE(product_id, vendor_id, brand)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
          customer_id SERIAL PRIMARY KEY,
          name VARCHAR(200),
          contact_no VARCHAR(20),
          address TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sales (
          sale_id SERIAL PRIMARY KEY,
          sale_invoice_no VARCHAR(100),
          customer_id INT REFERENCES customers(customer_id),
          date TIMESTAMP DEFAULT NOW(),
          total_amount NUMERIC(12,2),
          discount NUMERIC(10,2),
          note TEXT
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sales_items (
          sales_item_id SERIAL PRIMARY KEY,
          sale_id INT REFERENCES sales(sale_id) ON DELETE CASCADE,
          inventory_id INT REFERENCES inventory_items(inventory_id),
          qty NUMERIC(12,2) NOT NULL,
          brand VARCHAR(100),
          unit_price NUMERIC(10,2),
          selling_price NUMERIC(10,2),
          profit NUMERIC(12,2)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          purchase_id SERIAL PRIMARY KEY,
          invoice_no VARCHAR(100),
          vendor_id INT REFERENCES vendors(vendor_id),
          date TIMESTAMP DEFAULT NOW(),
          bill_price NUMERIC(12,2) DEFAULT 0
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS barcode (
          barcode_id SERIAL PRIMARY KEY,
          product_id INT REFERENCES products(product_id),
          invoice_no VARCHAR(100),
          barcode VARCHAR(200) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`ALTER TABLE barcode ADD COLUMN IF NOT EXISTS purchase_id INT`);
      await pool.query(`ALTER TABLE barcode ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100)`);
      await pool.query(`ALTER TABLE barcode DROP CONSTRAINT IF EXISTS fk_purchase`);
      await pool.query(`ALTER TABLE barcode ADD CONSTRAINT fk_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id) ON DELETE CASCADE`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          expense_id SERIAL PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          amount NUMERIC(12,2) NOT NULL,
          note TEXT
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS purchase_items (
          purchase_item_id SERIAL PRIMARY KEY,
          purchase_id INT REFERENCES purchases(purchase_id) ON DELETE CASCADE,
          product_id INT REFERENCES products(product_id),
          qty NUMERIC(12,2) NOT NULL,
          total_price NUMERIC(12,2) NOT NULL,
          unit_price NUMERIC(10,2) NOT NULL,
          brand VARCHAR(100)
        )
      `);
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